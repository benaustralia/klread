import { useState, useEffect, useRef, useCallback } from 'react'
import React from 'react'
import { LineRenderer, type Line, type NotePosition } from './LineRenderer'
import { NotesSheet } from './NotesSheet'

export type SceneData = { num: number; lines: Line[]; location?: string; synopsis?: string }
export type ActData = { num: number; scenes: SceneData[] }
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V']

const SHORT: Record<string, string> = {
  "King Lear's palace": "Lear's palace",
  "The Earl of Gloucester's castle": "Gloucester's castle",
  "The Duke of Albany's palace": "Albany's palace",
  "A hall in The Duke of Albany's palace": "A hall in Albany's palace",
  "Before the Duke of Albany's palace": "Before Albany's palace",
  "Before the Earl of Gloucester's castle": "Before Gloucester's castle",
  "The open country": "Open country",
  "The heath": "The heath",
  "The heath. Before a hovel": "Heath / hovel",
  "Gloucester's castle": "Gloucester's castle",
  "A farmhouse near Gloucester's castle": "Farmhouse",
  "The French camp near Dover": "French camp",
  "A tent in the French camp near Dover": "Tent, French camp",
  "The country near Dover": "Near Dover",
  "The British camp near Dover": "British camp",
  "A field between the two camps": "The battlefield",
}
export function shortLocation(loc: string) { return SHORT[loc] ?? loc }

export function TextReader({ acts, showVariants, studentId, studentName, initials, actNum, sceneNum, onBookmark, scrollToLineId }: {
  acts: ActData[]; showVariants: boolean; studentId: string; studentName: string; initials: string;
  actNum: number; sceneNum: number; onBookmark?: (lineId: string) => void; scrollToLineId?: string;
}) {
  const [selected, setSelected] = useState<Line | null>(null)
  const [open, setOpen] = useState(false)
  const [annotated, setAnnotated] = useState<Map<string, { pos: NotePosition; anchor: string }>>(new Map())
  const [teacherAnnotated, setTeacherAnnotated] = useState<Map<string, { pos: NotePosition; anchor: string; initials: string }>>(new Map())
  const scrolledRef = useRef(false)
  const allLineIds = acts.flatMap(a => a.scenes.flatMap(s => s.lines.map(l => l.id)))

  useEffect(() => {
    fetch(`/api/notes?studentId=${studentId}`)
      .then(r => r.json())
      .then((notes: { lineId: string; lineIdTo?: string }[]) => {
        const map = new Map<string, { pos: NotePosition; anchor: string }>()
        notes.forEach(n => {
          if (n.lineIdTo && n.lineIdTo !== n.lineId) {
            const from = allLineIds.indexOf(n.lineId), to = allLineIds.indexOf(n.lineIdTo)
            if (from !== -1 && to !== -1) {
              allLineIds.slice(from, to + 1).forEach((id, i, arr) => {
                const pos: NotePosition = i === 0 ? 'start' : i === arr.length - 1 ? 'end' : 'mid'
                if (!map.has(id) || pos === 'start') map.set(id, { pos, anchor: n.lineId })
              })
            }
          } else {
            if (!map.has(n.lineId)) map.set(n.lineId, { pos: 'solo', anchor: n.lineId })
          }
        })
        setAnnotated(map)
      }).catch(() => {})
  }, [studentId])

  // Scroll to bookmark on first render of this act/scene
  useEffect(() => {
    if (!scrollToLineId) return
    scrolledRef.current = false
  }, [scrollToLineId])

  useEffect(() => {
    if (!scrollToLineId || scrolledRef.current) return
    const el = document.querySelector(`[data-line-id="${scrollToLineId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      scrolledRef.current = true
    }
  })

  // Debounced scroll handler — report topmost visible speech line
  const bookmarkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleScroll = useCallback(() => {
    if (!onBookmark) return
    if (bookmarkTimer.current) clearTimeout(bookmarkTimer.current)
    bookmarkTimer.current = setTimeout(() => {
      const els = document.querySelectorAll<HTMLElement>('[data-line-id]')
      for (const el of els) {
        const rect = el.getBoundingClientRect()
        if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
          onBookmark(el.dataset.lineId!)
          break
        }
      }
    }, 1500)
  }, [onBookmark])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  useEffect(() => {
    fetch('/api/notes?teacherNotes=1')
      .then(r => r.json())
      .then((notes: { lineId: string; lineIdTo?: string; initials: string }[]) => {
        const map = new Map<string, { pos: NotePosition; anchor: string; initials: string }>()
        notes.forEach(n => {
          if (n.lineIdTo && n.lineIdTo !== n.lineId) {
            const from = allLineIds.indexOf(n.lineId), to = allLineIds.indexOf(n.lineIdTo)
            if (from !== -1 && to !== -1) {
              allLineIds.slice(from, to + 1).forEach((id, i, arr) => {
                const pos: NotePosition = i === 0 ? 'start' : i === arr.length - 1 ? 'end' : 'mid'
                if (!map.has(id) || pos === 'start') map.set(id, { pos, anchor: n.lineId, initials: n.initials })
              })
            }
          } else {
            if (!map.has(n.lineId)) map.set(n.lineId, { pos: 'solo', anchor: n.lineId, initials: n.initials })
          }
        })
        setTeacherAnnotated(map)
      }).catch(() => {})
  }, [])

  useEffect(() => {
    document.title = `Act ${ROMAN[actNum]} · Scene ${sceneNum} — King Lear Promptbook`
    return () => { document.title = 'King Lear Promptbook' }
  }, [actNum, sceneNum])

  function onNotesSaved(lineId: string) {
    setAnnotated(prev => {
      const next = new Map(prev)
      if (!next.has(lineId)) next.set(lineId, { pos: 'solo', anchor: lineId })
      return next
    })
  }

  const currentScene = acts.find(a => a.num === actNum)?.scenes.find(s => s.num === sceneNum)

  return (
    <>
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
            <div key={line.id} data-line-id={!isStage ? line.id : undefined}>
              {showSpk && <p className="speaker-label">{line.speaker}</p>}
              {isStage
                ? (line.stageType !== 'delivery' && <p className="text-sm italic text-muted-foreground px-2 py-0.5 my-1">{line.text}</p>)
                : <LineRenderer line={line} showVariants={showVariants}
                    initials={annotated.has(line.id) ? initials : undefined} notePosition={annotated.get(line.id)?.pos}
                    teacherInitials={teacherAnnotated.get(line.id)?.initials} teacherNotePosition={teacherAnnotated.get(line.id)?.pos}
                    onClick={l => {
                      const entry = annotated.get(l.id)
                      const teacherEntry = teacherAnnotated.get(l.id)
                      const anchorId = entry?.anchor ?? teacherEntry?.anchor ?? l.id
                      const anchorLine = acts.flatMap(a => a.scenes.flatMap(s => s.lines)).find(x => x.id === anchorId) ?? l
                      setSelected(anchorLine); setOpen(true)
                    }} />}
            </div>
          )
          return acc
        }, { el: [], last: undefined }).el}
      </div>

      <NotesSheet line={selected} open={open} onOpenChange={setOpen} studentId={studentId} studentName={studentName} onSaved={onNotesSaved} />
    </>
  )
}
