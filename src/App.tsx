import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TextReader } from './components/TextReader'
import { TeacherView } from './components/TeacherView'
import learData from './data/king-lear.json'

type Session = { studentId: string; studentName: string; joinCode: string; initials: string; isTeacher: boolean }
const KEY = 'klread_session'
const stored = (): Session | null => { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null } }

export default function App() {
  // ?logout in URL always clears session — escape hatch if ever stuck
  if (new URLSearchParams(location.search).has('logout')) {
    localStorage.removeItem(KEY); location.replace('/')
  }
  const isTeacher = location.pathname === '/teacher'
  const [session, setSession] = useState<Session | null>(stored)
  const [showVariants, setShowVariants] = useState(false)
  const [name, setName] = useState(''); const [code, setCode] = useState(''); const [initials, setInitials] = useState('')
  const [isReturning, setIsReturning] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false); const [err, setErr] = useState('')

  useEffect(() => {
    if (!name.trim() || !code.trim()) return setIsReturning(null)
    const t = setTimeout(() => {
      fetch(`/api/sessions?code=${encodeURIComponent(code.trim())}&name=${encodeURIComponent(name.trim())}`)
        .then(r => setIsReturning(r.ok)).catch(() => setIsReturning(null))
    }, 400)
    return () => clearTimeout(t)
  }, [name, code])

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

  const dialogOpen = !session && !isTeacher

  async function join() {
    if (!name.trim() || !code.trim()) return setErr('Enter your name and join code')
    setLoading(true); setErr('')
    try {
      const check = await fetch(`/api/sessions?code=${encodeURIComponent(code.trim())}&name=${encodeURIComponent(name.trim())}`)
      let data: any
      if (check.ok) {
        data = await check.json()
      } else {
        if (!initials.trim()) { setErr('First time joining? Please add your initials.'); return }
        const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentName: name.trim(), joinCode: code.trim(), initials: initials.trim().slice(0, 4).toUpperCase() }) })
        if (!res.ok) { setErr('Could not join. Check your join code.'); return }
        data = await res.json()
      }
      const s: Session = { studentId: data.studentId, studentName: name.trim(), joinCode: code.trim(), initials: data.initials ?? '', isTeacher: data.isTeacher ?? false }
      localStorage.setItem(KEY, JSON.stringify(s)); setSession(s)
    } catch { setErr('Network error') } finally { setLoading(false) }
  }

  if (isTeacher || session?.isTeacher) return <TeacherView teacherKey={session?.joinCode ?? new URLSearchParams(location.search).get('key') ?? ''} teacherStudentId={session?.studentId} teacherName={session?.studentName} teacherInitials={session?.initials} />

  return (
    <TooltipProvider>
      <Dialog open={dialogOpen}>
        <DialogContent className="font-serif sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">King Lear</DialogTitle>
            <DialogDescription className="font-sans text-sm">Enter your name and the join code from your teacher.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            <Input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && join()} />
            <Input placeholder="Join code (e.g. WFVCE26)" value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && join()} className="uppercase" />
            {isReturning === false && <Input placeholder="Initials (e.g. BH)" value={initials} onChange={e => setInitials(e.target.value.toUpperCase().slice(0, 4))} onKeyDown={e => e.key === 'Enter' && join()} className="uppercase" maxLength={4} />}
            {err && <p className="text-destructive text-sm">{err}</p>}
            <Button onClick={join} disabled={loading}>{loading ? 'Joining…' : 'Join'}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between gap-4">
          <h1 className="font-serif text-lg font-bold shrink-0">King Lear</h1>
          {session && (
            <span className="flex items-center gap-3 text-xs font-sans font-semibold">
              <span className="bg-sky-200 border-l-2 border-sky-400 px-2 py-0.5 text-black">‹ › Quarto 1608</span>
              <span className="bg-yellow-200 border-l-2 border-yellow-400 px-2 py-0.5 text-black">[ ] Folio 1623</span>
            </span>
          )}
          <div className="flex items-center gap-3 shrink-0">
            {session && (
              <label className="flex items-center gap-2 text-sm font-sans cursor-pointer">
                <span className="text-muted-foreground">Highlight</span>
                <Switch checked={showVariants} onCheckedChange={setShowVariants} />
              </label>
            )}
            {session && (
              <Button onClick={() => { localStorage.removeItem(KEY); setSession(null) }} variant="neutral" size="sm" className="font-sans text-xs">
                Log out
              </Button>
            )}
          </div>
        </header>
        <main className="px-2 py-4 sm:px-6">
          {session
            ? <TextReader acts={learData.acts as any} showVariants={showVariants} studentId={session.studentId} studentName={session.studentName} initials={session.initials} />
            : null}
        </main>
      </div>
    </TooltipProvider>
  )
}
