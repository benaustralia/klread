import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Line } from './LineRenderer'

type Note = { id: string; body: string; updatedAt: string }

export function NotesSheet({ line, open, onOpenChange, studentId, studentName }: { line: Line | null; open: boolean; onOpenChange: (v: boolean) => void; studentId: string; studentName: string }) {
  const [body, setBody] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !line || !studentId) return
    setBody('')
    fetch(`/api/notes?studentId=${studentId}`).then(r => r.json()).then((all: Note[]) => setNotes(all.filter((n: any) => n.lineId === line.id))).catch(() => {})
  }, [open, line?.id])

  async function save() {
    if (!body.trim() || !line) return
    setSaving(true)
    await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, studentName, lineId: line.id, act: line.act, scene: line.scene, body: body.trim() }) }).catch(() => {})
    setBody('')
    const all = await fetch(`/api/notes?studentId=${studentId}`).then(r => r.json()).catch(() => [])
    setNotes(all.filter((n: any) => n.lineId === line.id))
    setSaving(false)
  }

  async function del(id: string) {
    await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
    setNotes(p => p.filter(n => n.id !== id))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto font-serif">
        <SheetHeader><SheetTitle className="font-serif">Note — {line?.id}</SheetTitle></SheetHeader>
        {line && (
          <div className="mt-4 mb-4 p-3 bg-muted rounded text-sm border">
            {line.speaker && <span className="block text-xs uppercase tracking-widest font-sans font-semibold mb-1">{line.speaker}</span>}
            {line.text}
          </div>
        )}
        <Textarea placeholder="Write your note…" value={body} onChange={e => setBody(e.target.value)} rows={4} className="font-serif resize-none mb-3" />
        <Button onClick={save} disabled={saving || !body.trim()} className="w-full">{saving ? 'Saving…' : 'Save note'}</Button>
        {notes.length > 0 && (
          <div className="mt-6 flex flex-col gap-3">
            <h3 className="text-sm font-semibold font-sans">Saved notes</h3>
            {notes.map(n => (
              <Card key={n.id} className="relative">
                <CardContent className="pt-4 pb-3 pr-10">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-2 font-sans">{new Date(n.updatedAt).toLocaleString()}</p>
                </CardContent>
                <button onClick={() => del(n.id)} className="absolute top-2 right-2 text-xs text-muted-foreground hover:text-destructive">✕</button>
              </Card>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
