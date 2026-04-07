import { create } from 'zustand'

export type Note = { id: string; studentName: string; joinCode: string; lineId: string; body: string; updatedAt: string }
export type Class = { joinCode: string; label: string; createdAt: string }
export type Student = { studentId: string; studentName: string; joinCode: string; initials: string; lastSeen: string; noteCount: number }

export const fmtInitials = (v: string) => v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4).split('').join('.')
export const logout = () => { localStorage.removeItem('klread_session'); location.href = '/' }
const post = (url: string, d: any) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
const patch = (url: string, d: any) => fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })

export const subScroll = (cb: () => void) => { window.addEventListener('scroll', cb, { passive: true }); return () => window.removeEventListener('scroll', cb) }
export const getScroll = () => Math.round(document.documentElement.scrollTop / (document.documentElement.scrollHeight - document.documentElement.clientHeight) * 100) || 0

export const useTeacher = create<{
  classes: Class[]; students: Student[]; notes: (Note & { joinCode: string })[]; editNotes: Record<string, string>
  err: string; reading: { joinCode: string; label: string } | null; copied: Record<string, boolean>
  creating: boolean; adding: Record<string, boolean>; notesOpen: boolean; actNum: number; sceneNum: number
  set: (p: any) => void; init: (k: string) => void; setReading: (v: any) => void; copy: (jc: string) => void
  createCode: (k: string, fd: FormData) => void; addStudent: (k: string, jc: string, fd: FormData) => void
  delStudent: (k: string, id: string) => void; delCode: (k: string, jc: string) => void
  delNote: (id: string) => void; saveNote: (id: string) => void
  setEditNotes: (fn: (p: Record<string, string>) => Record<string, string>) => void
}>(set => ({
  classes: [], students: [], notes: [], editNotes: {}, err: '', reading: null,
  copied: {}, creating: false, adding: {}, notesOpen: false, actNum: 1, sceneNum: 1,
  set: (p) => set(p),
  init: (k) => {
    set({ err: '' })
    if (!k) { set({ err: 'Missing teacher key' }); return }
    fetch(`/api/teacher?key=${k}&summary=1`)
      .then(r => { if (!r.ok) throw new Error(r.status === 403 ? 'Invalid teacher key' : `Request failed (${r.status})`); return r.json() })
      .then(students => set({ students: Array.isArray(students) ? students : [] }))
      .catch(e => set({ err: e.message }))
    fetch(`/api/teacher?key=${k}`)
      .then(r => r.ok ? r.json() : [])
      .then(notes => set({ notes: Array.isArray(notes) ? notes : [] }))
      .catch(() => set({ notes: [] }))
    fetch(`/api/classes?key=${k}`)
      .then(r => r.ok ? r.json() : [])
      .then((all: Class[]) => {
        const classes = Array.isArray(all) ? all.filter((c: Class) => c.label !== 'Teacher') : []
        set({ classes })
        const rp = new URLSearchParams(location.search).get('reading')
        const m = rp && classes.find((c: Class) => c.joinCode === rp)
        if (m) set({ reading: { joinCode: m.joinCode, label: m.label } })
      }).catch(() => set({ classes: [] }))
  },
  setReading: (val) => {
    set({ reading: val })
    const url = new URL(location.href)
    if (val) url.searchParams.set('reading', val.joinCode); else url.searchParams.delete('reading')
    history.replaceState(null, '', url)
  },
  copy: (jc) => {
    navigator.clipboard.writeText(jc); set((s: any) => ({ copied: { ...s.copied, [jc]: true } }))
    setTimeout(() => set((s: any) => ({ copied: { ...s.copied, [jc]: false } })), 1500)
  },
  createCode: async (k, fd) => {
    const label = (fd.get('label') as string).trim(); if (!label) return
    set({ creating: true })
    const r = await post(`/api/classes?key=${k}`, { label, code: (fd.get('code') as string).trim().toUpperCase() || undefined })
    if (r.ok) { const c = await r.json(); set((s: any) => ({ classes: [c, ...s.classes] })) }
    set({ creating: false })
  },
  addStudent: async (k, jc, fd) => {
    const name = (fd.get('name') as string).trim(), ini = fmtInitials(fd.get('initials') as string)
    if (!name || !ini) return
    set((s: any) => ({ adding: { ...s.adding, [jc]: true } }))
    await post('/api/sessions', { studentName: name, joinCode: jc, initials: ini })
    const students = await fetch(`/api/teacher?key=${k}&summary=1`)
      .then(r => r.ok ? r.json() : []).catch(() => [])
    set((s: any) => ({ students: Array.isArray(students) ? students : [], adding: { ...s.adding, [jc]: false } }))
  },
  delStudent: (k, id) => fetch(`/api/sessions?studentId=${id}&key=${k}`, { method: 'DELETE' })
    .then(() => set((s: any) => ({ students: s.students.filter((x: any) => x.studentId !== id) }))),
  delCode: (k, jc) => fetch(`/api/classes?key=${k}&code=${jc}`, { method: 'DELETE' })
    .then(() => set((s: any) => ({ classes: s.classes.filter((x: any) => x.joinCode !== jc) }))),
  delNote: (id) => fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
    .then(() => set((s: any) => ({ notes: s.notes.filter((n: any) => n.id !== id) }))),
  saveNote: async (id) => {
    const body = (useTeacher.getState() as any).editNotes[id]?.trim(); if (!body) return
    await patch('/api/notes', { id, body })
    set((s: any) => ({
      notes: s.notes.map((n: any) => n.id === id ? { ...n, body } : n),
      editNotes: Object.fromEntries(Object.entries(s.editNotes).filter(([k]) => k !== id)) as Record<string, string>,
    }))
  },
  setEditNotes: (fn) => set((s: any) => ({ editNotes: fn(s.editNotes) })),
}))
