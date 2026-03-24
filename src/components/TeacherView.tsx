import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { TextReader } from './TextReader'
import learData from '../data/king-lear.json'

type Note = { id: string; studentName: string; joinCode: string; classLabel: string; lineId: string; body: string; updatedAt: string }
type Class = { joinCode: string; label: string; createdAt: string }
type Student = { studentId: string; studentName: string; joinCode: string; classLabel: string; initials: string; lastSeen: string; noteCount: number }
type Screen = { type: 'dashboard' } | { type: 'session'; joinCode: string; label: string } | { type: 'reading'; joinCode: string; label: string }

const logout = () => { localStorage.removeItem('klread_session'); location.href = '/' }

export function TeacherView({ teacherKey, teacherStudentId, teacherName, teacherInitials }: { teacherKey?: string; teacherStudentId?: string; teacherName?: string; teacherInitials?: string }) {
  const key = teacherKey ?? new URLSearchParams(location.search).get('key') ?? ''
  const k = encodeURIComponent(key)
  const [screen, setScreen] = useState<Screen>({ type: 'dashboard' })
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [sessionNotes, setSessionNotes] = useState<Note[]>([])
  const [label, setLabel] = useState(''); const [codeInput, setCodeInput] = useState(''); const [creating, setCreating] = useState(false)
  const [showVariants, setShowVariants] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch(`/api/teacher?key=${k}&summary=1`)
      .then(r => { if (r.status === 403) throw new Error('Invalid teacher key'); if (!r.ok) throw new Error('Failed'); return r.json() })
      .then(setStudents).catch(e => setErr(e.message))
    fetch(`/api/classes?key=${k}`).then(r => r.json()).then((all: Class[]) => setClasses(all.filter(c => c.label !== 'Teacher'))).catch(() => {})
  }, [])

  async function openSession(joinCode: string, label: string) {
    setScreen({ type: 'session', joinCode, label })
    fetch(`/api/teacher?key=${k}&joinCode=${encodeURIComponent(joinCode)}`).then(r => r.json()).then(setSessionNotes).catch(() => {})
  }

  async function createCode() {
    if (!label.trim()) return
    setCreating(true)
    const r = await fetch(`/api/classes?key=${k}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: label.trim(), code: codeInput.trim().toUpperCase() || undefined }) })
    if (r.ok) { const c = await r.json(); setClasses(p => [c, ...p]); setLabel(''); setCodeInput('') }
    setCreating(false)
  }

  async function deleteCode(code: string) {
    await fetch(`/api/classes?key=${k}&code=${code}`, { method: 'DELETE' })
    setClasses(p => p.filter(c => c.joinCode !== code))
  }

  if (err) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-destructive font-semibold">{err}</p>
      <button onClick={logout} className="text-sm underline text-muted-foreground">Log out and try again</button>
    </div>
  )

  if (screen.type === 'reading') return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-4">
        <Button variant="neutral" size="sm" onClick={() => setScreen({ type: 'session', joinCode: screen.joinCode, label: screen.label })}>← Back</Button>
        <span className="font-sans font-semibold text-sm">{screen.label}</span>
        <label className="flex items-center gap-2 text-sm font-sans cursor-pointer ml-auto">
          <span className="text-muted-foreground">Highlight</span>
          <Switch checked={showVariants} onCheckedChange={setShowVariants} />
        </label>
      </header>
      <main className="px-2 py-4 sm:px-6">
        <TextReader acts={learData.acts as any} showVariants={showVariants} studentId={teacherStudentId ?? ''} studentName={teacherName ?? ''} initials={teacherInitials ?? ''} />
      </main>
    </div>
  )

  if (screen.type === 'session') {
    const sessionStudents = students.filter(s => s.joinCode === screen.joinCode)
    const byStudent = sessionNotes.reduce<Record<string, Note[]>>((acc, n) => { (acc[n.studentName] ??= []).push(n); return acc }, {})
    return (
      <div className="max-w-4xl mx-auto p-6 font-sans">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Button variant="neutral" size="sm" onClick={() => setScreen({ type: 'dashboard' })}>← Back</Button>
          <h1 className="text-2xl font-bold">{screen.label}</h1>
          <span className="font-mono text-sm text-muted-foreground">{screen.joinCode}</span>
          <div className="flex gap-2 ml-auto">
            <Button onClick={() => setScreen({ type: 'reading', joinCode: screen.joinCode, label: screen.label })}>Read</Button>
            <Button variant="neutral" onClick={() => document.getElementById('student-notes')?.scrollIntoView({ behavior: 'smooth' })}>View student notes</Button>
          </div>
        </div>
        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">Students <Badge>{sessionStudents.length}</Badge></h2>
          {!sessionStudents.length && <p className="text-sm text-muted-foreground">No students have joined yet.</p>}
          {sessionStudents.length > 0 && <table className="w-full text-sm border-collapse">
            <thead><tr className="border-b text-xs uppercase tracking-wider text-muted-foreground text-left"><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Initials</th><th className="py-2 pr-4">Notes</th><th className="py-2">Last seen</th></tr></thead>
            <tbody>{sessionStudents.map(s => (
              <tr key={s.studentId} className="border-b">
                <td className="py-2 pr-4">{s.studentName}</td>
                <td className="py-2 pr-4 font-mono text-xs">{s.initials}</td>
                <td className="py-2 pr-4"><Badge>{s.noteCount}</Badge></td>
                <td className="py-2 text-xs text-muted-foreground">{s.lastSeen ? new Date(s.lastSeen).toLocaleString() : '—'}</td>
              </tr>
            ))}</tbody>
          </table>}
        </section>
        <section id="student-notes">
          <h2 className="text-base font-semibold mb-4">Student notes</h2>
          {!sessionNotes.length && <p className="text-sm text-muted-foreground">No notes yet.</p>}
          {Object.entries(byStudent).map(([student, rows]) => (
            <div key={student} className="mb-6">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">{student} <Badge>{rows.length}</Badge></h3>
              <table className="w-full text-sm border-collapse">
                <thead><tr className="border-b text-xs uppercase tracking-wider text-muted-foreground text-left"><th className="py-2 pr-4 w-20">Line</th><th className="py-2 pr-4">Note</th><th className="py-2">When</th></tr></thead>
                <tbody>{rows.map(n => (
                  <tr key={n.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 pr-4 font-mono text-primary">{n.lineId}</td>
                    <td className="py-2 pr-4 font-serif leading-relaxed">{n.body}</td>
                    <td className="py-2 text-xs text-muted-foreground">{new Date(n.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ))}
        </section>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Teacher view</h1>
        <Button variant="neutral" size="sm" onClick={logout}>Log out</Button>
      </div>
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Class codes</h2>
        <div className="flex gap-2 mb-4 flex-wrap">
          <Input placeholder="Label (e.g. Year 11B)" value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && createCode()} className="max-w-xs" />
          <Input placeholder="Code (e.g. ENG11B) — optional" value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && createCode()} className="max-w-xs uppercase" />
          <Button onClick={createCode} disabled={creating || !label.trim()}>{creating ? 'Creating…' : 'Create'}</Button>
        </div>
        {!classes.length && <p className="text-sm text-muted-foreground">No class codes yet.</p>}
        {classes.length > 0 && <table className="w-full text-sm border-collapse">
          <thead><tr className="border-b text-xs uppercase tracking-wider text-muted-foreground text-left"><th className="py-2 pr-4">Code</th><th className="py-2 pr-4">Label</th><th className="py-2 pr-4">Students</th><th className="py-2 pr-4">Created</th><th className="py-2" /></tr></thead>
          <tbody>{classes.map(c => (
            <tr key={c.joinCode} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => openSession(c.joinCode, c.label)}>
              <td className="py-2 pr-4 font-mono font-bold text-primary">{c.joinCode}</td>
              <td className="py-2 pr-4 font-medium">{c.label}</td>
              <td className="py-2 pr-4"><Badge>{students.filter(s => s.joinCode === c.joinCode).length}</Badge></td>
              <td className="py-2 pr-4 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
              <td className="py-2 text-xs text-muted-foreground flex items-center justify-end gap-3"><button onClick={e => { e.stopPropagation(); deleteCode(c.joinCode) }} className="hover:text-destructive">Delete</button><span>→</span></td>
            </tr>
          ))}</tbody>
        </table>}
      </section>
    </div>
  )
}
