import { useState, useEffect } from 'react'
import React from 'react'
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '@/components/ui/menubar'
import { LineRenderer, type Line } from './LineRenderer'
import { NotesSheet } from './NotesSheet'

type Scene = { num: number; lines: Line[]; location?: string; synopsis?: string }
type Act = { num: number; scenes: Scene[] }
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V']

const SHORT: Record<string, string> = {
  "King Lear's palace": "Lear's palace",
  "The Earl of Gloucester's castle": "Gloucester's castle",
  "The Duke of Albany's palace": "Albany's palace",
  "Before the Duke of Albany's palace": "Albany's palace",
  "Before the Earl of Gloucester's castle": "Gloucester's castle",
  "The open country": "Open country",
  "The heath": "The heath",
  "The heath. Before a hovel": "Heath / hovel",
  "Gloucester's castle": "Gloucester's castle",
  "A farmhouse near Gloucester's castle": "Farmhouse",
  "The French camp near Dover": "French camp",
  "A tent in the French camp near Dover": "French camp",
  "The country near Dover": "Near Dover",
  "The British camp near Dover": "British camp",
  "A field between the two camps": "The battlefield",
}
function shortLocation(loc: string) { return SHORT[loc] ?? loc }

export function TextReader({ acts, showVariants, studentId, studentName, initials }: { acts: Act[]; showVariants: boolean; studentId: string; studentName: string; initials: string }) {
  const [selected, setSelected] = useState<Line | null>(null)
  const [open, setOpen] = useState(false)
  const [actNum, setActNum] = useState(acts[0]?.num ?? 1)
  const [sceneNum, setSceneNum] = useState(acts[0]?.scenes[0]?.num ?? 1)
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

  function goTo(a: number, s: number) { setActNum(a); setSceneNum(s) }

  const currentScene = acts.find(a => a.num === actNum)?.scenes.find(s => s.num === sceneNum)

  return (
    <>
      <div className="flex justify-center mb-6">
        <Menubar>
          {acts.map(act => (
            <MenubarMenu key={act.num}>
              <MenubarTrigger className={actNum === act.num ? 'font-bold' : ''}>
                Act {ROMAN[act.num]}
              </MenubarTrigger>
              <MenubarContent>
                {act.scenes.map(scene => (
                  <MenubarItem
                    key={scene.num}
                    onClick={() => goTo(act.num, scene.num)}
                    className={actNum === act.num && sceneNum === scene.num ? 'font-bold' : ''}
                  >
                    <span className="mr-3">Sc. {scene.num}</span>
                    {scene.location && <span className="text-muted-foreground text-xs">{shortLocation(scene.location)}</span>}
                  </MenubarItem>
                ))}
              </MenubarContent>
            </MenubarMenu>
          ))}
        </Menubar>
      </div>

      <div className="max-w-2xl mx-auto py-4">
        {currentScene?.location && (
          <div className="mb-6 border-b pb-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Act {ROMAN[actNum]} · Scene {sceneNum}</p>
            <p className="font-semibold">{currentScene.location}</p>
            {currentScene.synopsis && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{currentScene.synopsis}</p>}
          </div>
        )}
        {currentScene?.lines.reduce<{ el: React.ReactElement[]; last: string | undefined }>((acc, line) => {
          const isStage = line.type === 'stage'
          const showSpk = !isStage && line.speaker && line.speaker !== acc.last
          if (!isStage) acc.last = line.speaker
          acc.el.push(
            <div key={line.id}>
              {showSpk && <p className="speaker-label">{line.speaker}</p>}
              {isStage
                ? <p className="text-sm italic text-muted-foreground px-2 py-0.5 my-1">{line.text}</p>
                : <LineRenderer line={line} showVariants={showVariants} initials={annotated.has(line.id) ? initials : undefined} onClick={l => { setSelected(l); setOpen(true) }} />}
            </div>
          )
          return acc
        }, { el: [], last: undefined }).el}
      </div>

      <NotesSheet line={selected} open={open} onOpenChange={setOpen} studentId={studentId} studentName={studentName} onSaved={onNotesSaved} />
    </>
  )
}
