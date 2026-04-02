import { TextALeft, TextARight, TextBLeft, TextBRight } from './brackets'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export type Variant = { type: 'a' | 'b'; charStart: number; charEnd: number }

export type Line = {
  id: string; ftln?: number; act: number; scene: number
  speaker?: string; text: string; ana?: 'verse' | 'prose' | 'short'
  variants?: Variant[]; type?: 'stage'; stageType?: string; inline?: boolean
}

export type Highlight = {
  charStart?: number  // undefined = whole line
  charEnd?: number
  anchor: string      // lineId to open in NotesSheet on click
}

function BracketTip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild><span className="inline-flex items-baseline">{children}</span></TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function renderText(
  text: string,
  highlights: Highlight[],
  variants: Variant[],
  onHighlightClick: (anchor: string) => void
): React.ReactNode {
  // Collect all breakpoints from highlights and variants
  const breaks = new Set<number>([0, text.length])
  for (const h of highlights) { breaks.add(h.charStart ?? 0); breaks.add(h.charEnd ?? text.length) }
  for (const v of variants) { breaks.add(v.charStart); breaks.add(v.charEnd) }

  const sorted = [...breaks].sort((a, b) => a - b)

  if (sorted.length === 2 && !variants.length && !highlights.length) {
    return <span data-line-text>{text}</span>
  }

  const parts: React.ReactNode[] = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]
    const end = sorted[i + 1]

    // Opening brackets for variants starting at this position
    for (const v of variants) {
      if (v.charStart === start) {
        const label = v.type === 'a'
          ? 'Quarto 1608 only — not found in the Folio'
          : 'Folio 1623 only — not found in the First Quarto'
        parts.push(
          <BracketTip key={`bl${start}-${v.type}`} label={label}>
            <span className={`inline align-baseline mr-0.5 ${v.type === 'a' ? 'text-sky-600' : 'text-yellow-700'}`}>
              {v.type === 'a' ? <TextALeft /> : <TextBLeft />}
            </span>
          </BracketTip>
        )
      }
    }

    const seg = text.slice(start, end)
    const variant = variants.find(v => v.charStart <= start && v.charEnd >= end)
    const highlight = highlights.find(h => (h.charStart ?? 0) <= start && (h.charEnd ?? text.length) >= end)

    const variantClass = variant ? (variant.type === 'a' ? 'bg-sky-200' : 'bg-yellow-200') : ''
    const highlightClass = highlight ? 'bg-main/25 rounded-sm cursor-pointer hover:bg-main/40 not-italic' : ''
    const className = [variantClass, highlightClass].filter(Boolean).join(' ')

    if (highlight) {
      parts.push(
        <mark key={`s${i}`} className={className}
          onClick={e => { e.stopPropagation(); onHighlightClick(highlight.anchor) }}>
          {seg}
        </mark>
      )
    } else if (className) {
      parts.push(<span key={`s${i}`} className={className}>{seg}</span>)
    } else {
      parts.push(seg)
    }

    // Closing brackets for variants ending at this position
    for (const v of variants) {
      if (v.charEnd === end) {
        parts.push(
          <span key={`br${end}-${v.type}`}
            className={`inline align-baseline ml-0.5 ${v.type === 'a' ? 'text-sky-600' : 'text-yellow-700'}`}>
            {v.type === 'a' ? <TextARight /> : <TextBRight />}
          </span>
        )
      }
    }
  }

  return <span data-line-text>{parts}</span>
}

export function LineRenderer({ line, highlights = [], onHighlightClick, onClick }: {
  line: Line
  highlights?: Highlight[]
  onHighlightClick: (anchor: string) => void
  onClick: (l: Line) => void
}) {
  const variants = line.variants ?? []

  return (
    <div
      className="flex gap-3 items-center cursor-pointer hover:bg-secondary-background px-2 rounded-base transition-colors"
      onClick={() => onClick(line)}
    >
      <span className="text-xs text-muted-foreground select-none w-[7ch] shrink-0 text-right font-mono self-center py-0.5">
        {line.id}
      </span>
      <span className={`leading-relaxed flex-1 py-0.5 ${line.ana !== 'prose' ? 'pl-6' : ''}`}>
        {renderText(line.text, highlights, variants, onHighlightClick)}
      </span>
    </div>
  )
}
