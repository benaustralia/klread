import { TextALeft, TextARight, TextBLeft, TextBRight } from './brackets'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export type Line = {
  id: string; ftln?: number; act: number; scene: number
  speaker?: string; text: string; ana?: 'verse' | 'prose' | 'short'
  texta?: true; textb?: true; type?: 'stage'; stageType?: string; inline?: boolean
}
export type Highlight = { charStart?: number; charEnd?: number; anchor: string }

const VT = { a: 'Quarto 1608 only — not in the Folio', b: 'Folio 1623 only — not in the First Quarto' } as const

function BracketTip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild><span className="inline-flex items-baseline">{children}</span></TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function renderText(text: string, hl: Highlight[], onHl: (a: string) => void) {
  if (!hl.length) return <span data-line-text>{text}</span>
  const pts = new Set([0, text.length])
  for (const h of hl) { pts.add(h.charStart ?? 0); pts.add(h.charEnd ?? text.length) }
  const sorted = [...pts].sort((a, b) => a - b)
  const parts: React.ReactNode[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const [s, e] = [sorted[i], sorted[i + 1]]
    const seg = text.slice(s, e)
    const h = hl.find(x => (x.charStart ?? 0) <= s && (x.charEnd ?? text.length) >= e)
    if (h) parts.push(<mark key={`s${i}`} className="bg-main/25 rounded-sm cursor-pointer hover:bg-main/40 not-italic"
      onClick={ev => { ev.stopPropagation(); onHl(h.anchor) }}>{seg}</mark>)
    else parts.push(seg)
  }
  return <span data-line-text>{parts}</span>
}

export function LineRenderer({ line, highlights = [], onHighlightClick, onClick }: {
  line: Line; highlights?: Highlight[]
  onHighlightClick: (anchor: string) => void; onClick: (l: Line) => void
}) {
  return (
    <div className="flex gap-3 items-center cursor-pointer hover:bg-secondary-background px-2 rounded-base transition-colors"
      onClick={() => onClick(line)}>
      <span className="text-xs text-muted-foreground select-none w-[7ch] shrink-0 text-right font-mono self-center py-0.5">
        {line.id}
      </span>
      <span className={`leading-relaxed flex-1 py-0.5 ${line.ana !== 'prose' ? 'pl-6' : ''}`}>
        {line.texta && <BracketTip label={VT.a}><span className="text-sky-600 mr-0.5"><TextALeft /></span></BracketTip>}
        {line.textb && <BracketTip label={VT.b}><span className="text-yellow-700 mr-0.5"><TextBLeft /></span></BracketTip>}
        {renderText(line.text, highlights, onHighlightClick)}
        {line.texta && <span className="text-sky-600 ml-0.5"><TextARight /></span>}
        {line.textb && <span className="text-yellow-700 ml-0.5"><TextBRight /></span>}
      </span>
    </div>
  )
}
