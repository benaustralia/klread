import React, { useState, useEffect, useRef } from 'react'
import { LineRenderer, type Line, type Highlight } from './LineRenderer'
import { NotesSheet } from './NotesSheet'
import { SceneEndNav } from './SceneEndNav'

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
  "The open country": "Open country", "The heath": "The heath",
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

type NoteRaw = { lineId: string; lineIdTo?: string; charStart?: number; charEnd?: number }

function buildHighlightMap(notes: NoteRaw[], ids: string[]): Map<string, Highlight[]> {
  const map = new Map<string, Highlight[]>()
  const add = (id: string, h: Highlight) => map.set(id, [...(map.get(id) ?? []), h])
  for (const n of notes) {
    if (n.charStart !== undefined && n.charEnd !== undefined) {
      add(n.lineId, { charStart: n.charStart, charEnd: n.charEnd, anchor: n.lineId })
    } else if (n.lineIdTo && n.lineIdTo !== n.lineId) {
      const from = ids.indexOf(n.lineId), to = ids.indexOf(n.lineIdTo)
      if (from !== -1 && to !== -1) ids.slice(from, to + 1).forEach(id => add(id, { anchor: n.lineId }))
    } else add(n.lineId, { anchor: n.lineId })
  }
  return map
}

function getSelection(): { lineId: string; charStart: number; charEnd: number } | null {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || !sel.toString().trim()) return null
  let el: Element | null = sel.getRangeAt(0).commonAncestorContainer as Element
  if (el.nodeType === Node.TEXT_NODE) el = el.parentElement
  while (el && !el.hasAttribute?.('data-line-id')) el = el.parentElement
  if (!el) return null
  const text = el.querySelector('[data-line-text]')?.textContent ?? ''
  const trimmed = sel.toString().trim()
  const start = text.indexOf(trimmed)
  return start === -1 ? null : { lineId: el.getAttribute('data-line-id')!, charStart: start, charEnd: start + trimmed.length }
}

export function TextReader({ acts, studentId, studentName, actNum, sceneNum, onBookmark, scrollToLineId, highlightLineId, onGoTo, textSize = 'base', joinCode, isTeacher }: {
  acts: ActData[]; studentId: string; studentName: string
  actNum: number; sceneNum: number; onBookmark?: (lineId: string) => void
  scrollToLineId?: string; highlightLineId?: string; onGoTo?: (a: number, s: number) => void; textSize?: 'base' | 'lg' | 'xl'
  joinCode?: string; isTeacher?: boolean
}) {
  const [selected, setSelected] = useState<Line | null>(null)
  const [selRange, setSelRange] = useState<{ charStart: number; charEnd: number } | undefined>()
  const [open, setOpen] = useState(false)
  const [highlights, setHighlights] = useState<Map<string, Highlight[]>>(new Map())
  const [teacherHl, setTeacherHl] = useState<Map<string, Highlight[]>>(new Map())
  const [refreshKey, setRefreshKey] = useState(0)
  const scrolledRef = useRef(false)
  const selHandled = useRef(false)
  const bmTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const allLineIds = acts.flatMap(a => a.scenes.flatMap(s => s.lines.map(l => l.id)))
  const allLines = acts.flatMap(a => a.scenes.flatMap(s => s.lines))

  useEffect(() => {
    fetch(`/api/notes?studentId=${studentId}`).then(r => r.json())
      .then((n: NoteRaw[]) => setHighlights(buildHighlightMap(n, allLineIds))).catch(() => {})
  }, [studentId, refreshKey])

  useEffect(() => {
    const qs = joinCode ? `&forClass=${encodeURIComponent(joinCode)}` : ''
    fetch(`/api/notes?teacherNotes=1${qs}`).then(r => r.json())
      .then((n: NoteRaw[]) => setTeacherHl(buildHighlightMap(n, allLineIds))).catch(() => {})
  }, [refreshKey])

  useEffect(() => { if (scrollToLineId) scrolledRef.current = false }, [scrollToLineId])
  useEffect(() => {
    if (!scrollToLineId || scrolledRef.current) return
    const wrapper = document.querySelector(`[data-line-id="${scrollToLineId}"]`)
    if (wrapper) {
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' })
      scrolledRef.current = true
    }
  })

  const hlRef = useRef<string>(null)
  useEffect(() => {
    if (!highlightLineId || highlightLineId === hlRef.current) return
    hlRef.current = highlightLineId
    const tryHighlight = () => {
      const wrapper = document.querySelector(`[data-line-id="${highlightLineId}"]`)
      if (!wrapper) return false
      const target = wrapper.querySelector('[data-line-text]')?.closest('div') ?? wrapper
      target.classList.add('search-highlight')
      setTimeout(() => target.classList.remove('search-highlight'), 2500)
      return true
    }
    if (!tryHighlight()) setTimeout(tryHighlight, 200)
  }, [highlightLineId])

  useEffect(() => {
    if (!onBookmark) return
    const h = () => {
      if (bmTimer.current) clearTimeout(bmTimer.current)
      bmTimer.current = setTimeout(() => {
        for (const el of document.querySelectorAll<HTMLElement>('[data-line-id]')) {
          const { top, bottom } = el.getBoundingClientRect()
          if (top >= 0 && bottom <= window.innerHeight) { onBookmark(el.dataset.lineId!); break }
        }
      }, 1500)
    }
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [onBookmark])

  useEffect(() => {
    document.title = `Act ${ROMAN[actNum]} · Scene ${sceneNum} — King Lear Promptbook`
    return () => { document.title = 'King Lear Promptbook' }
  }, [actNum, sceneNum])

  function handlePointerUp(e: React.PointerEvent) {
    selHandled.current = false
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const sel = getSelection()
    if (!sel) return
    const line = allLines.find(l => l.id === sel.lineId)
    if (!line) return
    selHandled.current = true
    setSelected(line); setSelRange({ charStart: sel.charStart, charEnd: sel.charEnd }); setOpen(true)
    window.getSelection()?.removeAllRanges()
  }

  function openNote(line: Line) {
    if (selHandled.current) return
    setSelected(line); setSelRange(undefined); setOpen(true)
  }
  function openHl(anchor: string) {
    const line = allLines.find(l => l.id === anchor)
    if (line) { setSelected(line); setSelRange(undefined); setOpen(true) }
  }

  const scene = acts.find(a => a.num === actNum)?.scenes.find(s => s.num === sceneNum)

  return (
    <>
      <div className="max-w-3xl mx-auto py-4" style={{ zoom: { base: 1, lg: 1.15, xl: 1.3 }[textSize] }} onPointerUp={handlePointerUp}>
        {scene?.location && (
          <div className="mb-6 border-b pb-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">
              Act {ROMAN[actNum]} · Scene {sceneNum}</p>
            <p className="font-semibold">{scene.location}</p>
            {scene.synopsis && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{scene.synopsis}</p>}
          </div>)}
        {scene?.lines.reduce<{ el: React.ReactElement[]; last: string | undefined }>((acc, line) => {
          const isStage = line.type === 'stage'
          const showSpk = !isStage && line.speaker && line.speaker !== acc.last
          if (!isStage) acc.last = line.speaker
          acc.el.push(
            <div key={line.id} data-line-id={!isStage ? line.id : undefined}>
              {showSpk && <p className="speaker-label">{line.speaker}</p>}
              {isStage
                ? (line.stageType !== 'delivery' && <p className="text-sm italic text-muted-foreground px-2 py-0.5 my-1">{line.text}</p>)
                : <LineRenderer line={line}
                    highlights={[...(highlights.get(line.id) ?? []), ...(teacherHl.get(line.id) ?? [])]}
                    onHighlightClick={openHl} onClick={openNote} />}
            </div>)
          return acc
        }, { el: [], last: undefined }).el}
        {onGoTo && <SceneEndNav acts={acts} actNum={actNum} sceneNum={sceneNum} onGoTo={onGoTo} />}
      </div>
      <NotesSheet line={selected} allLines={allLines} open={open} onOpenChange={setOpen}
        studentId={studentId} studentName={studentName} joinCode={joinCode} isTeacher={isTeacher}
        charStart={selRange?.charStart} charEnd={selRange?.charEnd} onSaved={() => setRefreshKey(k => k + 1)} />
    </>
  )
}
