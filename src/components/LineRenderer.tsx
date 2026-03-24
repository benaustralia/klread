import { TextALeft, TextARight, TextBLeft, TextBRight } from './brackets'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export type Line = { id: string; ftln: number; act: number; scene: number; speaker?: string; text: string; ana: 'verse' | 'prose' | 'short'; texta?: true; textb?: true }

function BracketTip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild><span className="inline-flex items-baseline">{children}</span></TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function LineRenderer({ line, showVariants, initials, onClick }: { line: Line; showVariants: boolean; initials?: string; onClick: (l: Line) => void }) {
  const highlight = !showVariants ? '' : line.textb ? 'bg-yellow-200 border-l-2 border-yellow-400 pl-1' : line.texta ? 'bg-sky-200 border-l-2 border-sky-400 pl-1' : ''
  return (
    <div className={`flex gap-3 items-baseline cursor-pointer hover:bg-black/5 px-2 py-0.5 rounded transition-colors ${highlight}`} onClick={() => onClick(line)}>
      <span className="text-xs text-gray-400 select-none w-16 shrink-0 text-right font-mono">{line.id}</span>
      <span className="leading-relaxed flex-1" style={line.ana !== 'prose' ? { paddingLeft: '1.5rem' } : undefined}>
        {line.texta && <BracketTip label="Q1 only — text from the First Quarto not found in the Folio"><span className="inline align-baseline text-sky-600 mr-0.5"><TextALeft /></span></BracketTip>}
        {line.textb && <BracketTip label="Folio only — text from the Folio not found in the First Quarto"><span className="inline align-baseline text-yellow-700 mr-0.5"><TextBLeft /></span></BracketTip>}
        {line.text}
        {line.texta && <span className="inline align-baseline text-sky-600 ml-0.5"><TextARight /></span>}
        {line.textb && <span className="inline align-baseline text-yellow-700 ml-0.5"><TextBRight /></span>}
      </span>
      {initials && <span className="text-xs font-sans font-semibold text-primary border border-border rounded px-1 shrink-0">{initials}</span>}
    </div>
  )
}
