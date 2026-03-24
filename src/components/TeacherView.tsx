import { useState, useEffect } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DataTable } from '@/components/ui/data-table'
import { TextReader } from './TextReader'
import { SceneNav } from './SceneNav'
import { Progress } from '@/components/ui/progress'
import learData from '../data/king-lear.json'

type Note = { id: string; studentName: string; joinCode: string; lineId: string; body: string; updatedAt: string }
type Class = { joinCode: string; label: string; createdAt: string }
type Student = { studentId: string; studentName: string; joinCode: string; initials: string; lastSeen: string; noteCount: number }

const studentColumns: ColumnDef<Student>[] = [
  { accessorKey: 'studentName', header: 'Name' },
  { accessorKey: 'initials', header: 'Initials', cell: ({ row }) => <span className="font-mono text-xs">{row.getValue('initials')}</span> },
  { accessorKey: 'noteCount', header: 'Notes', cell: ({ row }) => <Badge>{row.getValue('noteCount')}</Badge> },
  { accessorKey: 'lastSeen', header: 'Last seen', cell: ({ row }) => { const v = row.getValue('lastSeen') as string; return <span className="text-muted-foreground">{v ? new Date(v).toLocaleString() : '—'}</span> } },
]

const noteColumns: ColumnDef<Note>[] = [
  { accessorKey: 'studentName', header: 'Student' },
  { accessorKey: 'lineId', header: 'Line', cell: ({ row }) => <span className="font-mono text-primary">{row.getValue('lineId')}</span> },
  { accessorKey: 'body', header: 'Note', cell: ({ row }) => <span className="leading-relaxed">{row.getValue('body')}</span> },
  { accessorKey: 'updatedAt', header: 'When', cell: ({ row }) => <span className="text-muted-foreground">{new Date(row.getValue('updatedAt')).toLocaleString()}</span> },
]

const logout = () => { localStorage.removeItem('klread_session'); location.href = '/' }

export function TeacherView({ teacherKey, teacherStudentId, teacherName, teacherInitials }: { teacherKey?: string; teacherStudentId?: string; teacherName?: string; teacherInitials?: string }) {
  const key = teacherKey ?? new URLSearchParams(location.search).get('key') ?? ''
  const k = encodeURIComponent(key)
  const [classes, setClasses] = useState<Class[]>([])
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [allNotes, setAllNotes] = useState<(Note & { joinCode: string })[]>([])
  const readingParam = new URLSearchParams(location.search).get('reading')
  const [reading, setReadingState] = useState<{ joinCode: string; label: string } | null>(null)
  const [actNum, setActNum] = useState(1)
  const [sceneNum, setSceneNum] = useState(1)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const pct = el.scrollTop / (el.scrollHeight - el.clientHeight) * 100
      setScrollProgress(isNaN(pct) ? 0 : Math.round(pct))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  function setReading(val: { joinCode: string; label: string } | null) {
    setReadingState(val)
    const url = new URL(location.href)
    if (val) { url.searchParams.set('reading', val.joinCode) } else { url.searchParams.delete('reading') }
    history.replaceState(null, '', url)
  }
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
    fetch(`/api/classes?key=${k}`).then(r => r.json()).then((all: Class[]) => {
      const filtered = all.filter(c => c.label !== 'Teacher')
      setClasses(filtered)
      if (readingParam) {
        const match = filtered.find(c => c.joinCode === readingParam)
        if (match) setReadingState({ joinCode: match.joinCode, label: match.label })
      }
    }).catch(() => {})
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
      <div className="sticky top-0 z-10 bg-background">
        <header className="border-b px-4 py-3 flex items-center gap-4">
          <Button variant="neutral" size="sm" onClick={() => setReading(null)}>← Back</Button>
          <span className="font-semibold text-sm shrink-0">{reading.label}</span>
          <span className="flex items-center gap-3 text-xs font-semibold">
            <span className="apparatus-quarto">‹ › Quarto 1608</span>
            <span className="apparatus-folio">[ ] Folio 1623</span>
          </span>
          <label className="flex items-center gap-2 text-sm cursor-pointer ml-auto">
            <span className="text-muted-foreground">Highlight</span>
            <Switch checked={showVariants} onCheckedChange={setShowVariants} />
          </label>
        </header>
        <div className="border-b py-2 flex flex-col items-center gap-2">
          <SceneNav acts={learData.acts as any} actNum={actNum} sceneNum={sceneNum} onGoTo={(a, s) => { setActNum(a); setSceneNum(s) }} />
          <Progress value={scrollProgress} className="w-full max-w-2xl h-1" />
        </div>
      </div>
      <main className="px-2 py-4 sm:px-6">
        <TextReader acts={learData.acts as any} showVariants={showVariants} studentId={teacherStudentId ?? ''} studentName={teacherName ?? ''} initials={teacherInitials ?? ''} actNum={actNum} sceneNum={sceneNum} />
      </main>
    </div></TooltipProvider>
  )

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Teacher view</h1>
        <Button variant="neutral" size="sm" onClick={logout}>Log out</Button>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Class codes</h2>
        <div className="flex gap-2 mb-4 flex-wrap">
          <Input placeholder="Label e.g. Year 11B" value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && createCode()} className="w-48 shrink-0" />
          <Input placeholder="Code e.g. ENG11B" value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && createCode()} className="w-32 shrink-0 uppercase" />
          <Button onClick={createCode} disabled={creating || !label.trim()}>{creating ? 'Creating…' : 'Create'}</Button>
        </div>
        {!classes.length && <p className="text-sm text-muted-foreground">No class codes yet.</p>}
        <Accordion type="multiple">
          {classes.map(c => {
            const students = allStudents.filter((s: any) => s.joinCode === c.joinCode)
            const notes = allNotes.filter((n: any) => n.joinCode === c.joinCode)
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
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <Input placeholder="Student name" value={newStudent[c.joinCode]?.name ?? ''} onChange={e => setNewStudent(p => ({ ...p, [c.joinCode]: { ...p[c.joinCode], name: e.target.value } }))} className="w-40 shrink-0" />
                    <Input placeholder="Initials" value={newStudent[c.joinCode]?.initials ?? ''} onChange={e => setNewStudent(p => ({ ...p, [c.joinCode]: { ...p[c.joinCode], initials: e.target.value.toUpperCase().slice(0, 4) } }))} onKeyDown={e => e.key === 'Enter' && addStudent(c.joinCode)} className="w-20 shrink-0 uppercase" maxLength={4} />
                    <Button size="sm" onClick={() => addStudent(c.joinCode)} disabled={addingStudent[c.joinCode]}>{addingStudent[c.joinCode] ? 'Adding…' : 'Add student'}</Button>
                  </div>
                  <DataTable columns={studentColumns} data={students} pageSize={10} />
                  <div id={'notes-' + c.joinCode} className="mt-6">
                    <p className="text-sm font-semibold mb-3">Student notes</p>
                    {notes.length ? <DataTable columns={noteColumns} data={notes} pageSize={20} /> : <p className="text-sm text-muted-foreground">No notes yet.</p>}
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
