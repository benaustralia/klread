import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BrokenCrown } from './components/BrokenCrown'
import { TextReader } from './components/TextReader'
import { SearchDialog } from './components/SearchDialog'
import { LoginCard } from './components/LoginCard'
import { TeacherView } from './components/TeacherView'
import { ReadingHeader } from './components/ReadingHeader'
import { AllNotesSheet } from './components/AllNotesSheet'
import { learPromise } from './data/lear'

type Session = {
  studentId: string; studentName: string; joinCode: string
  initials: string; isTeacher: boolean; bookmarkLineId?: string
}
const KEY = 'klread_session'
const LAST_KEY = 'klread_last'
const stored = (): Session | null => { try { return JSON.parse(localStorage.getItem(KEY)!) } catch { return null } }
const lastUsed = () => { try { return JSON.parse(localStorage.getItem(LAST_KEY)!) as { name: string; code: string } } catch { return null } }
const subScroll = (cb: () => void) => { window.addEventListener('scroll', cb, { passive: true }); return () => window.removeEventListener('scroll', cb) }
const getScroll = () => Math.round(document.documentElement.scrollTop / (document.documentElement.scrollHeight - document.documentElement.clientHeight) * 100) || 0

export default function App() {
  if (new URLSearchParams(location.search).has('logout')) { localStorage.removeItem(KEY); location.replace('/') }

  const [learData, setLearData] = useState<any>(null)
  const [session, setSession] = useState<Session | null>(stored)
  const [actNum, setActNum] = useState(1)
  const [sceneNum, setSceneNum] = useState(1)
  const scrollProgress = useSyncExternalStore(subScroll, getScroll)
  const [scrollToLineId, setScrollToLineId] = useState<string | undefined>()
  const [searchOpen, setSearchOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [textSize, setTextSize] = useState<'base' | 'lg' | 'xl'>('base')
  const [name, setName] = useState(() => lastUsed()?.name ?? '')
  const [code, setCode] = useState(() => lastUsed()?.code ?? '')
  const [initials, setInitials] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const bmTimer = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => { learPromise.then(setLearData) }, [])

  function applyBookmark(id: string) {
    const [a, s] = id.split('.').map(Number)
    if (a && s) { setActNum(a); setSceneNum(s) }
    setScrollToLineId(id)
  }

  function saveBookmark(lineId: string) {
    if (!session) return
    if (bmTimer.current) clearTimeout(bmTimer.current)
    bmTimer.current = setTimeout(() => {
      fetch('/api/sessions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: session.studentId, bookmarkLineId: lineId }),
      }).catch(() => {})
    }, 2000)
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => {
    const goto = new URLSearchParams(location.search).get('goto')
    if (goto && session) {
      applyBookmark(goto)
      const url = new URL(location.href); url.searchParams.delete('goto')
      history.replaceState(null, '', url)
      return
    }
    if (!session) return
    fetch(`/api/sessions?code=${encodeURIComponent(session.joinCode)}&name=${encodeURIComponent(session.studentName)}`)
      .then(r => r.ok ? r.json() : null).then(data => {
        if (!data) return
        const updated = { ...session, isTeacher: data.isTeacher ?? false, bookmarkLineId: data.bookmarkLineId ?? session.bookmarkLineId }
        localStorage.setItem(KEY, JSON.stringify(updated)); setSession(updated)
        if (data.bookmarkLineId) applyBookmark(data.bookmarkLineId)
      }).catch(() => {})
  }, [])

  async function join() {
    if (!name.trim() || !code.trim()) return setErr('Enter your name and join code')
    setLoading(true); setErr('')
    const [n, c] = [name.trim(), code.trim()]
    try {
      const r1 = await fetch(`/api/sessions?code=${encodeURIComponent(c)}&name=${encodeURIComponent(n)}`)
      let data: any
      if (r1.ok) { data = await r1.json() } else {
        const r2 = await fetch('/api/sessions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentName: n, joinCode: c, initials: initials.trim().slice(0, 4).toUpperCase() }),
        })
        if (r2.status === 422) { setIsNew(true); return setErr('Please add your initials — this is only needed once.') }
        if (!r2.ok) return setErr('Could not join. Check your join code.')
        data = await r2.json()
      }
      const s: Session = { studentId: data.studentId, studentName: n, joinCode: c,
        initials: data.initials ?? '', isTeacher: data.isTeacher ?? false, bookmarkLineId: data.bookmarkLineId }
      localStorage.setItem(KEY, JSON.stringify(s))
      localStorage.setItem(LAST_KEY, JSON.stringify({ name: n, code: c }))
      setSession(s)
      if (data.bookmarkLineId) applyBookmark(data.bookmarkLineId)
    } catch { setErr('Network error') }
    finally { setLoading(false) }
  }

  if (location.pathname === '/teacher' || session?.isTeacher) return (
    <TeacherView teacherKey={session?.joinCode ?? new URLSearchParams(location.search).get('key') ?? ''}
      teacherStudentId={session?.studentId} teacherName={session?.studentName} />
  )

  const goTo = (a: number, s: number) => { setActNum(a); setSceneNum(s) }
  const sizes = ['base', 'lg', 'xl'] as const
  const cycleSize = (dir: -1 | 1) => () => setTextSize(s => sizes[sizes.indexOf(s) + dir])
  const toolbar = <>
    <Button variant="neutral" size="sm" className="text-xs px-2" disabled={textSize === 'base'} onClick={cycleSize(-1)}>A−</Button>
    <Button variant="neutral" size="sm" className="text-xs px-2" disabled={textSize === 'xl'} onClick={cycleSize(1)}>A+</Button>
    <Button onClick={() => setNotesOpen(true)} variant="neutral" size="sm" className="text-xs">Notes</Button>
    <Button onClick={() => setSearchOpen(true)} variant="neutral" size="sm" className="text-xs">Search</Button>
    <Button onClick={() => { localStorage.removeItem(KEY); setSession(null) }} variant="neutral" size="sm" className="text-xs">Log out</Button>
  </>

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {session && learData ? (
          <ReadingHeader
            left={<h1 className="text-lg font-bold flex items-center gap-2 flex-wrap">
              <BrokenCrown className="w-8 h-8" /> King Lear <span className="text-main">Promptbook</span>
            </h1>}
            right={<span className="flex items-center gap-1">{toolbar}</span>}
            acts={learData.acts as any} actNum={actNum} sceneNum={sceneNum}
            onGoTo={goTo} scrollProgress={scrollProgress} />
        ) : (
          <div className="sticky top-0 z-10 bg-background">
            <header className="border-b px-4 py-3">
              <h1 className="text-lg font-bold flex items-center gap-2">
                <BrokenCrown className="w-8 h-8" /> King Lear <span className="text-main">Promptbook</span>
              </h1>
            </header>
          </div>
        )}
        <main className="px-2 py-4 min-[960px]:px-6 pb-20 min-[960px]:pb-4">
          {session && learData
            ? <TextReader acts={learData.acts as any} studentId={session.studentId} studentName={session.studentName}
                actNum={actNum} sceneNum={sceneNum} onBookmark={saveBookmark}
                scrollToLineId={scrollToLineId} onGoTo={goTo} textSize={textSize} joinCode={session.joinCode} />
            : session
              ? <p className="text-center text-muted-foreground py-8">Loading play text…</p>
              : <LoginCard name={name} setName={setName} code={code} setCode={setCode}
                  initials={initials} setInitials={setInitials}
                  isNew={isNew} loading={loading} err={err} onJoin={join} />}
        </main>
      </div>
      {session && (
        <div className="min-[960px]:hidden fixed bottom-0 inset-x-0 z-10 bg-background border-t flex items-center justify-around px-4 py-2">
          {toolbar}
        </div>
      )}
      {session && <AllNotesSheet studentId={session.studentId} joinCode={session.joinCode}
        open={notesOpen} onOpenChange={setNotesOpen} />}
      {learData && <SearchDialog acts={learData.acts as any} open={searchOpen} onOpenChange={setSearchOpen}
        onNavigate={(a, s, lineId) => { goTo(a, s); setSearchOpen(false); setTimeout(() => setScrollToLineId(lineId), 150) }} />}
    </TooltipProvider>
  )
}
