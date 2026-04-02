import { useState, useEffect, useSyncExternalStore } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DataTable } from '@/components/ui/data-table'
import { TextReader } from './TextReader'
import { ReadingHeader } from './ReadingHeader'
import { BrokenCrown } from './BrokenCrown'
import { AllNotesSheet } from './AllNotesSheet'
import { Clipboard, Check } from 'lucide-react'
import learData from '../data/king-lear.json'

type Note = { id: string; studentName: string; joinCode: string; lineId: string; body: string; updatedAt: string }
type Class = { joinCode: string; label: string; createdAt: string }
type Student = { studentId: string; studentName: string; joinCode: string; initials: string; lastSeen: string; noteCount: number }
const fmtInitials = (v: string) => v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4).split('').join('.')
const logout = () => { localStorage.removeItem('klread_session'); location.href = '/' }
const post = (url: string, d: any) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
const patch = (url: string, d: any) => fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
const subScroll = (cb: () => void) => { window.addEventListener('scroll', cb, { passive: true }); return () => window.removeEventListener('scroll', cb) }
const getScroll = () => Math.round(document.documentElement.scrollTop / (document.documentElement.scrollHeight - document.documentElement.clientHeight) * 100) || 0

const stuCols = (onDel: (id: string) => void): ColumnDef<Student>[] => [
  { accessorKey: 'studentName', header: 'Name' },
  { accessorKey: 'initials', header: 'Initials', cell: ({ row }) => <span className="font-mono text-xs">{row.getValue('initials')}</span> },
  { accessorKey: 'noteCount', header: 'Notes', cell: ({ row }) => <Badge>{row.getValue('noteCount')}</Badge> },
  { accessorKey: 'lastSeen', header: 'Last seen', cell: ({ row }) => {
    const v = row.getValue('lastSeen') as string
    return <span className="text-muted-foreground">{v ? new Date(v).toLocaleString() : '—'}</span>
  }},
  { id: 'actions', cell: ({ row }) => (
    <button onClick={() => onDel(row.original.studentId)} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
  )},
]

function NotesList({ notes, editing, setEditing, onSave, onDel }: {
  notes: Note[]; editing: Record<string, string>
  setEditing: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onSave: (id: string) => void; onDel: (id: string) => void
}) {
  if (!notes.length) return <p className="text-sm text-muted-foreground">No notes yet.</p>
  const cancel = (id: string) => setEditing(p => { const c = { ...p }; delete c[id]; return c })
  return (
    <div className="flex flex-col gap-2">
      {notes.map(n => (
        <div key={n.id} className="border-2 border-border rounded-base p-3 flex gap-3 items-start text-sm">
          <span className="font-semibold shrink-0 w-20 truncate">{n.studentName}</span>
          <span className="font-mono text-xs text-primary shrink-0 pt-0.5">{n.lineId}</span>
          {n.id in editing ? (
            <div className="flex-1 grid gap-1">
              <Textarea value={editing[n.id]} onChange={e => setEditing(p => ({ ...p, [n.id]: e.target.value }))}
                rows={2} className="resize-none" autoFocus />
              <div className="flex gap-2">
                <button onClick={() => onSave(n.id)} className="text-xs text-primary hover:underline">Save</button>
                <button onClick={() => cancel(n.id)} className="text-xs text-muted-foreground">Cancel</button>
              </div>
            </div>
          ) : (<>
            <span className="flex-1 leading-relaxed">{n.body}</span>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setEditing(p => ({ ...p, [n.id]: n.body }))} className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
              <button onClick={() => onDel(n.id)} className="text-xs text-muted-foreground hover:text-destructive">Delete</button>
            </div>
          </>)}
        </div>))}
    </div>
  )
}

export function TeacherView({ teacherKey, teacherStudentId, teacherName }: {
  teacherKey?: string; teacherStudentId?: string; teacherName?: string
}) {
  const key = teacherKey ?? new URLSearchParams(location.search).get('key') ?? ''
  const k = encodeURIComponent(key)
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [notes, setNotes] = useState<(Note & { joinCode: string })[]>([])
  const [editNotes, setEditNotes] = useState<Record<string, string>>({})
  const [err, setErr] = useState('')
  const readingParam = new URLSearchParams(location.search).get('reading')
  const [reading, setReadingState] = useState<{ joinCode: string; label: string } | null>(null)
  const [actNum, setActNum] = useState(1)
  const [sceneNum, setSceneNum] = useState(1)
  const scrollProgress = useSyncExternalStore(subScroll, getScroll)
  const [label, setLabel] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<Record<string, boolean>>({})
  const [newStu, setNewStu] = useState<Record<string, { name: string; initials: string }>>({})
  const [addingStu, setAddingStu] = useState<Record<string, boolean>>({})
  const [notesOpen, setNotesOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/teacher?key=${k}&summary=1`)
      .then(r => { if (r.status === 403) throw new Error('Invalid teacher key'); return r.json() })
      .then(setStudents).catch(e => setErr(e.message))
    fetch(`/api/teacher?key=${k}`).then(r => r.json()).then(setNotes).catch(() => {})
    fetch(`/api/classes?key=${k}`).then(r => r.json())
      .then((all: Class[]) => setClasses(all.filter(c => c.label !== 'Teacher'))).catch(() => {})
  }, [])

  useEffect(() => {
    if (!readingParam || !classes.length) return
    const m = classes.find(c => c.joinCode === readingParam)
    if (m) setReadingState({ joinCode: m.joinCode, label: m.label })
  }, [classes])

  function setReading(val: { joinCode: string; label: string } | null) {
    setReadingState(val)
    const url = new URL(location.href)
    if (val) url.searchParams.set('reading', val.joinCode); else url.searchParams.delete('reading')
    history.replaceState(null, '', url)
  }
  function copy(jc: string) {
    navigator.clipboard.writeText(jc); setCopied(p => ({ ...p, [jc]: true }))
    setTimeout(() => setCopied(p => ({ ...p, [jc]: false })), 1500)
  }
  async function handleCreate() {
    if (!label.trim()) return; setCreating(true)
    const r = await post(`/api/classes?key=${k}`, { label: label.trim(), code: codeInput.trim().toUpperCase() || undefined })
    if (r.ok) { const c = await r.json(); setClasses(p => [c, ...p]) }
    setLabel(''); setCodeInput(''); setCreating(false)
  }
  async function handleAdd(jc: string) {
    const s = newStu[jc]; if (!s?.name.trim() || !s?.initials.trim()) return
    setAddingStu(p => ({ ...p, [jc]: true }))
    await post('/api/sessions', { studentName: s.name.trim(), joinCode: jc, initials: s.initials.trim().toUpperCase().slice(0, 4) })
    setStudents(await fetch(`/api/teacher?key=${k}&summary=1`).then(r => r.json()).catch(() => students))
    setNewStu(p => ({ ...p, [jc]: { name: '', initials: '' } })); setAddingStu(p => ({ ...p, [jc]: false }))
  }
  async function delStudent(id: string) {
    await fetch(`/api/sessions?studentId=${id}&key=${k}`, { method: 'DELETE' })
    setStudents(p => p.filter(s => s.studentId !== id))
  }
  async function delCode(c: string) {
    await fetch(`/api/classes?key=${k}&code=${c}`, { method: 'DELETE' })
    setClasses(p => p.filter(x => x.joinCode !== c))
  }
  async function delNote(id: string) {
    await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
    setNotes(p => p.filter(n => n.id !== id))
  }
  async function saveNote(id: string) {
    const body = editNotes[id]?.trim(); if (!body) return
    await patch('/api/notes', { id, body })
    setNotes(p => p.map(n => n.id === id ? { ...n, body } : n))
    setEditNotes(p => { const c = { ...p }; delete c[id]; return c })
  }

  if (err) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-destructive font-semibold">{err}</p>
      <button onClick={logout} className="text-sm underline text-muted-foreground">Log out and try again</button>
    </div>
  )
  if (reading) return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <ReadingHeader
          left={<span className="flex items-center gap-2">
            <Button variant="neutral" size="sm" onClick={() => setReading(null)}>← Back</Button>
            <span className="font-semibold text-sm">{reading.label}</span>
          </span>}
          right={<Button variant="neutral" size="sm" className="text-xs" onClick={() => setNotesOpen(true)}>Notes</Button>}
          acts={learData.acts as any} actNum={actNum} sceneNum={sceneNum}
          onGoTo={(a, s) => { setActNum(a); setSceneNum(s) }} scrollProgress={scrollProgress} />
        <main className="px-2 py-4 sm:px-6">
          <TextReader acts={learData.acts as any} studentId={teacherStudentId ?? ''}
            studentName={teacherName ?? ''} actNum={actNum} sceneNum={sceneNum} />
        </main>
        <AllNotesSheet studentId={teacherStudentId ?? ''} joinCode={reading.joinCode}
          open={notesOpen} onOpenChange={setNotesOpen} isTeacher />
      </div>
    </TooltipProvider>
  )

  const np = { editing: editNotes, setEditing: setEditNotes, onSave: saveNote, onDel: delNote }
  const teacherNotes = notes.filter(n => !classes.some(c => c.joinCode === n.joinCode))

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background">
        <header className="border-b px-4 py-3 flex items-center gap-3">
          <h1 className="flex-1 text-lg font-bold flex items-center gap-2">
            <BrokenCrown className="w-8 h-8" /> King Lear <span className="text-main">Promptbook</span>
          </h1>
          <span className="text-xs font-semibold text-muted-foreground">Teacher</span>
          <Button variant="neutral" size="sm" onClick={logout}>Log out</Button>
        </header>
      </div>
      <div className="max-w-4xl mx-auto p-6">
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Class codes</h2>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Input placeholder="Label e.g. Year 11B" value={label} onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()} className="w-48 shrink-0" />
            <Input placeholder="Code e.g. ENG11B" value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleCreate()} className="w-32 shrink-0 uppercase" />
            <Button onClick={handleCreate} disabled={creating || !label.trim()}>
              {creating ? 'Creating…' : 'Create'}</Button>
          </div>
          {!classes.length && <p className="text-sm text-muted-foreground">No class codes yet.</p>}
          <Accordion type="multiple" defaultValue={classes[0] ? [classes[0].joinCode] : []}>
            {classes.map(c => (
              <AccordionItem key={c.joinCode} value={c.joinCode}>
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-3 text-left">
                    <span className="font-medium">{c.label}</span>
                    <span className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <span className="font-mono font-bold text-primary text-sm">{c.joinCode}</span>
                      <span role="button" aria-label="Copy" tabIndex={0} onClick={() => copy(c.joinCode)}
                        className="inline-flex items-center justify-center size-9 rounded-base border-2 border-border bg-main text-main-foreground transition-all cursor-pointer">
                        <span className="sr-only">Copy</span>
                        {copied[c.joinCode] ? <Check /> : <Clipboard />}
                      </span>
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex gap-2 mb-4">
                    <Button size="sm" onClick={() => setReading({ joinCode: c.joinCode, label: c.label })}>Read</Button>
                    <button onClick={() => delCode(c.joinCode)}
                      className="ml-auto text-xs text-muted-foreground hover:text-destructive">Delete code</button>
                  </div>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <Input placeholder="Student name" value={newStu[c.joinCode]?.name ?? ''}
                      onChange={e => setNewStu(p => ({ ...p, [c.joinCode]: { ...p[c.joinCode], name: e.target.value } }))}
                      className="w-40 shrink-0" />
                    <Input placeholder="Initials" value={newStu[c.joinCode]?.initials ?? ''}
                      onChange={e => setNewStu(p => ({ ...p, [c.joinCode]: { ...p[c.joinCode], initials: fmtInitials(e.target.value) } }))}
                      onKeyDown={e => e.key === 'Enter' && handleAdd(c.joinCode)} className="w-20 shrink-0" maxLength={7} />
                    <Button size="sm" onClick={() => handleAdd(c.joinCode)} disabled={addingStu[c.joinCode]}>
                      {addingStu[c.joinCode] ? 'Adding…' : 'Add student'}</Button>
                  </div>
                  <DataTable columns={stuCols(delStudent)} data={students.filter(s => s.joinCode === c.joinCode)} pageSize={10} />
                  <div className="mt-6">
                    <p className="text-sm font-semibold mb-3">Student notes</p>
                    <NotesList notes={notes.filter(n => n.joinCode === c.joinCode)} {...np} />
                  </div>
                </AccordionContent>
              </AccordionItem>))}
          </Accordion>
        </section>
        {teacherNotes.length > 0 && <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Your notes</h2>
          <NotesList notes={teacherNotes} {...np} />
        </section>}
      </div>
    </div>
  )
}
