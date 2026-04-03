import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { type ActData, ROMAN } from './TextReader'

type Result = { lineId: string; actNum: number; sceneNum: number; speaker?: string; text: string }

export function SearchDialog({ acts, open, onOpenChange, onNavigate }: {
  acts: ActData[]
  open: boolean
  onOpenChange: (v: boolean) => void
  onNavigate: (actNum: number, sceneNum: number, lineId: string) => void
}) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 3) return []
    const out: Result[] = []
    for (const act of acts) {
      for (const scene of act.scenes) {
        for (const line of scene.lines) {
          if (line.type === 'stage') continue
          if (line.text.toLowerCase().includes(q) || line.speaker?.toLowerCase().includes(q))
            out.push({ lineId: line.id, actNum: act.num, sceneNum: scene.num, speaker: line.speaker, text: line.text.slice(0, 80) })
        }
      }
    }
    return out
  }, [query, acts])

  function go(r: Result) {
    onNavigate(r.actNum, r.sceneNum, r.lineId)
    setQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) setQuery('') }}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Search the text</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        {results.length > 0 && (
          <div className="overflow-y-auto max-h-80 flex flex-col gap-1 mt-1">
            {results.map(r => (
              <button
                key={r.lineId}
                onClick={() => go(r)}
                className="text-left border-2 border-border rounded-base px-3 py-2 bg-secondary-background hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none shadow-shadow transition-all"
              >
                <span className="text-xs font-mono text-muted-foreground block">
                  Act {ROMAN[r.actNum]} · Sc.{r.sceneNum} · {r.lineId}
                  {r.speaker && <> · <span className="uppercase">{r.speaker}</span></>}
                </span>
                <span className="text-sm">{r.text}</span>
              </button>
            ))}
          </div>
        )}
        {query.trim().length >= 3 && results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No matches found.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
