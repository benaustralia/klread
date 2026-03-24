import { useState, useEffect } from 'react'
import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineRenderer, type Line } from './LineRenderer'
import { NotesSheet } from './NotesSheet'

type Scene = { num: number; lines: Line[] }
type Act = { num: number; scenes: Scene[] }
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V']

export function TextReader({ acts, showVariants, studentId, studentName, initials }: { acts: Act[]; showVariants: boolean; studentId: string; studentName: string; initials: string }) {
  const [selected, setSelected] = useState<Line | null>(null)
  const [open, setOpen] = useState(false)
  const [sceneTab, setSceneTab] = useState<Record<number, string>>({})
  const [annotated, setAnnotated] = useState<Set<string>>(new Set())

  useEffect(() => {
    const allLineIds = acts.flatMap(a => a.scenes.flatMap(s => s.lines.map(l => l.id)))
    fetch(`/api/notes?studentId=${studentId}`)
      .then(r => r.json())
      .then((notes: { lineId: string; lineIdTo?: string }[]) => {
        const ids = new Set<string>()
        notes.forEach(n => {
          ids.add(n.lineId)
          if (n.lineIdTo) {
            const from = allLineIds.indexOf(n.lineId), to = allLineIds.indexOf(n.lineIdTo)
            if (from !== -1 && to !== -1) allLineIds.slice(from, to + 1).forEach(id => ids.add(id))
          }
        })
        setAnnotated(ids)
      }).catch(() => {})
  }, [studentId])

  function onNotesSaved(lineId: string) {
    setAnnotated(prev => new Set([...prev, lineId]))
  }

  return (
    <>
      <Tabs defaultValue="1" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          {acts.map(a => <TabsTrigger key={a.num} value={String(a.num)}>Act {ROMAN[a.num]}</TabsTrigger>)}
        </TabsList>
        {acts.map(act => (
          <TabsContent key={act.num} value={String(act.num)}>
            <Tabs value={sceneTab[act.num] ?? String(act.scenes[0]?.num)} onValueChange={v => setSceneTab(p => ({ ...p, [act.num]: v }))}>
              <TabsList className="mb-4 flex-wrap h-auto gap-1">
                {act.scenes.map(s => <TabsTrigger key={s.num} value={String(s.num)}>Scene {s.num}</TabsTrigger>)}
              </TabsList>
              {act.scenes.map(scene => (
                <TabsContent key={scene.num} value={String(scene.num)}>
                  <div className="max-w-2xl py-4">
                    {scene.lines.reduce<{ el: React.ReactElement[]; last: string | undefined }>((acc, line) => {
                      const showSpk = line.speaker && line.speaker !== acc.last
                      acc.last = line.speaker
                      acc.el.push(
                        <div key={line.id}>
                          {showSpk && <p className="mt-4 mb-1 text-xs font-sans uppercase tracking-widest font-bold border-b pb-1">{line.speaker}</p>}
                          <LineRenderer line={line} showVariants={showVariants} initials={annotated.has(line.id) ? initials : undefined} onClick={l => { setSelected(l); setOpen(true) }} />
                        </div>
                      )
                      return acc
                    }, { el: [], last: undefined }).el}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>
      <NotesSheet line={selected} open={open} onOpenChange={setOpen} studentId={studentId} studentName={studentName} onSaved={onNotesSaved} />
    </>
  )
}
