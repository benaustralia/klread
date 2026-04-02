import { use, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TextReader } from './TextReader'
import { ReadingHeader } from './ReadingHeader'
import { AllNotesSheet } from './AllNotesSheet'
import { SearchDialog } from './SearchDialog'
import { useTeacher, subScroll, getScroll } from './teacherStore'
import { learPromise } from '../data/lear'

export function TeacherReading({ teacherStudentId, teacherName }: {
  teacherStudentId?: string; teacherName?: string
}) {
  const learData = use(learPromise)
  const s = useTeacher()
  const scrollProgress = useSyncExternalStore(subScroll, getScroll)
  const sizes = ['base', 'lg', 'xl'] as const
  const [textSize, setTextSize] = useState<(typeof sizes)[number]>('base')
  const [searchOpen, setSearchOpen] = useState(false)
  if (!s.reading) return null

  const cycleSize = (dir: -1 | 1) => () => setTextSize(sz => sizes[sizes.indexOf(sz) + dir])
  const toolbar = <>
    <Button variant="neutral" size="sm" className="text-xs px-2" disabled={textSize === 'base'} onClick={cycleSize(-1)}>A−</Button>
    <Button variant="neutral" size="sm" className="text-xs px-2" disabled={textSize === 'xl'} onClick={cycleSize(1)}>A+</Button>
    <Button onClick={() => s.set({ notesOpen: true })} variant="neutral" size="sm" className="text-xs">Notes</Button>
    <Button onClick={() => setSearchOpen(true)} variant="neutral" size="sm" className="text-xs">Search</Button>
    <Button variant="neutral" size="sm" className="text-xs" onClick={() => s.setReading(null)}>← Back</Button>
  </>

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <ReadingHeader
          left={<span className="flex items-center gap-2">
            <span className="font-semibold text-sm">{s.reading.label}</span>
          </span>}
          right={<span className="flex items-center gap-1">{toolbar}</span>}
          acts={learData.acts as any} actNum={s.actNum} sceneNum={s.sceneNum}
          onGoTo={(a, sc) => s.set({ actNum: a, sceneNum: sc })} scrollProgress={scrollProgress} />
        <main className="px-2 py-4 min-[960px]:px-6 pb-20 min-[960px]:pb-4">
          <TextReader acts={learData.acts as any} studentId={teacherStudentId ?? ''}
            studentName={teacherName ?? ''} actNum={s.actNum} sceneNum={s.sceneNum}
            joinCode={s.reading?.joinCode} isTeacher textSize={textSize} />
        </main>
        <div className="min-[960px]:hidden fixed bottom-0 inset-x-0 z-10 bg-background border-t flex items-center justify-around px-4 py-2">
          {toolbar}
        </div>
        <AllNotesSheet studentId={teacherStudentId ?? ''} joinCode={s.reading.joinCode}
          open={s.notesOpen} onOpenChange={v => s.set({ notesOpen: v })} isTeacher />
        <SearchDialog acts={learData.acts as any} open={searchOpen} onOpenChange={setSearchOpen}
          onNavigate={(a, sc) => { s.set({ actNum: a, sceneNum: sc }); setSearchOpen(false) }} />
      </div>
    </TooltipProvider>
  )
}
