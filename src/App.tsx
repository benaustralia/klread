import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TextReader } from './components/TextReader'
import { TeacherView } from './components/TeacherView'
import learData from './data/king-lear.json'

type Session = { studentId: string; studentName: string; joinCode: string }
const KEY = 'klread_session'
const stored = (): Session | null => { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null } }

export default function App() {
  const isTeacher = location.pathname === '/teacher'
  const [session, setSession] = useState<Session | null>(stored)
  const [showVariants, setShowVariants] = useState(false)
  const [name, setName] = useState(''); const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false); const [err, setErr] = useState('')

  const dialogOpen = !session && !isTeacher

  async function join() {
    if (!name.trim() || !code.trim()) return setErr('Enter your name and join code')
    setLoading(true); setErr('')
    try {
      const check = await fetch(`/api/sessions?code=${encodeURIComponent(code.trim())}`)
      let studentId: string
      if (check.ok) {
        studentId = (await check.json()).studentId
      } else {
        const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentName: name.trim(), joinCode: code.trim() }) })
        if (!res.ok) { setErr('Could not join. Check your join code.'); return }
        studentId = (await res.json()).studentId
      }
      const s: Session = { studentId, studentName: name.trim(), joinCode: code.trim() }
      localStorage.setItem(KEY, JSON.stringify(s)); setSession(s)
    } catch { setErr('Network error') } finally { setLoading(false) }
  }

  if (isTeacher) return <TeacherView />

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
            <Input placeholder="Join code (e.g. LEAR-7F)" value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && join()} className="uppercase" />
            {err && <p className="text-destructive text-sm">{err}</p>}
            <Button onClick={join} disabled={loading}>{loading ? 'Joining…' : 'Join'}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between gap-4">
          <h1 className="font-serif text-lg font-bold shrink-0">King Lear</h1>
          {session && (
            <span className="hidden sm:flex items-center gap-4 text-xs font-sans text-muted-foreground">
              <span><span className="text-yellow-700 font-bold">[ ]</span> Folio 1623</span>
              <span><span className="text-sky-600 font-bold">‹ ›</span> Quarto 1608</span>
            </span>
          )}
          <label className="flex items-center gap-2 text-sm font-sans cursor-pointer shrink-0">
            <span className="text-muted-foreground">Apparatus</span>
            <Switch checked={showVariants} onCheckedChange={setShowVariants} />
          </label>
        </header>
        <main className="px-2 py-4 sm:px-6">
          {session
            ? <TextReader acts={learData.acts as any} showVariants={showVariants} studentId={session.studentId} studentName={session.studentName} />
            : <p className="text-center text-muted-foreground mt-16 font-sans">Please join a session to begin.</p>}
        </main>
      </div>
    </TooltipProvider>
  )
}
