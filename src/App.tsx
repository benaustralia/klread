import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BrokenCrown } from './components/BrokenCrown'
import { TextReader } from './components/TextReader'
import { SearchDialog } from './components/SearchDialog'
import { LoginCard } from './components/LoginCard'
import { TeacherView } from './components/TeacherView'
import { ReadingHeader } from './components/ReadingHeader'
import { AllNotesSheet } from './components/AllNotesSheet'
import learData from './data/king-lear.json'

type Session = {
  studentId: string; studentName: string; joinCode: string
  initials: string; isTeacher: boolean; bookmarkLineId?: string
}

const KEY = 'klread_session'
const LAST_KEY = 'klread_last'
const stored = (): Session | null => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null }
}
const lastUsed = (): { name: string; code: string } | null => {
  try { return JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null') } catch { return null }
}

export default function App() {
  if (new URLSearchParams(location.search).has('logout')) {
    localStorage.removeItem(KEY)
    location.replace('/')
  }

  const isTeacher = location.pathname === '/teacher'
  const [session, setSession] = useState<Session | null>(stored)
  const [actNum, setActNum] = useState(1)
  const [sceneNum, setSceneNum] = useState(1)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [scrollToLineId, setScrollToLineId] = useState<string | undefined>()
  const [searchOpen, setSearchOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [textSize, setTextSize] = useState<'base' | 'lg' | 'xl'>('base')
  const sizes: ('base' | 'lg' | 'xl')[] = ['base', 'lg', 'xl']
  const [name, setName] = useState(() => lastUsed()?.name ?? '')
  const [code, setCode] = useState(() => lastUsed()?.code ?? '')
  const [initials, setInitials] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const pct = el.scrollTop / (el.scrollHeight - el.clientHeight) * 100
      setScrollProgress(isNaN(pct) ? 0 : Math.round(pct))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function applyBookmark(lineId: string) {
    const [a, s] = lineId.split('.').map(Number)
    if (a && s) { setActNum(a); setSceneNum(s) }
    setScrollToLineId(lineId)
  }

  const saveBookmarkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveBookmark = useCallback((lineId: string) => {
    if (!session) return
    if (saveBookmarkTimer.current) clearTimeout(saveBookmarkTimer.current)
    saveBookmarkTimer.current = setTimeout(() => {
      fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: session.studentId, bookmarkLineId: lineId }),
      }).catch(() => {})
    }, 2000)
  }, [session])

  useEffect(() => {
    const goto = new URLSearchParams(location.search).get('goto')
    if (goto && session) {
      applyBookmark(goto)
      const url = new URL(location.href)
      url.searchParams.delete('goto')
      history.replaceState(null, '', url)
    }
  }, [])

  useEffect(() => {
    if (!session) return
    const url = `/api/sessions?code=${encodeURIComponent(session.joinCode)}&name=${encodeURIComponent(session.studentName)}`
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const updated: Session = { ...session, isTeacher: data.isTeacher ?? false, bookmarkLineId: data.bookmarkLineId ?? session.bookmarkLineId }
        localStorage.setItem(KEY, JSON.stringify(updated))
        setSession(updated)
        if (data.bookmarkLineId) applyBookmark(data.bookmarkLineId)
      }).catch(() => {})
  }, [])

  async function join() {
    if (!name.trim() || !code.trim()) return setErr('Enter your name and join code')
    setLoading(true)
    setErr('')
    try {
      const check = await fetch(`/api/sessions?code=${encodeURIComponent(code.trim())}&name=${encodeURIComponent(name.trim())}`)
      let data: any
      if (check.ok) {
        data = await check.json()
      } else {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentName: name.trim(), joinCode: code.trim(), initials: initials.trim().slice(0, 4).toUpperCase() }),
        })
        if (res.status === 422) { setIsNew(true); setErr('Please add your initials — this is only needed once.'); return }
        if (!res.ok) { setErr('Could not join. Check your join code.'); return }
        data = await res.json()
      }
      const s: Session = {
        studentId: data.studentId, studentName: name.trim(), joinCode: code.trim(),
        initials: data.initials ?? '', isTeacher: data.isTeacher ?? false, bookmarkLineId: data.bookmarkLineId,
      }
      localStorage.setItem(KEY, JSON.stringify(s))
      localStorage.setItem(LAST_KEY, JSON.stringify({ name: name.trim(), code: code.trim() }))
      setSession(s)
      if (data.bookmarkLineId) applyBookmark(data.bookmarkLineId)
    } catch {
      setErr('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (isTeacher || session?.isTeacher) return (
    <TeacherView
      teacherKey={session?.joinCode ?? new URLSearchParams(location.search).get('key') ?? ''}
      teacherStudentId={session?.studentId}
      teacherName={session?.studentName}
    />
  )

  const goTo = (a: number, s: number) => { setActNum(a); setSceneNum(s) }
  const logout = () => { localStorage.removeItem(KEY); setSession(null) }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {session ? (
          <ReadingHeader
            left={
              <h1 className="text-lg font-bold flex items-center gap-2 flex-wrap">
                <BrokenCrown className="w-8 h-8" />
                King Lear <span className="text-main">Promptbook</span>
              </h1>
            }
            right={
              <span className="flex items-center gap-1">
                <Button variant="neutral" size="sm" className="text-xs px-2" disabled={textSize === 'base'} onClick={() => setTextSize(s => sizes[sizes.indexOf(s) - 1])}>A−</Button>
                <Button variant="neutral" size="sm" className="text-xs px-2" disabled={textSize === 'xl'} onClick={() => setTextSize(s => sizes[sizes.indexOf(s) + 1])}>A+</Button>
                <Button onClick={() => setNotesOpen(true)} variant="neutral" size="sm" className="text-xs">Notes</Button>
                <Button onClick={() => setSearchOpen(true)} variant="neutral" size="sm" className="text-xs">Search</Button>
                <Button onClick={logout} variant="neutral" size="sm" className="text-xs">Log out</Button>
              </span>
            }
            acts={learData.acts as any}
            actNum={actNum}
            sceneNum={sceneNum}
            onGoTo={goTo}
            scrollProgress={scrollProgress}
          />
        ) : (
          <div className="sticky top-0 z-10 bg-background">
            <header className="border-b px-4 py-3">
              <h1 className="text-lg font-bold flex items-center gap-2">
                <BrokenCrown className="w-8 h-8" />
                King Lear <span className="text-main">Promptbook</span>
              </h1>
            </header>
          </div>
        )}
        <main className="px-2 py-4 sm:px-6 pb-20 sm:pb-4">
          {session ? (
            <TextReader
              acts={learData.acts as any}
              studentId={session.studentId}
              studentName={session.studentName}
              actNum={actNum}
              sceneNum={sceneNum}
              onBookmark={saveBookmark}
              scrollToLineId={scrollToLineId}
              onGoTo={goTo}
              textSize={textSize}
            />
          ) : (
            <LoginCard
              name={name} setName={setName}
              code={code} setCode={setCode}
              initials={initials} setInitials={setInitials}
              isNew={isNew} loading={loading} err={err}
              onJoin={join}
            />
          )}
        </main>
      </div>
      {session && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-10 bg-background border-t flex items-center justify-around px-4 py-2">
          <Button variant="neutral" size="sm" className="text-xs px-2" disabled={textSize === 'base'} onClick={() => setTextSize(s => sizes[sizes.indexOf(s) - 1])}>A−</Button>
          <Button variant="neutral" size="sm" className="text-xs px-2" disabled={textSize === 'xl'} onClick={() => setTextSize(s => sizes[sizes.indexOf(s) + 1])}>A+</Button>
          <Button onClick={() => setNotesOpen(true)} variant="neutral" size="sm" className="text-xs">Notes</Button>
          <Button onClick={() => setSearchOpen(true)} variant="neutral" size="sm" className="text-xs">Search</Button>
          <Button onClick={logout} variant="neutral" size="sm" className="text-xs">Log out</Button>
        </div>
      )}
      {session && (
        <AllNotesSheet
          studentId={session.studentId}
          joinCode={session.joinCode}
          open={notesOpen}
          onOpenChange={setNotesOpen}
        />
      )}
      <SearchDialog
        acts={learData.acts as any}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onNavigate={(a, s, lineId) => { goTo(a, s); setSearchOpen(false); setTimeout(() => setScrollToLineId(lineId), 150) }}
      />
    </TooltipProvider>
  )
}
