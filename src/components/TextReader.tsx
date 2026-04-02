import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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

type NoteRaw = { lineId: string; lineIdTo?: string; charStart?: number; charEnd?: number }
type TeacherNoteRaw = NoteRaw & { initials?: string }

function buildHighlightMap(notes: NoteRaw[], allLineIds: string[]): Map<string, Highlight[]> {
  const map = new Map<string, Highlight[]>()
  const add = (id: string, h: Highlight) => { map.set(id, [...(map.get(id) ?? []), h]) }
  for (const n of notes) {
    const anchor = n.lineId
    if (n.charStart !== undefined && n.charEnd !== undefined) {
      add(n.lineId, { charStart: n.charStart, charEnd: n.charEnd, anchor })
    } else if (n.lineIdTo && n.lineIdTo !== n.lineId) {
      const from = allLineIds.indexOf(n.lineId)
      const to = allLineIds.indexOf(n.lineIdTo)
      if (from !== -1 && to !== -1)
        allLineIds.slice(from, to + 1).forEach(id => add(id, { anchor }))
    } else {
      add(n.lineId, { anchor })
    }
  }
  return map
}

// Detect which line was selected and compute char offsets within line.text
function getSelection(): { lineId: string; charStart: number; charEnd: number } | null {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed) return null
  const raw = sel.toString()
  if (!raw.trim()) return null

  let el: Element | null = sel.getRangeAt(0).commonAncestorContainer as Element
  if (el.nodeType === Node.TEXT_NODE) el = el.parentElement
  while (el && !el.hasAttribute?.('data-line-id')) el = el.parentElement
  if (!el) return null

  const lineId = el.getAttribute('data-line-id')!
  const textSpan = el.querySelector('[data-line-text]')
  if (!textSpan) return null
  const lineText = textSpan.textContent ?? ''
  const trimmed = raw.trim()
  const charStart = lineText.indexOf(trimmed)
  if (charStart === -1) return null
  return { lineId, charStart, charEnd: charStart + trimmed.length }
}

export function TextReader({ acts, studentId, studentName, actNum, sceneNum, onBookmark, scrollToLineId, onGoTo, textSize = 'base' }: {
  acts: ActData[]
  studentId: string
  studentName: string
  actNum: number
  sceneNum: number
  onBookmark?: (lineId: string) => void
  scrollToLineId?: string
  onGoTo?: (a: number, s: number) => void
  textSize?: 'base' | 'lg' | 'xl'
}) {
  const [selected, setSelected] = useState<Line | null>(null)
  const [selectionRange, setSelectionRange] = useState<{ charStart: number; charEnd: number } | undefined>()
  const [open, setOpen] = useState(false)
  const [highlights, setHighlights] = useState<Map<string, Highlight[]>>(new Map())
  const [teacherHighlights, setTeacherHighlights] = useState<Map<string, Highlight[]>>(new Map())
  const [refreshKey, setRefreshKey] = useState(0)
  const scrolledRef = useRef(false)
  const selectionHandledRef = useRef(false)

  const allLineIds = useMemo(() => acts.flatMap(a => a.scenes.flatMap(s => s.lines.map(l => l.id))), [acts])
  const allLines = useMemo(() => acts.flatMap(a => a.scenes.flatMap(s => s.lines)), [acts])

  useEffect(() => {
    fetch(`/api/notes?studentId=${studentId}`)
      .then(r => r.json())
      .then((notes: NoteRaw[]) => setHighlights(buildHighlightMap(notes, allLineIds)))
      .catch(() => {})
  }, [studentId, refreshKey])

  useEffect(() => {
    fetch('/api/notes?teacherNotes=1')
      .then(r => r.json())
      .then((notes: TeacherNoteRaw[]) => setTeacherHighlights(buildHighlightMap(notes, allLineIds)))
      .catch(() => {})
  }, [refreshKey])

  useEffect(() => { if (scrollToLineId) scrolledRef.current = false }, [scrollToLineId])
  useEffect(() => {
    if (!scrollToLineId || scrolledRef.current) return
    const el = document.querySelector(`[data-line-id="${scrollToLineId}"]`)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); scrolledRef.current = true }
  })

  const bookmarkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleScroll = useCallback(() => {
    if (!onBookmark) return
    if (bookmarkTimer.current) clearTimeout(bookmarkTimer.current)
    bookmarkTimer.current = setTimeout(() => {
      for (const el of document.querySelectorAll<HTMLElement>('[data-line-id]')) {
        const { top, bottom } = el.getBoundingClientRect()
        if (top >= 0 && bottom <= window.innerHeight) { onBookmark(el.dataset.lineId!); break }
      }
    }, 1500)
  }, [onBookmark])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  useEffect(() => {
    document.title = `Act ${ROMAN[actNum]} · Scene ${sceneNum} — King Lear Promptbook`
    return () => { document.title = 'King Lear Promptbook' }
  }, [actNum, sceneNum])

  // Detect text selection on pointer release — opens NotesSheet with selection pre-loaded.
  // Sets selectionHandledRef so the subsequent click event doesn't clobber the char range.
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    selectionHandledRef.current = false
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const sel = getSelection()
    if (!sel) return
    const line = allLines.find(l => l.id === sel.lineId)
    if (!line) return
    selectionHandledRef.current = true
    setSelected(line)
    setSelectionRange({ charStart: sel.charStart, charEnd: sel.charEnd })
    setOpen(true)
    window.getSelection()?.removeAllRanges()
  }, [allLines])

  function openNote(line: Line) {
    if (selectionHandledRef.current) return  // selection already handled this event cycle
    setSelected(line)
    setSelectionRange(undefined)
    setOpen(true)
  }

  function openHighlightNote(anchor: string) {
    const line = allLines.find(l => l.id === anchor)
    if (line) { setSelected(line); setSelectionRange(undefined); setOpen(true) }
  }

  const currentScene = acts.find(a => a.num === actNum)?.scenes.find(s => s.num === sceneNum)

  return (
    <>
      <div className={`max-w-3xl mx-auto py-4 ${{ base: '', lg: 'text-lg', xl: 'text-xl' }[textSize]}`} onPointerUp={handlePointerUp}>
        {currentScene?.location && (
          <div className="mb-6 border-b pb-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">
              Act {ROMAN[actNum]} · Scene {sceneNum}
            </p>
            <p className="font-semibold">{currentScene.location}</p>
            {currentScene.synopsis && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{currentScene.synopsis}</p>
            )}
          </div>
        )}
        {currentScene?.lines.reduce<{ el: React.ReactElement[]; last: string | undefined }>((acc, line) => {
          const isStage = line.type === 'stage'
          const showSpk = !isStage && line.speaker && line.speaker !== acc.last
          if (!isStage) acc.last = line.speaker
          const lineHighlights = [
            ...(highlights.get(line.id) ?? []),
            ...(teacherHighlights.get(line.id) ?? []),
          ]
          acc.el.push(
            <div key={line.id} data-line-id={!isStage ? line.id : undefined}>
              {showSpk && <p className="speaker-label">{line.speaker}</p>}
              {isStage
                ? (line.stageType !== 'delivery' && (
                    <p className="text-sm italic text-muted-foreground px-2 py-0.5 my-1">{line.text}</p>
                  ))
                : <LineRenderer
                    line={line}
                    highlights={lineHighlights}
                    onHighlightClick={openHighlightNote}
                    onClick={openNote}
                  />}
            </div>
          )
          return acc
        }, { el: [], last: undefined }).el}
        {onGoTo && <SceneEndNav acts={acts} actNum={actNum} sceneNum={sceneNum} onGoTo={onGoTo} />}
      </div>
      <NotesSheet
        line={selected}
        allLines={allLines}
        open={open}
        onOpenChange={setOpen}
        studentId={studentId}
        studentName={studentName}
        charStart={selectionRange?.charStart}
        charEnd={selectionRange?.charEnd}
        onSaved={() => setRefreshKey(k => k + 1)}
      />
    </>
  )
}
