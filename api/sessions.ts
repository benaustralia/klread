import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const code = req.query.code as string
    const name = req.query.name as string
    if (!code) return res.status(400).json({ error: 'code required' })
    const rows = name
      ? await sql`SELECT s.student_id AS "studentId", s.student_name AS "studentName", s.join_code AS "joinCode", s.initials, c.is_teacher AS "isTeacher" FROM sessions s JOIN classes c ON c.join_code = s.join_code WHERE s.join_code = ${code} AND s.student_name = ${name} LIMIT 1`
      : await sql`SELECT s.student_id AS "studentId", s.student_name AS "studentName", s.join_code AS "joinCode", s.initials, c.is_teacher AS "isTeacher" FROM sessions s JOIN classes c ON c.join_code = s.join_code WHERE s.join_code = ${code} LIMIT 1`
    return rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'not found' })
  }
  if (req.method === 'POST') {
    const { studentName, joinCode, initials } = req.body ?? {}
    if (!studentName || !joinCode) return res.status(400).json({ error: 'studentName and joinCode required' })
    const cls = await sql`SELECT is_teacher FROM classes WHERE join_code = ${joinCode}`
    if (!cls.length) return res.status(400).json({ error: 'Invalid join code' })
    const rows = await sql`INSERT INTO sessions (student_name, join_code, initials) VALUES (${studentName}, ${joinCode}, ${initials ?? ''}) ON CONFLICT (student_name, join_code) DO UPDATE SET initials = EXCLUDED.initials RETURNING student_id AS "studentId", initials`
    return res.json({ ...rows[0], isTeacher: cls[0].is_teacher ?? false })
  }
  res.status(405).end()
}
