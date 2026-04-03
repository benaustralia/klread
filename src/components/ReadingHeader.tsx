import type { ReactNode } from 'react'
import { BrokenCrown } from './BrokenCrown'
import { SceneNav } from './SceneNav'
import { Progress } from '@/components/ui/progress'

export function ReadingHeader({ subtitle, toolbar, acts, actNum, sceneNum, onGoTo, scrollProgress }: {
  subtitle?: string
  toolbar: ReactNode
  acts: any
  actNum: number
  sceneNum: number
  onGoTo: (a: number, s: number) => void
  scrollProgress: number
}) {
  return (
    <>
      <div className="sticky top-0 z-10 bg-background">
        <header className="border-b px-4 py-3 flex items-center gap-1.5 min-[960px]:gap-3 flex-nowrap">
          <h1 className="text-lg font-bold flex items-center gap-2 shrink-0 whitespace-nowrap">
            <BrokenCrown className="w-8 h-8 shrink-0" />
            King Lear
            <span className="hidden min-[1200px]:inline text-main">Promptbook</span>
            {subtitle && <span className="hidden min-[1200px]:inline text-sm font-semibold text-muted-foreground">— {subtitle}</span>}
          </h1>
          <div className="shrink-0">
            <SceneNav acts={acts} actNum={actNum} sceneNum={sceneNum} onGoTo={onGoTo} />
          </div>
          <div className="hidden min-[960px]:flex items-center gap-2 ml-auto shrink-0">
            <span className="hidden min-[1200px]:flex items-center gap-2 text-xs font-semibold shrink-0">
              <span className="apparatus-quarto">‹ › Quarto 1608</span>
              <span className="apparatus-folio">[ ] Folio 1623</span>
            </span>
            <span className="flex items-center gap-1">{toolbar}</span>
          </div>
        </header>
        <Progress value={scrollProgress} className="w-full rounded-none border-0 h-1" />
      </div>
      <div className="min-[960px]:hidden fixed bottom-0 inset-x-0 z-10 bg-background border-t flex items-center justify-around px-4 py-2">
        {toolbar}
      </div>
    </>
  )
}
