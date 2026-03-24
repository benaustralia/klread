import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const { key } = req.query
  if (key !== process.env.TEACHER_KEY) return res.status(403).json({ error: 'forbidden' })
  const rows = await sql`
    SELECT n.id, s.student_name AS "studentName", n.line_id AS "lineId", n.act, n.scene, n.body, n.updated_at AS "updatedAt"
    FROM notes n JOIN sessions s ON s.student_id = n.student_id
    ORDER BY s.student_name, n.updated_at DESC`
  res.json(rows)
}
