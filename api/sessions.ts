import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const code = req.query.code as string
    const name = req.query.name as string
    if (!code) return res.status(400).json({ error: 'code required' })
    const rows = name
      ? await sql`SELECT student_id AS "studentId", student_name AS "studentName", join_code AS "joinCode", initials FROM sessions WHERE join_code = ${code} AND student_name = ${name} LIMIT 1`
      : await sql`SELECT student_id AS "studentId", student_name AS "studentName", join_code AS "joinCode", initials FROM sessions WHERE join_code = ${code} LIMIT 1`
    return rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'not found' })
  }
  if (req.method === 'POST') {
    const { studentName, joinCode, initials } = req.body ?? {}
    if (!studentName || !joinCode) return res.status(400).json({ error: 'studentName and joinCode required' })
    const rows = await sql`INSERT INTO sessions (student_name, join_code, initials) VALUES (${studentName}, ${joinCode}, ${initials ?? ''}) ON CONFLICT (student_name, join_code) DO UPDATE SET initials = EXCLUDED.initials RETURNING student_id AS "studentId", initials`
    return res.json(rows[0])
  }
  res.status(405).end()
}
