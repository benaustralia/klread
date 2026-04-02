import { use, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TextReader } from './TextReader'
import { ReadingHeader } from './ReadingHeader'
import { AllNotesSheet } from './AllNotesSheet'
import { useTeacher, subScroll, getScroll } from './teacherStore'
import { learPromise } from '../data/lear'

export function TeacherReading({ teacherStudentId, teacherName }: {
  teacherStudentId?: string; teacherName?: string
}) {
  const learData = use(learPromise)
  const s = useTeacher()
  const scrollProgress = useSyncExternalStore(subScroll, getScroll)
  if (!s.reading) return null
  return (
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
            studentName={teacherName ?? ''} actNum={s.actNum} sceneNum={s.sceneNum}
            joinCode={s.reading?.joinCode} isTeacher />
        </main>
        <AllNotesSheet studentId={teacherStudentId ?? ''} joinCode={s.reading.joinCode}
          open={s.notesOpen} onOpenChange={v => s.set({ notesOpen: v })} isTeacher />
      </div>
    </TooltipProvider>
  )
}
