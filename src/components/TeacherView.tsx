import { useEffect, useSyncExternalStore } from 'react'
import { create } from 'zustand'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DataTable } from '@/components/ui/data-table'
import { TextReader } from './TextReader'
import { ReadingHeader } from './ReadingHeader'
import { BrokenCrown } from './BrokenCrown'
import { AllNotesSheet } from './AllNotesSheet'
import { Clipboard, Check } from 'lucide-react'
import { NotesList } from './NotesList'
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

const useStore = create<{
  classes: Class[]; students: Student[]; notes: (Note & { joinCode: string })[]; editNotes: Record<string, string>
  err: string; reading: { joinCode: string; label: string } | null; copied: Record<string, boolean>
  creating: boolean; adding: Record<string, boolean>; notesOpen: boolean; actNum: number; sceneNum: number
  set: (p: any) => void; init: (k: string) => void; setReading: (v: any) => void; copy: (jc: string) => void
  createCode: (k: string, fd: FormData) => void; addStudent: (k: string, jc: string, fd: FormData) => void
  delStudent: (k: string, id: string) => void; delCode: (k: string, jc: string) => void
  delNote: (id: string) => void; saveNote: (id: string) => void
  setEditNotes: (fn: (p: Record<string, string>) => Record<string, string>) => void
}>(set => ({
  classes: [], students: [], notes: [], editNotes: {}, err: '', reading: null,
  copied: {}, creating: false, adding: {}, notesOpen: false, actNum: 1, sceneNum: 1,
  set: (p) => set(p),
  init: (k) => {
    fetch(`/api/teacher?key=${k}&summary=1`)
      .then(r => { if (r.status === 403) throw new Error('Invalid teacher key'); return r.json() })
      .then(students => set({ students })).catch(e => set({ err: e.message }))
    fetch(`/api/teacher?key=${k}`).then(r => r.json()).then(notes => set({ notes })).catch(() => {})
    fetch(`/api/classes?key=${k}`).then(r => r.json()).then((all: Class[]) => {
      const classes = all.filter(c => c.label !== 'Teacher')
      set({ classes })
      const rp = new URLSearchParams(location.search).get('reading')
      const m = rp && classes.find(c => c.joinCode === rp)
      if (m) set({ reading: { joinCode: m.joinCode, label: m.label } })
    }).catch(() => {})
  },
  setReading: (val) => {
    set({ reading: val })
    const url = new URL(location.href)
    if (val) url.searchParams.set('reading', val.joinCode); else url.searchParams.delete('reading')
    history.replaceState(null, '', url)
  },
  copy: (jc) => {
    navigator.clipboard.writeText(jc); set((s: any) => ({ copied: { ...s.copied, [jc]: true } }))
    setTimeout(() => set((s: any) => ({ copied: { ...s.copied, [jc]: false } })), 1500)
  },
  createCode: async (k, fd) => {
    const label = (fd.get('label') as string).trim(); if (!label) return
    set({ creating: true })
    const r = await post(`/api/classes?key=${k}`, { label, code: (fd.get('code') as string).trim().toUpperCase() || undefined })
    if (r.ok) { const c = await r.json(); set((s: any) => ({ classes: [c, ...s.classes] })) }
    set({ creating: false })
  },
  addStudent: async (k, jc, fd) => {
    const name = (fd.get('name') as string).trim(), ini = fmtInitials(fd.get('initials') as string)
    if (!name || !ini) return
    set((s: any) => ({ adding: { ...s.adding, [jc]: true } }))
    await post('/api/sessions', { studentName: name, joinCode: jc, initials: ini })
    const students = await fetch(`/api/teacher?key=${k}&summary=1`).then(r => r.json()).catch(() => [])
    set((s: any) => ({ students, adding: { ...s.adding, [jc]: false } }))
  },
  delStudent: (k, id) => fetch(`/api/sessions?studentId=${id}&key=${k}`, { method: 'DELETE' })
    .then(() => set((s: any) => ({ students: s.students.filter((x: any) => x.studentId !== id) }))),
  delCode: (k, jc) => fetch(`/api/classes?key=${k}&code=${jc}`, { method: 'DELETE' })
    .then(() => set((s: any) => ({ classes: s.classes.filter((x: any) => x.joinCode !== jc) }))),
  delNote: (id) => fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
    .then(() => set((s: any) => ({ notes: s.notes.filter((n: any) => n.id !== id) }))),
  saveNote: async (id) => {
    const body = (useStore.getState() as any).editNotes[id]?.trim(); if (!body) return
    await patch('/api/notes', { id, body })
    set((s: any) => ({
      notes: s.notes.map((n: any) => n.id === id ? { ...n, body } : n),
      editNotes: Object.fromEntries(Object.entries(s.editNotes).filter(([k]) => k !== id)) as Record<string, string>,
    }))
  },
  setEditNotes: (fn) => set((s: any) => ({ editNotes: fn(s.editNotes) })),
}))

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

export function TeacherView({ teacherKey, teacherStudentId, teacherName }: {
  teacherKey?: string; teacherStudentId?: string; teacherName?: string
}) {
  const key = teacherKey ?? new URLSearchParams(location.search).get('key') ?? ''
  const k = encodeURIComponent(key)
  const s = useStore()
  const scrollProgress = useSyncExternalStore(subScroll, getScroll)
  useEffect(() => { s.init(k) }, [])

  if (s.err) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-destructive font-semibold">{s.err}</p>
      <button onClick={logout} className="text-sm underline text-muted-foreground">Log out and try again</button>
    </div>)
  if (s.reading) return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <ReadingHeader
          left={<span className="flex items-center gap-2">
            <Button variant="neutral" size="sm" onClick={() => s.setReading(null)}>← Back</Button>
            <span className="font-semibold text-sm">{s.reading.label}</span>
          </span>}
          right={<Button variant="neutral" size="sm" className="text-xs" onClick={() => s.set({ notesOpen: true })}>Notes</Button>}
          acts={learData.acts as any} actNum={s.actNum} sceneNum={s.sceneNum}
          onGoTo={(a, sc) => s.set({ actNum: a, sceneNum: sc })} scrollProgress={scrollProgress} />
        <main className="px-2 py-4 sm:px-6">
          <TextReader acts={learData.acts as any} studentId={teacherStudentId ?? ''}
            studentName={teacherName ?? ''} actNum={s.actNum} sceneNum={s.sceneNum} />
        </main>
        <AllNotesSheet studentId={teacherStudentId ?? ''} joinCode={s.reading.joinCode}
          open={s.notesOpen} onOpenChange={v => s.set({ notesOpen: v })} isTeacher />
      </div>
    </TooltipProvider>)

  const np = { editing: s.editNotes, setEditing: s.setEditNotes, onSave: s.saveNote, onDel: s.delNote }

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
          <form action={fd => s.createCode(k, fd)} className="flex gap-2 mb-4 flex-wrap">
            <Input name="label" placeholder="Label e.g. Year 11B" className="w-48 shrink-0" required />
            <Input name="code" placeholder="Code e.g. ENG11B" className="w-32 shrink-0 uppercase" />
            <Button type="submit" disabled={s.creating}>{s.creating ? 'Creating…' : 'Create'}</Button>
          </form>
          {!s.classes.length && <p className="text-sm text-muted-foreground">No class codes yet.</p>}
          <Accordion type="multiple" defaultValue={s.classes[0] ? [s.classes[0].joinCode] : []}>
            {s.classes.map(c => (
              <AccordionItem key={c.joinCode} value={c.joinCode}>
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-3 text-left">
                    <span className="font-medium">{c.label}</span>
                    <span className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <span className="font-mono font-bold text-primary text-sm">{c.joinCode}</span>
                      <Button variant="default" size="icon" className="size-9"
                        onClick={() => s.copy(c.joinCode)} aria-label="Copy">
                        {s.copied[c.joinCode] ? <Check /> : <Clipboard />}
                      </Button>
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex gap-2 mb-4">
                    <Button size="sm" onClick={() => s.setReading({ joinCode: c.joinCode, label: c.label })}>Read</Button>
                    <button onClick={() => s.delCode(k, c.joinCode)}
                      className="ml-auto text-xs text-muted-foreground hover:text-destructive">Delete code</button>
                  </div>
                  <form action={fd => s.addStudent(k, c.joinCode, fd)} className="flex gap-2 mb-3 flex-wrap">
                    <Input name="name" placeholder="Student name" className="w-40 shrink-0" />
                    <Input name="initials" placeholder="Initials" className="w-20 shrink-0" maxLength={7} />
                    <Button type="submit" size="sm" disabled={s.adding[c.joinCode]}>
                      {s.adding[c.joinCode] ? 'Adding…' : 'Add student'}</Button>
                  </form>
                  <DataTable columns={stuCols(id => s.delStudent(k, id))} data={s.students.filter(x => x.joinCode === c.joinCode)} pageSize={10} />
                  <div className="mt-6">
                    <p className="text-sm font-semibold mb-3">Student notes</p>
                    <NotesList notes={s.notes.filter(n => n.joinCode === c.joinCode)} {...np} />
                  </div>
                </AccordionContent>
              </AccordionItem>))}
          </Accordion>
        </section>
        {s.notes.filter(n => !s.classes.some(c => c.joinCode === n.joinCode)).length > 0 && <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Your notes</h2>
          <NotesList notes={s.notes.filter(n => !s.classes.some(c => c.joinCode === n.joinCode))} {...np} />
        </section>}
      </div>
    </div>
  )
}
