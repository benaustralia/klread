import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BrokenCrown } from './components/BrokenCrown'
import { TextReader } from './components/TextReader'
import { SceneNav } from './components/SceneNav'
import { Progress } from '@/components/ui/progress'
import { TeacherView } from './components/TeacherView'
import learData from './data/king-lear.json'

type Session = { studentId: string; studentName: string; joinCode: string; initials: string; isTeacher: boolean }
const KEY = 'klread_session'
const LAST_KEY = 'klread_last'
const stored = (): Session | null => { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null } }
const lastUsed = (): { name: string; code: string } | null => { try { return JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null') } catch { return null } }

export default function App() {
  // ?logout in URL always clears session — escape hatch if ever stuck
  if (new URLSearchParams(location.search).has('logout')) {
    localStorage.removeItem(KEY); location.replace('/')
  }
  const isTeacher = location.pathname === '/teacher'
  const [session, setSession] = useState<Session | null>(stored)
  const [showVariants, setShowVariants] = useState(true)
  const [actNum, setActNum] = useState(1)
  const [sceneNum, setSceneNum] = useState(1)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const pct = el.scrollTop / (el.scrollHeight - el.clientHeight) * 100
      setScrollProgress(isNaN(pct) ? 0 : Math.round(pct))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const [name, setName] = useState(() => lastUsed()?.name ?? '')
  const [code, setCode] = useState(() => lastUsed()?.code ?? '')
  const [initials, setInitials] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [loading, setLoading] = useState(false); const [err, setErr] = useState('')

  // Refresh session on mount to pick up server-side changes (e.g. isTeacher flag)
  useEffect(() => {
    if (!session) return
    fetch(`/api/sessions?code=${encodeURIComponent(session.joinCode)}&name=${encodeURIComponent(session.studentName)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const updated: Session = { ...session, isTeacher: data.isTeacher ?? false }
        localStorage.setItem(KEY, JSON.stringify(updated))
        setSession(updated)
      }).catch(() => {})
  }, [])

  async function join() {
    if (!name.trim() || !code.trim()) return setErr('Enter your name and join code')
    setLoading(true); setErr('')
    try {
      const check = await fetch(`/api/sessions?code=${encodeURIComponent(code.trim())}&name=${encodeURIComponent(name.trim())}`)
      let data: any
      if (check.ok) {
        data = await check.json()
      } else {
        const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentName: name.trim(), joinCode: code.trim(), initials: initials.trim().slice(0, 4).toUpperCase() }) })
        if (res.status === 422) { setIsNew(true); setErr('Please add your initials — this is only needed once.'); return }
        if (!res.ok) { setErr('Could not join. Check your join code.'); return }
        data = await res.json()
      }
      const s: Session = { studentId: data.studentId, studentName: name.trim(), joinCode: code.trim(), initials: data.initials ?? '', isTeacher: data.isTeacher ?? false }
      localStorage.setItem(KEY, JSON.stringify(s))
      localStorage.setItem(LAST_KEY, JSON.stringify({ name: name.trim(), code: code.trim() }))
      setSession(s)
    } catch { setErr('Network error') } finally { setLoading(false) }
  }

  if (isTeacher || session?.isTeacher) return <TeacherView teacherKey={session?.joinCode ?? new URLSearchParams(location.search).get('key') ?? ''} teacherStudentId={session?.studentId} teacherName={session?.studentName} teacherInitials={session?.initials} />

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background">
        <header className="border-b px-4 py-3 flex items-center justify-between gap-4">
          <h1 className="text-lg font-bold shrink-0 flex items-center gap-2">
            <BrokenCrown className="w-14 h-14" />
            King Lear <span style={{ color: '#2b96e8' }}>Promptbook</span>
          </h1>
          {session && (
            <span className="flex items-center gap-3 text-xs font-semibold">
              <span className="apparatus-quarto">‹ › Quarto 1608</span>
              <span className="apparatus-folio">[ ] Folio 1623</span>
            </span>
          )}
          <div className="flex items-center gap-3 shrink-0">
            {session && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <span className="text-muted-foreground">Highlight</span>
                <Switch checked={showVariants} onCheckedChange={setShowVariants} />
              </label>
            )}
            {session && (
              <Button onClick={() => { localStorage.removeItem(KEY); setSession(null) }} variant="neutral" size="sm" className="text-xs">
                Log out
              </Button>
            )}
          </div>
        </header>
        {session && (
          <div className="border-b py-2 flex flex-col items-center gap-2">
            <SceneNav acts={learData.acts as any} actNum={actNum} sceneNum={sceneNum} onGoTo={(a, s) => { setActNum(a); setSceneNum(s) }} />
            <Progress value={scrollProgress} className="w-full rounded-none border-0 h-1" />
          </div>
        )}
        </div>
        <main className="px-2 py-4 sm:px-6">
          {session ? (
            <TextReader acts={learData.acts as any} showVariants={showVariants} studentId={session.studentId} studentName={session.studentName} initials={session.initials} actNum={actNum} sceneNum={sceneNum} />
          ) : (
            <div className="flex items-center justify-center py-16">
              <Card className="w-full max-w-lg">
                <CardHeader>
                  <CardTitle>Mark it, nuncle.</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="flex flex-row items-center gap-2">
                    <Input id="login-name" placeholder="your first name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && join()} />
                    <Input id="login-code" placeholder="class code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && join()} />
                    <Button className="italic shrink-0" onClick={join} disabled={loading}>
                      {name.trim() ? `Enter ${name.trim().split(' ')[0].toUpperCase()}, at side.` : 'Enter...'}
                    </Button>
                  </div>
                  {isNew && (
                    <div className="grid gap-3">
                      <Label htmlFor="login-initials">Initials</Label>
                      <Input id="login-initials" placeholder="e.g. BH" value={initials} onChange={e => setInitials(e.target.value.toUpperCase().slice(0, 4))} onKeyDown={e => e.key === 'Enter' && join()} className="uppercase" maxLength={4} autoFocus />
                    </div>
                  )}
                  {err && <p className="text-destructive text-sm">{err}</p>}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  )
}
