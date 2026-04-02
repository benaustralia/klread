import type { ReactNode } from 'react'
import { SceneNav } from './SceneNav'
import { Progress } from '@/components/ui/progress'

export function ReadingHeader({ left, right, acts, actNum, sceneNum, onGoTo, scrollProgress }: {
  left: ReactNode
  right?: ReactNode
  acts: any
  actNum: number
  sceneNum: number
  onGoTo: (a: number, s: number) => void
  scrollProgress: number
}) {
  return (
    <div className="sticky top-0 z-10 bg-background">
      <header className="border-b px-4 py-3 flex items-center gap-1.5 @[60rem]/app:gap-3">
        <div className="flex-1 min-w-0">{left}</div>
        <div className="shrink-0"><SceneNav acts={acts} actNum={actNum} sceneNum={sceneNum} onGoTo={onGoTo} /></div>
        <div className="hidden @[60rem]/app:flex items-center gap-2 ml-auto">
          <span className="flex items-center gap-2 text-xs font-semibold shrink-0">
            <span className="apparatus-quarto">‹ › Quarto 1608</span>
            <span className="apparatus-folio">[ ] Folio 1623</span>
          </span>
          {right}
        </div>
      </header>
      <Progress value={scrollProgress} className="w-full rounded-none border-0 h-1" />
    </div>
  )
}
