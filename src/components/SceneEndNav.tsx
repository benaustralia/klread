import { Button } from '@/components/ui/button'
import { type ActData, ROMAN, shortLocation } from './TextReader'

type FlatScene = { actNum: number; sceneNum: number; location?: string }

export function SceneEndNav({ acts, actNum, sceneNum, onGoTo }: {
  acts: ActData[]
  actNum: number
  sceneNum: number
  onGoTo: (a: number, s: number) => void
}) {
  const flat: FlatScene[] = acts.flatMap(a => a.scenes.map(s => ({ actNum: a.num, sceneNum: s.num, location: s.location })))
  const idx = flat.findIndex(s => s.actNum === actNum && s.sceneNum === sceneNum)
  const prev = idx > 0 ? flat[idx - 1] : null
  const next = idx < flat.length - 1 ? flat[idx + 1] : null

  return (
    <div className="max-w-3xl mx-auto mt-12 mb-8 border-t-2 border-border pt-6 flex flex-row justify-between gap-3">
      {prev && (
        <Button
          variant="neutral"
          className="justify-start gap-2"
          onClick={() => { onGoTo(prev.actNum, prev.sceneNum); window.scrollTo({ top: 0 }) }}
        >
          <span className="font-mono text-xs opacity-70">← Prev</span>
          <span>Act {ROMAN[prev.actNum]}, Scene {prev.sceneNum}</span>
          {prev.location && <span className="font-normal opacity-70 text-xs">{shortLocation(prev.location)}</span>}
        </Button>
      )}
      {next && (
        <Button
          variant="default"
          className={`justify-start gap-2 ${!prev ? 'ml-auto' : ''}`}
          onClick={() => { onGoTo(next.actNum, next.sceneNum); window.scrollTo({ top: 0 }) }}
        >
          <span className="font-mono text-xs opacity-70">Next →</span>
          <span>Act {ROMAN[next.actNum]}, Scene {next.sceneNum}</span>
          {next.location && <span className="font-normal opacity-70 text-xs">{shortLocation(next.location)}</span>}
        </Button>
      )}
    </div>
  )
}
