import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TextReader } from './TextReader'
import learData from '../data/king-lear.json'

type Note = { id: string; studentName: string; lineId: string; body: string; updatedAt: string }
type Class = { joinCode: string; label: string; createdAt: string }
type Student = { studentId: string; studentName: string; initials: string; lastSeen: string; noteCount: number }

const logout = () => { localStorage.removeItem('klread_session'); location.href = '/' }

export function TeacherView({ teacherKey, teacherStudentId, teacherName, teacherInitials }: { teacherKey?: string; teacherStudentId?: string; teacherName?: string; teacherInitials?: string }) {
  const key = teacherKey ?? new URLSearchParams(location.search).get('key') ?? ''
  const k = encodeURIComponent(key)
  const [classes, setClasses] = useState<Class[]>([])
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [allNotes, setAllNotes] = useState<(Note & { joinCode: string })[]>([])
  const [reading, setReading] = useState<{ joinCode: string; label: string } | null>(null)
  const [showVariants, setShowVariants] = useState(true)
  const [label, setLabel] = useState(''); const [codeInput, setCodeInput] = useState(''); const [creating, setCreating] = useState(false)
  const [newStudent, setNewStudent] = useState<Record<string, { name: string; initials: string }>>({})
  const [addingStudent, setAddingStudent] = useState<Record<string, boolean>>({})
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch(`/api/teacher?key=${k}&summary=1`)
      .then(r => { if (r.status === 403) throw new Error('Invalid teacher key'); return r.json() })
      .then((rows: (Student & { joinCode: string })[]) => setAllStudents(rows))
      .catch(e => setErr(e.message))
    fetch(`/api/teacher?key=${k}`).then(r => r.json()).then(setAllNotes).catch(() => {})
    fetch(`/api/classes?key=${k}`).then(r => r.json()).then((all: Class[]) => setClasses(all.filter(c => c.label !== 'Teacher'))).catch(() => {})
  }, [])

  async function createCode() {
    if (!label.trim()) return
    setCreating(true)
    const r = await fetch(`/api/classes?key=${k}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: label.trim(), code: codeInput.trim().toUpperCase() || undefined }) })
    if (r.ok) { const c = await r.json(); setClasses(p => [c, ...p]); setLabel(''); setCodeInput('') }
    setCreating(false)
  }

  async function addStudent(joinCode: string) {
    const s = newStudent[joinCode]
    if (!s?.name.trim() || !s?.initials.trim()) return
    setAddingStudent(p => ({ ...p, [joinCode]: true }))
    await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentName: s.name.trim(), joinCode, initials: s.initials.trim().toUpperCase().slice(0, 4) }) })
    const rows = await fetch(`/api/teacher?key=${k}&summary=1`).then(r => r.json()).catch(() => allStudents)
    setAllStudents(rows)
    setNewStudent(p => ({ ...p, [joinCode]: { name: '', initials: '' } }))
    setAddingStudent(p => ({ ...p, [joinCode]: false }))
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

  if (reading) return (
    <TooltipProvider><div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-4">
        <Button variant="neutral" size="sm" onClick={() => setReading(null)}>← Back</Button>
        <span className="font-sans font-semibold text-sm shrink-0">{reading.label}</span>
        <span className="flex items-center gap-3 text-xs font-sans font-semibold">
          <span className="bg-sky-200 border-l-2 border-sky-400 px-2 py-0.5 text-black">‹ › Quarto 1608</span>
          <span className="bg-yellow-200 border-l-2 border-yellow-400 px-2 py-0.5 text-black">[ ] Folio 1623</span>
        </span>
        <label className="flex items-center gap-2 text-sm font-sans cursor-pointer ml-auto">
          <span className="text-muted-foreground">Highlight</span>
          <Switch checked={showVariants} onCheckedChange={setShowVariants} />
        </label>
      </header>
      <main className="px-2 py-4 sm:px-6">
        <TextReader acts={learData.acts as any} showVariants={showVariants} studentId={teacherStudentId ?? ''} studentName={teacherName ?? ''} initials={teacherInitials ?? ''} />
      </main>
    </div></TooltipProvider>
  )

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Teacher view</h1>
        <Button variant="neutral" size="sm" onClick={logout}>Log out</Button>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Class codes</h2>
        <div className="flex gap-2 mb-4 flex-wrap">
          <Input placeholder="Label e.g. Year 11B" value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && createCode()} className="max-w-xs" />
          <Input placeholder="Code e.g. ENG11B" value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && createCode()} className="max-w-xs uppercase" />
          <Button onClick={createCode} disabled={creating || !label.trim()}>{creating ? 'Creating…' : 'Create'}</Button>
        </div>
        {!classes.length && <p className="text-sm text-muted-foreground">No class codes yet.</p>}
        <Accordion multiple>
          {classes.map(c => {
            const students = allStudents.filter((s: any) => s.joinCode === c.joinCode)
            const notes = allNotes.filter((n: any) => n.joinCode === c.joinCode)
            const byStudent = notes.reduce<Record<string, Note[]>>((acc, n) => { (acc[n.studentName] ??= []).push(n); return acc }, {})
            return (
              <AccordionItem key={c.joinCode} value={c.joinCode}>
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-3 text-left">
                    <span className="font-mono font-bold text-primary">{c.joinCode}</span>
                    <span className="font-medium">{c.label}</span>
                    <Badge>{students.length} students</Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex gap-2 mb-4">
                    <Button size="sm" onClick={() => setReading({ joinCode: c.joinCode, label: c.label })}>Read</Button>
                    <Button size="sm" variant="neutral" onClick={() => document.getElementById('notes-' + c.joinCode)?.scrollIntoView({ behavior: 'smooth' })}>View student notes</Button>
                    <button onClick={() => deleteCode(c.joinCode)} className="ml-auto text-xs text-muted-foreground hover:text-destructive">Delete code</button>
                  </div>
                  <table className="w-full text-sm border-collapse mb-6">
                    <thead><tr className="border-b text-xs uppercase tracking-wider text-muted-foreground text-left"><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Initials</th><th className="py-2 pr-4">Notes</th><th className="py-2">Last seen</th></tr></thead>
                    <tbody>
                      {students.length ? students.map((s: any) => (
                        <tr key={s.studentId} className="border-b">
                          <td className="py-2 pr-4">{s.studentName}</td>
                          <td className="py-2 pr-4 font-mono text-xs">{s.initials}</td>
                          <td className="py-2 pr-4"><Badge>{s.noteCount}</Badge></td>
                          <td className="py-2 text-xs text-muted-foreground">{s.lastSeen ? new Date(s.lastSeen).toLocaleString() : '—'}</td>
                        </tr>
                      )) : <tr><td colSpan={4} className="py-2 text-muted-foreground text-sm">No students yet.</td></tr>}
                      <tr>
                        <td className="pt-2 pr-2"><Input placeholder="Student name" value={newStudent[c.joinCode]?.name ?? ''} onChange={e => setNewStudent(p => ({ ...p, [c.joinCode]: { ...p[c.joinCode], name: e.target.value } }))} className="h-7 text-xs" /></td>
                        <td className="pt-2 pr-2"><Input placeholder="Initials" value={newStudent[c.joinCode]?.initials ?? ''} onChange={e => setNewStudent(p => ({ ...p, [c.joinCode]: { ...p[c.joinCode], initials: e.target.value.toUpperCase().slice(0, 4) } }))} onKeyDown={e => e.key === 'Enter' && addStudent(c.joinCode)} className="h-7 text-xs uppercase w-24" maxLength={4} /></td>
                        <td colSpan={2} className="pt-2"><Button size="sm" onClick={() => addStudent(c.joinCode)} disabled={addingStudent[c.joinCode]}>{addingStudent[c.joinCode] ? 'Adding…' : 'Add'}</Button></td>
                      </tr>
                    </tbody>
                  </table>
                  <div id={'notes-' + c.joinCode}>
                    <p className="text-sm font-semibold mb-3">Student notes</p>
                    {!notes.length && <p className="text-sm text-muted-foreground">No notes yet.</p>}
                    {Object.entries(byStudent).map(([student, rows]) => (
                      <div key={student} className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-2">{student} <Badge>{rows.length}</Badge></p>
                        <table className="w-full text-sm border-collapse">
                          <tbody>{rows.map(n => (
                            <tr key={n.id} className="border-b hover:bg-muted/50">
                              <td className="py-1.5 pr-4 font-mono text-primary w-20">{n.lineId}</td>
                              <td className="py-1.5 pr-4 font-serif">{n.body}</td>
                              <td className="py-1.5 text-xs text-muted-foreground whitespace-nowrap">{new Date(n.updatedAt).toLocaleString()}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </section>
    </div>
  )
}
