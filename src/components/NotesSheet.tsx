import { useState, useEffect } from 'react'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Line } from './LineRenderer'

type Note = { id: string; body: string; lineIdTo?: string; updatedAt: string }
type TeacherNote = { id: string; lineId: string; lineIdTo?: string; body: string; initials: string; studentName: string }

export function NotesSheet({ line, allLines, open, onOpenChange, studentId, studentName, onSaved }: {
  line: Line | null
  allLines: Line[]
  open: boolean
  onOpenChange: (v: boolean) => void
  studentId: string
  studentName: string
  onSaved?: (lineId: string) => void
}) {
  const [body, setBody] = useState('')
  const [lineIdTo, setLineIdTo] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const [teacherNotes, setTeacherNotes] = useState<TeacherNote[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !line || !studentId) return
    setBody('')
    setLineIdTo(line.id)
    fetch(`/api/notes?studentId=${studentId}`)
      .then(r => r.json())
      .then((all: Note[]) => setNotes(all.filter((n: any) => n.lineId === line.id)))
      .catch(() => {})
    fetch('/api/notes?teacherNotes=1')
      .then(r => r.json())
      .then((all: TeacherNote[]) => setTeacherNotes(all.filter(n => n.lineId === line.id)))
      .catch(() => {})
  }, [open, line?.id])

  async function save() {
    if (!body.trim() || !line) return
    setSaving(true)
    const lineIdToVal = lineIdTo.trim() && lineIdTo.trim() !== line.id ? lineIdTo.trim() : null
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, studentName, lineId: line.id, lineIdTo: lineIdToVal, act: line.act, scene: line.scene, body: body.trim() }),
    }).catch(() => {})
    setBody('')
    setLineIdTo(line.id)
    const all = await fetch(`/api/notes?studentId=${studentId}`).then(r => r.json()).catch(() => [])
    setNotes(all.filter((n: any) => n.lineId === line.id))
    onSaved?.(line.id)
    setSaving(false)
  }

  async function del(id: string) {
    await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
    setNotes(p => p.filter(n => n.id !== id))
  }

  const rangeEnd = teacherNotes.find(n => n.lineIdTo && n.lineIdTo !== line?.id)?.lineIdTo
    ?? notes.find(n => n.lineIdTo && n.lineIdTo !== line?.id)?.lineIdTo
  const rangeLines = (() => {
    if (!line) return []
    const from = allLines.findIndex(l => l.id === line.id)
    const to = rangeEnd ? allLines.findIndex(l => l.id === rangeEnd) : from
    return allLines.slice(from, to + 1).filter(l => l.type !== 'stage')
  })()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{line?.id}{rangeEnd ? ` – ${rangeEnd}` : ''}</SheetTitle>
          <SheetDescription asChild>
            <div>
              {line?.speaker && <span className="block font-bold uppercase tracking-widest text-xs mb-0.5">{line.speaker}</span>}
              {rangeLines.map(l => <p key={l.id}>{l.text}</p>)}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="grid flex-1 auto-rows-min gap-6 px-4">
          <div className="grid gap-3">
            <Label htmlFor="note-body">Note</Label>
            <Textarea
              id="note-body"
              placeholder="Write your note…"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          <div className="grid gap-2">
            <Label>Lines</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">From</span>
              <Input value={line?.id ?? ''} readOnly className="font-mono w-24 shrink-0 bg-muted" />
              <span className="text-sm text-muted-foreground shrink-0">to</span>
              <Input
                id="note-range"
                value={lineIdTo}
                onChange={e => setLineIdTo(e.target.value)}
                className="font-mono w-24 shrink-0"
              />
            </div>
          </div>

          {teacherNotes.length > 0 && (
            <div className="grid gap-3">
              <Label>Teacher note</Label>
              {teacherNotes.map(n => (
                <div key={n.id} className="border-2 border-border rounded-base bg-secondary-background p-3">
                  <p className="text-xs font-mono text-muted-foreground mb-1">{n.initials} · {n.studentName}</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{n.body}</p>
                </div>
              ))}
            </div>
          )}

          {notes.length > 0 && (
            <div className="grid gap-3">
              <Label>Saved notes</Label>
              {notes.map(n => (
                <div key={n.id} className="border-2 border-border rounded-base bg-background p-3 relative">
                  {n.lineIdTo && <p className="text-xs font-mono text-muted-foreground mb-1">{line?.id} — {n.lineIdTo}</p>}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap pr-5">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(n.updatedAt).toLocaleString()}</p>
                  <button onClick={() => del(n.id)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive text-xs">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <SheetFooter>
          <Button onClick={save} disabled={saving || !body.trim()}>{saving ? 'Saving…' : 'Save note'}</Button>
          <SheetClose asChild>
            <Button variant="neutral">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
