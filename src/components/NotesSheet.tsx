import { useState, useEffect } from 'react'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { Line } from './LineRenderer'

type Note = { id: string; body: string; lineIdTo?: string; charStart?: number; charEnd?: number; updatedAt: string }
type TeacherNote = { id: string; lineId: string; lineIdTo?: string; charStart?: number; charEnd?: number; body: string; classCode?: string; initials: string; studentName: string }

export function NotesSheet({ line, allLines, open, onOpenChange, studentId, studentName, charStart, charEnd, onSaved, joinCode, isTeacher }: {
  line: Line | null; allLines: Line[]; open: boolean; onOpenChange: (v: boolean) => void
  studentId: string; studentName: string; charStart?: number; charEnd?: number; onSaved?: () => void
  joinCode?: string; isTeacher?: boolean
}) {
  const [body, setBody] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const [teacherNotes, setTeacherNotes] = useState<TeacherNote[]>([])
  const [saving, setSaving] = useState(false)
  const [scoped, setScoped] = useState(true)

  useEffect(() => {
    if (!open || !line || !studentId) return
    setBody('')
    setScoped(!!joinCode)
    fetch(`/api/notes?studentId=${studentId}`).then(r => r.json())
      .then((all: Note[]) => setNotes(all.filter((n: any) => n.lineId === line.id))).catch(() => {})
    const qs = joinCode ? `&forClass=${encodeURIComponent(joinCode)}` : ''
    fetch(`/api/notes?teacherNotes=1${qs}`).then(r => r.json())
      .then((all: TeacherNote[]) => setTeacherNotes(all.filter(n => {
        if (n.lineId === line.id) return true
        if (!n.lineIdTo) return false
        const idx = allLines.findIndex(l => l.id === line.id)
        const from = allLines.findIndex(l => l.id === n.lineId)
        const to = allLines.findIndex(l => l.id === n.lineIdTo)
        return from !== -1 && to !== -1 && idx >= from && idx <= to
      }))).catch(() => {})
  }, [open, line?.id])

  async function save() {
    if (!body.trim() || !line) return
    setSaving(true)
    await fetch('/api/notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, studentName, lineId: line.id,
        charStart: charStart ?? null, charEnd: charEnd ?? null,
        act: line.act, scene: line.scene, body: body.trim(),
        classCode: isTeacher && scoped && joinCode ? joinCode : null }),
    }).catch(() => {})
    setBody('')
    const all = await fetch(`/api/notes?studentId=${studentId}`).then(r => r.json()).catch(() => [])
    setNotes(all.filter((n: any) => n.lineId === line.id))
    onSaved?.(); setSaving(false)
  }

  function del(id: string) {
    fetch(`/api/notes?id=${id}`, { method: 'DELETE' }).then(() => {
      setNotes(p => p.filter(n => n.id !== id)); onSaved?.()
    })
  }

  const selText = line && charStart !== undefined && charEnd !== undefined ? line.text.slice(charStart, charEnd) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{line?.id}</SheetTitle>
          <SheetDescription asChild>
            <div>
              {line?.speaker && <span className="block font-bold uppercase tracking-widest text-xs mb-1">{line.speaker}</span>}
              {selText ? <mark className="bg-main/25 rounded-sm not-italic font-medium">{selText}</mark>
                : <p className="text-sm">{line?.text}</p>}
            </div>
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto flex-1">
          <div className="grid gap-6 px-4 py-2">
            <div className="grid gap-3">
              <Label htmlFor="note-body">Note</Label>
              <Textarea id="note-body" placeholder="Write your note…" value={body}
                onChange={e => setBody(e.target.value)} rows={5} className="resize-none" />
              {isTeacher && joinCode && (
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={scoped} onCheckedChange={setScoped} />
                  {scoped ? `This class only (${joinCode})` : 'All classes'}
                </label>
              )}
            </div>
            {teacherNotes.length > 0 && <div className="grid gap-3">
              <Label className="text-xs uppercase tracking-widest">Teacher annotation</Label>
              {teacherNotes.map(n => (
                <div key={n.id} className="border-2 border-border border-l-4 border-l-foreground rounded-base bg-secondary-background p-3">
                  <p className="text-xs font-mono text-muted-foreground mb-1">
                    {n.initials} · {n.studentName} · {n.classCode ?? 'All classes'}
                  </p>
                  {n.charStart !== undefined && n.charEnd !== undefined && line && (
                    <mark className="bg-main/25 rounded-sm text-xs font-mono not-italic block mb-2">
                      {allLines.find(l => l.id === n.lineId)?.text.slice(n.charStart, n.charEnd)}
                    </mark>)}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{n.body}</p>
                </div>))}
            </div>}
            {notes.length > 0 && <div className="grid gap-3">
              <Label className="text-xs uppercase tracking-widest">Your notes</Label>
              {notes.map(n => (
                <div key={n.id} className="border-2 border-border rounded-base bg-background p-3 relative">
                  {n.charStart !== undefined && n.charEnd !== undefined && line && (
                    <mark className="bg-main/25 rounded-sm text-xs font-mono not-italic block mb-2">
                      {line.text.slice(n.charStart, n.charEnd)}
                    </mark>)}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap pr-5">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(n.updatedAt).toLocaleString()}</p>
                  <button onClick={() => del(n.id)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive text-xs">✕</button>
                </div>))}
            </div>}
          </div>
        </div>
        <SheetFooter className="flex flex-col gap-2 px-4 pb-4">
          <Button onClick={save} disabled={saving || !body.trim()} className="w-full">
            {saving ? 'Saving…' : 'Save note'}</Button>
          <SheetClose asChild><Button variant="neutral" className="w-full">Close</Button></SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
