import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Note = { id: string; studentName: string; lineId: string; body: string; updatedAt: string }
type Class = { joinCode: string; label: string; createdAt: string }

export function TeacherView() {
  const key = new URLSearchParams(location.search).get('key') ?? ''
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch(`/api/teacher?key=${encodeURIComponent(key)}`)
      .then(r => { if (r.status === 403) throw new Error('Invalid teacher key'); if (!r.ok) throw new Error('Failed to load'); return r.json() })
      .then(setNotes).catch(e => setErr(e.message))
    fetch(`/api/classes?key=${encodeURIComponent(key)}`).then(r => r.json()).then(setClasses).catch(() => {})
  }, [])

  async function createCode() {
    if (!label.trim()) return
    setCreating(true)
    const r = await fetch(`/api/classes?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: label.trim() }) })
    if (r.ok) { const c = await r.json(); setClasses(p => [c, ...p]); setLabel('') }
    setCreating(false)
  }

  async function deleteCode(code: string) {
    await fetch(`/api/classes?key=${encodeURIComponent(key)}&code=${code}`, { method: 'DELETE' })
    setClasses(p => p.filter(c => c.joinCode !== code))
  }

  if (err) return <div className="flex items-center justify-center min-h-screen"><p className="text-destructive font-semibold">{err}</p></div>
  if (!notes) return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Loading…</p></div>

  const byStudent = notes.reduce<Record<string, Note[]>>((acc, n) => { (acc[n.studentName] ??= []).push(n); return acc }, {})

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <h1 className="text-2xl font-bold mb-6">Teacher view</h1>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Class codes</h2>
        <div className="flex gap-2 mb-4">
          <Input placeholder="Class label (e.g. Year 11B)" value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && createCode()} className="max-w-xs" />
          <Button onClick={createCode} disabled={creating || !label.trim()}>{creating ? 'Creating…' : 'Generate code'}</Button>
        </div>
        {classes.length > 0 && (
          <table className="w-full text-sm border-collapse">
            <thead><tr className="border-b text-xs uppercase tracking-wider text-muted-foreground text-left"><th className="py-2 pr-4">Code</th><th className="py-2 pr-4">Label</th><th className="py-2 pr-4">Created</th><th className="py-2" /></tr></thead>
            <tbody>
              {classes.map(c => (
                <tr key={c.joinCode} className="border-b">
                  <td className="py-2 pr-4 font-mono font-bold text-primary">{c.joinCode}</td>
                  <td className="py-2 pr-4">{c.label}</td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="py-2"><button onClick={() => deleteCode(c.joinCode)} className="text-xs text-muted-foreground hover:text-destructive">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!classes.length && <p className="text-sm text-muted-foreground">No class codes yet.</p>}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">Student notes</h2>
        <p className="text-sm text-muted-foreground mb-6">{notes.length} notes</p>
        {Object.entries(byStudent).map(([student, rows]) => (
          <div key={student} className="mb-8">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">{student} <Badge>{rows.length}</Badge></h3>
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
      </section>
    </div>
  )
}
