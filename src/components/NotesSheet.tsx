import { useState, useEffect } from 'react'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Line } from './LineRenderer'

type Note = { id: string; body: string; lineIdTo?: string; updatedAt: string }

export function NotesSheet({ line, open, onOpenChange, studentId, studentName, onSaved }: {
  line: Line | null; open: boolean; onOpenChange: (v: boolean) => void
  studentId: string; studentName: string; onSaved?: (lineId: string) => void
}) {
  const [body, setBody] = useState('')
  const [lineIdTo, setLineIdTo] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !line || !studentId) return
    setBody(''); setLineIdTo('')
    fetch(`/api/notes?studentId=${studentId}`)
      .then(r => r.json())
      .then((all: Note[]) => setNotes(all.filter((n: any) => n.lineId === line.id)))
      .catch(() => {})
  }, [open, line?.id])

  async function save() {
    if (!body.trim() || !line) return
    setSaving(true)
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, studentName, lineId: line.id, lineIdTo: lineIdTo.trim() || null, act: line.act, scene: line.scene, body: body.trim() })
    }).catch(() => {})
    setBody(''); setLineIdTo('')
    const all = await fetch(`/api/notes?studentId=${studentId}`).then(r => r.json()).catch(() => [])
    setNotes(all.filter((n: any) => n.lineId === line.id))
    onSaved?.(line.id)
    setSaving(false)
  }

  async function del(id: string) {
    await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
    setNotes(p => p.filter(n => n.id !== id))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{line?.id}</SheetTitle>
          <SheetDescription>
            {line?.speaker && <span className="block font-bold uppercase tracking-widest text-xs mb-0.5">{line.speaker}</span>}
            {line?.text}
          </SheetDescription>
        </SheetHeader>

        <div className="grid flex-1 auto-rows-min gap-6 px-4">
          <div className="grid gap-3">
            <Label htmlFor="note-body">Note</Label>
            <Textarea id="note-body" placeholder="Write your note…" value={body} onChange={e => setBody(e.target.value)} rows={5} className="resize-none" />
          </div>

          <div className="grid gap-3">
            <Label htmlFor="note-range">To line <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="note-range" placeholder={line?.id ?? '1.1.1'} value={lineIdTo} onChange={e => setLineIdTo(e.target.value)} className="font-mono" />
          </div>

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
