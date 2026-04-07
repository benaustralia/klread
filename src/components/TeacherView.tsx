import { useEffect } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { DataTable } from '@/components/ui/data-table'
import { BrokenCrown } from './BrokenCrown'
import { NotesList } from './NotesList'
import { TeacherReading } from './TeacherReading'
import { useTeacher, logout, type Student } from './teacherStore'
import { Clipboard, Check, LogOut, ChevronDown } from 'lucide-react'

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
  const k = encodeURIComponent(teacherKey ?? new URLSearchParams(location.search).get('key') ?? '')
  const s = useTeacher()
  useEffect(() => { s.init(k) }, [])

  if (s.err) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-destructive font-semibold">{s.err}</p>
      <button onClick={logout} className="text-sm underline text-muted-foreground">Log out and try again</button>
    </div>)
  if (s.reading) return <TeacherReading teacherStudentId={teacherStudentId} teacherName={teacherName} />

  const np = { editing: s.editNotes, setEditing: s.setEditNotes, onSave: s.saveNote, onDel: s.delNote }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background">
        <header className="border-b px-4 py-3 flex items-center gap-1.5 min-[600px]:gap-3 flex-nowrap">
          <h1 className="flex-1 text-lg font-bold flex items-center gap-2 whitespace-nowrap">
            <BrokenCrown className="w-8 h-8 shrink-0" />
            <span className="hidden min-[600px]:inline">King Lear</span>
            <span className="min-[600px]:hidden">KL</span>
            <span className="hidden min-[600px]:inline text-main">Promptbook</span>
          </h1>
          <span className="hidden min-[600px]:inline text-xs font-semibold text-muted-foreground">Teacher</span>
          <Button variant="neutral" size="sm" onClick={logout} className="hidden min-[600px]:inline-flex">Log out</Button>
          <Button variant="neutral" size="icon" onClick={logout} aria-label="Log out" className="min-[600px]:hidden"><LogOut /></Button>
        </header>
      </div>
      <div className="max-w-4xl mx-auto p-3 min-[640px]:p-6">
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Class codes</h2>
          <form action={fd => s.createCode(k, fd)} className="flex flex-col min-[480px]:flex-row gap-2 mb-4 flex-wrap">
            <Input name="label" placeholder="Label e.g. Year 11B" className="w-full min-[480px]:w-48 shrink-0" required />
            <Input name="code" placeholder="Code e.g. ENG11B" className="w-full min-[480px]:w-32 shrink-0 uppercase" />
            <Button type="submit" disabled={s.creating} className="w-full min-[480px]:w-auto">{s.creating ? 'Creating…' : 'Create'}</Button>
          </form>
          {!s.classes.length && <p className="text-sm text-muted-foreground">No class codes yet.</p>}
          <Accordion type="multiple" defaultValue={s.classes[0] ? [s.classes[0].joinCode] : []}>
            {s.classes.map(c => (
              <AccordionItem key={c.joinCode} value={c.joinCode} className="group">
                <div className="relative">
                  <AccordionTrigger className="hover:no-underline pr-24 [&>svg]:hidden">
                    <span className="flex items-center gap-3 text-left flex-wrap">
                      <span className="font-medium">{c.label}</span>
                      <span className="font-mono font-bold text-primary text-sm">{c.joinCode}</span>
                    </span>
                  </AccordionTrigger>
                  <Button variant="default" size="icon"
                    className="size-9 absolute right-12 top-1/2 -translate-y-1/2 z-10"
                    onClick={() => s.copy(c.joinCode)} aria-label="Copy">
                    {s.copied[c.joinCode] ? <Check /> : <Clipboard />}
                  </Button>
                  <ChevronDown className="size-5 absolute right-4 top-1/2 -translate-y-1/2 text-main-foreground pointer-events-none transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
                <AccordionContent>
                  <div className="flex gap-2 mb-4">
                    <Button size="sm" onClick={() => s.setReading({ joinCode: c.joinCode, label: c.label })}>Read</Button>
                    <button onClick={() => s.delCode(k, c.joinCode)}
                      className="ml-auto text-xs text-muted-foreground hover:text-destructive">Delete code</button>
                  </div>
                  <form action={fd => s.addStudent(k, c.joinCode, fd)} className="flex flex-col min-[480px]:flex-row gap-2 mb-3 flex-wrap">
                    <Input name="name" placeholder="Student name" className="w-full min-[480px]:w-40 shrink-0" />
                    <Input name="initials" placeholder="Initials" className="w-full min-[480px]:w-20 shrink-0" maxLength={7} />
                    <Button type="submit" size="sm" disabled={s.adding[c.joinCode]} className="w-full min-[480px]:w-auto">
                      {s.adding[c.joinCode] ? 'Adding…' : 'Add student'}</Button>
                  </form>
                  <DataTable columns={stuCols(id => s.delStudent(k, id))}
                    data={s.students.filter(x => x.joinCode === c.joinCode)} pageSize={10} />
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
