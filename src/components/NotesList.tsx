import { Textarea } from '@/components/ui/textarea'

type Note = { id: string; studentName: string; joinCode: string; lineId: string; body: string; updatedAt: string }

export function NotesList({ notes, editing, setEditing, onSave, onDel }: {
  notes: Note[]; editing: Record<string, string>
  setEditing: (fn: (p: Record<string, string>) => Record<string, string>) => void
  onSave: (id: string) => void; onDel: (id: string) => void
}) {
  if (!notes.length) return <p className="text-sm text-muted-foreground">No notes yet.</p>
  return (
    <div className="flex flex-col gap-2">
      {notes.map(n => (
        <div key={n.id} className="border-2 border-border rounded-base p-3 flex flex-col min-[640px]:flex-row gap-2 min-[640px]:gap-3 min-[640px]:items-start text-sm">
          <div className="flex gap-3 items-center min-[640px]:contents">
            <span className="font-semibold shrink-0 min-[640px]:w-20 truncate">{n.studentName}</span>
            <span className="font-mono text-xs text-primary shrink-0 min-[640px]:pt-0.5">{n.lineId}</span>
          </div>
          {n.id in editing ? (
            <div className="flex-1 grid gap-1 w-full">
              <Textarea value={editing[n.id]} onChange={e => setEditing(p => ({ ...p, [n.id]: e.target.value }))}
                rows={2} className="resize-none" autoFocus />
              <span className="flex gap-2 text-xs">
                <button onClick={() => onSave(n.id)} className="text-primary hover:underline">Save</button>
                <button onClick={() => setEditing(p => { const c = { ...p }; delete c[n.id]; return c })} className="text-muted-foreground">Cancel</button>
              </span>
            </div>
          ) : (<>
            <span className="flex-1 leading-relaxed">{n.body}</span>
            <span className="flex gap-2 shrink-0 text-xs">
              <button onClick={() => setEditing(p => ({ ...p, [n.id]: n.body }))} className="text-muted-foreground hover:text-foreground">Edit</button>
              <button onClick={() => onDel(n.id)} className="text-muted-foreground hover:text-destructive">Delete</button>
            </span>
          </>)}
        </div>))}
    </div>
  )
}
