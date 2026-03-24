import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'

type Note = { id: string; studentName: string; lineId: string; body: string; updatedAt: string }

export function TeacherView() {
  const key = new URLSearchParams(location.search).get('key') ?? ''
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch(`/api/teacher?key=${encodeURIComponent(key)}`)
      .then(r => { if (r.status === 403) throw new Error('Invalid teacher key'); if (!r.ok) throw new Error('Failed to load'); return r.json() })
      .then(setNotes).catch(e => setErr(e.message))
  }, [])

  if (err) return <div className="flex items-center justify-center min-h-screen"><p className="text-destructive font-semibold">{err}</p></div>
  if (!notes) return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Loading…</p></div>

  const byStudent = notes.reduce<Record<string, Note[]>>((acc, n) => { (acc[n.studentName] ??= []).push(n); return acc }, {})

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <h1 className="text-2xl font-bold mb-1">Teacher view</h1>
      <p className="text-sm text-muted-foreground mb-6">{notes.length} notes</p>
      {Object.entries(byStudent).map(([student, rows]) => (
        <div key={student} className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">{student} <Badge>{rows.length}</Badge></h2>
          <table className="w-full text-sm border-collapse">
            <thead><tr className="border-b text-xs uppercase tracking-wider text-muted-foreground text-left"><th className="py-2 pr-4 w-20">Line</th><th className="py-2 pr-4">Note</th><th className="py-2 w-40">When</th></tr></thead>
            <tbody>
              {rows.map(n => (
                <tr key={n.id} className="border-b hover:bg-muted/50">
                  <td className="py-2 pr-4 font-mono text-primary">{n.lineId}</td>
                  <td className="py-2 pr-4 font-serif leading-relaxed">{n.body}</td>
                  <td className="py-2 text-xs text-muted-foreground">{new Date(n.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {!notes.length && <p className="text-muted-foreground">No notes yet.</p>}
    </div>
  )
}
