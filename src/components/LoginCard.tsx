import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function LoginCard({ name, setName, code, setCode, initials, setInitials, isNew, loading, err, onJoin }: {
  name: string
  setName: (v: string) => void
  code: string
  setCode: (v: string) => void
  initials: string
  setInitials: (v: string) => void
  isNew: boolean
  loading: boolean
  err: string
  onJoin: () => void
}) {
  const enter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') onJoin() }
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="w-full max-w-lg">
        <CardHeader><CardTitle>Mark it, nuncle.</CardTitle></CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex flex-row items-center gap-2">
            <Input placeholder="your first name" value={name} onChange={e => setName(e.target.value)} onKeyDown={enter} />
            <Input placeholder="class code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={enter} />
            <Button className="italic shrink-0" onClick={onJoin} disabled={loading}>
              {name.trim() ? `Enter ${name.trim().split(' ')[0].toUpperCase()}, at side.` : 'Enter...'}
            </Button>
          </div>
          {isNew && (
            <div className="grid gap-3">
              <Label htmlFor="login-initials">Initials</Label>
              <Input
                id="login-initials"
                placeholder="e.g. BH"
                value={initials}
                onChange={e => setInitials(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4).split('').join('.'))}
                onKeyDown={enter}
                maxLength={7}
                autoFocus
              />
            </div>
          )}
          {err && <p className="text-destructive text-sm">{err}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
