import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
const auth = (req: VercelRequest) => req.query.key === process.env.TEACHER_KEY

function genCode() {
  return Array.from({ length: 7 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!auth(req)) return res.status(403).json({ error: 'Forbidden' })
  if (req.method === 'GET') {
    const rows = await sql`SELECT join_code AS "joinCode", label, created_at AS "createdAt" FROM classes ORDER BY created_at DESC`
    return res.json(rows)
  }
  if (req.method === 'POST') {
    const { label } = req.body ?? {}
    if (!label?.trim()) return res.status(400).json({ error: 'label required' })
    let code = genCode()
    // Retry on collision (extremely unlikely)
    try {
      const rows = await sql`INSERT INTO classes (join_code, label) VALUES (${code}, ${label.trim()}) RETURNING join_code AS "joinCode", label`
      return res.json(rows[0])
    } catch {
      code = genCode()
      const rows = await sql`INSERT INTO classes (join_code, label) VALUES (${code}, ${label.trim()}) RETURNING join_code AS "joinCode", label`
      return res.json(rows[0])
    }
  }
  if (req.method === 'DELETE') {
    const code = req.query.code as string
    if (!code) return res.status(400).json({ error: 'code required' })
    await sql`DELETE FROM classes WHERE join_code = ${code}`
    return res.status(204).end()
  }
  res.status(405).end()
}
