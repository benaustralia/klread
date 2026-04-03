import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type ClassNote = {
  id: string; studentId: string; studentName: string; initials: string
  lineId: string; lineIdTo?: string; body: string; updatedAt: string
}

export function AllNotesSheet({ studentId, joinCode, open, onOpenChange, isTeacher }: {
  studentId: string; joinCode: string; open: boolean
  onOpenChange: (v: boolean) => void; isTeacher?: boolean
}) {
  const [notes, setNotes] = useState<ClassNote[]>([])
  const [editing, setEditing] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open || !joinCode) return
    fetch(`/api/notes?joinCode=${encodeURIComponent(joinCode)}`)
      .then(r => r.ok ? r.json() : []).then(d => setNotes(Array.isArray(d) ? d : [])).catch(() => {})
  }, [open, joinCode])

  async function saveEdit(id: string) {
    const body = editing[id]?.trim()
    if (!body) return
    const r = await fetch('/api/notes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, body }),
    }).then(r => r.json()).catch(() => null)
    if (!r) return
    setNotes(p => p.map(n => n.id === id ? { ...n, body: r.body, updatedAt: r.updatedAt } : n))
    setEditing(p => { const c = { ...p }; delete c[id]; return c })
  }

  const del = (id: string) => fetch(`/api/notes?id=${id}`, { method: 'DELETE' }).then(() => setNotes(p => p.filter(n => n.id !== id)))
  const cancel = (id: string) => setEditing(p => { const c = { ...p }; delete c[id]; return c })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-xl" aria-describedby={undefined}>
        <SheetHeader><SheetTitle>All notes</SheetTitle></SheetHeader>
        <div className="overflow-y-auto flex-1 px-4 py-2 flex flex-col gap-2">
          {!notes.length && <p className="text-sm text-muted-foreground">No notes yet.</p>}
          {notes.map(n => {
            const mine = isTeacher || n.studentId === studentId
            const ref = n.lineIdTo && n.lineIdTo !== n.lineId ? `${n.lineId}–${n.lineIdTo}` : n.lineId
            return (
              <div key={n.id} className={`border-2 rounded-base p-3 ${mine ? 'border-foreground' : 'border-border bg-secondary-background'}`}>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-xs font-mono text-muted-foreground truncate">{n.initials} · {n.studentName}</span>
                  <button className="text-xs font-mono text-primary hover:underline shrink-0"
                    onClick={() => window.open(`/?goto=${n.lineId}`, '_blank')}>{ref}</button>
                </div>
                {n.id in editing ? (
                  <div className="grid gap-2 mt-2">
                    <Textarea value={editing[n.id]} onChange={e => setEditing(p => ({ ...p, [n.id]: e.target.value }))}
                      rows={3} className="resize-none" autoFocus />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(n.id)}>Save</Button>
                      <Button size="sm" variant="neutral" onClick={() => cancel(n.id)}>Cancel</Button>
                    </div>
                  </div>
                ) : (<>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.updatedAt).toLocaleString()}</p>
                  {mine && <div className="flex gap-3 mt-2">
                    <button className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setEditing(p => ({ ...p, [n.id]: n.body }))}>Edit</button>
                    <button className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => del(n.id)}>Delete</button>
                  </div>}
                </>)}
              </div>
            )
          })}
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <Button variant="neutral" size="sm" disabled={!notes.length} onClick={() => {
            const text = notes.map(n => {
              const range = n.lineIdTo && n.lineIdTo !== n.lineId ? `${n.lineId}–${n.lineIdTo}` : n.lineId
              return `[${range}] ${n.initials} (${n.studentName})\n${n.body}\n${new Date(n.updatedAt).toLocaleString()}`
            }).join('\n\n---\n\n')
            Object.assign(document.createElement('a'), {
              href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })), download: 'king-lear-notes.txt',
            }).click()
          }}>Export</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
