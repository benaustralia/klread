import { TextALeft, TextARight, TextBLeft, TextBRight } from './brackets'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export type Variant = { type: 'a' | 'b'; charStart: number; charEnd: number }
export type Line = {
  id: string; ftln?: number; act: number; scene: number
  speaker?: string; text: string; ana?: 'verse' | 'prose' | 'short'
  variants?: Variant[]; type?: 'stage'; stageType?: string; inline?: boolean
}
export type Highlight = { charStart?: number; charEnd?: number; anchor: string }

const VT = { a: 'Quarto 1608 only — not in the Folio', b: 'Folio 1623 only — not in the First Quarto' } as const
const VC = { a: 'text-sky-600', b: 'text-yellow-700' } as const
const VBG = { a: 'bg-sky-200', b: 'bg-yellow-200' } as const

function BracketTip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild><span className="inline-flex items-baseline">{children}</span></TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function renderText(text: string, hl: Highlight[], variants: Variant[], onHl: (a: string) => void) {
  const pts = new Set([0, text.length])
  for (const h of hl) { pts.add(h.charStart ?? 0); pts.add(h.charEnd ?? text.length) }
  for (const v of variants) { pts.add(v.charStart); pts.add(v.charEnd) }
  const sorted = [...pts].sort((a, b) => a - b)
  if (sorted.length === 2 && !variants.length && !hl.length) return <span data-line-text>{text}</span>
  const parts: React.ReactNode[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const [s, e] = [sorted[i], sorted[i + 1]]
    for (const v of variants.filter(x => x.charStart === s))
      parts.push(<BracketTip key={`o${s}-${v.type}`} label={VT[v.type]}>
        <span className={`inline align-baseline mr-0.5 ${VC[v.type]}`}>
          {v.type === 'a' ? <TextALeft /> : <TextBLeft />}
        </span>
      </BracketTip>)
    const seg = text.slice(s, e)
    const vr = variants.find(x => x.charStart <= s && x.charEnd >= e)
    const h = hl.find(x => (x.charStart ?? 0) <= s && (x.charEnd ?? text.length) >= e)
    const cls = [vr && VBG[vr.type], h && 'bg-main/25 rounded-sm cursor-pointer hover:bg-main/40 not-italic'].filter(Boolean).join(' ')
    if (h) parts.push(<mark key={`s${i}`} className={cls} onClick={ev => { ev.stopPropagation(); onHl(h.anchor) }}>{seg}</mark>)
    else if (cls) parts.push(<span key={`s${i}`} className={cls}>{seg}</span>)
    else parts.push(seg)
    for (const v of variants.filter(x => x.charEnd === e))
      parts.push(<span key={`c${e}-${v.type}`} className={`inline align-baseline ml-0.5 ${VC[v.type]}`}>
        {v.type === 'a' ? <TextARight /> : <TextBRight />}
      </span>)
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
        {renderText(line.text, highlights, line.variants ?? [], onHighlightClick)}
      </span>
    </div>
  )
}
