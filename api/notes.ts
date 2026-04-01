import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Public endpoint: all teacher notes (universally visible)
    if (req.query.teacherNotes) {
      const rows = await sql`
        SELECT n.id, n.line_id AS "lineId", n.line_id_to AS "lineIdTo",
               n.body, n.act, n.scene, s.initials, s.student_name AS "studentName"
        FROM notes n
        JOIN sessions s ON s.student_id = n.student_id
        JOIN classes c ON c.join_code = s.join_code
        WHERE c.is_teacher = true
        ORDER BY n.updated_at DESC`
      return res.json(rows)
    }
    const { studentId } = req.query
    if (!studentId) return res.status(400).json({ error: 'studentId required' })
    const rows = await sql`
      SELECT id, student_id AS "studentId", student_name AS "studentName",
             line_id AS "lineId", line_id_to AS "lineIdTo", act, scene, body,
             updated_at AS "updatedAt"
      FROM notes WHERE student_id = ${studentId as string}
      ORDER BY updated_at DESC`
    return res.json(rows)
  }
  if (req.method === 'POST') {
    const { studentId, studentName, lineId, lineIdTo, act, scene, body } = req.body ?? {}
    if (!studentId || !lineId || !body) return res.status(400).json({ error: 'studentId, lineId, body required' })
    const rows = await sql`
      INSERT INTO notes (student_id, student_name, line_id, line_id_to, act, scene, body)
      VALUES (${studentId}, ${studentName}, ${lineId}, ${lineIdTo ?? null}, ${act}, ${scene}, ${body})
      RETURNING id, updated_at AS "updatedAt"`
    return res.json(rows[0])
  }
  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id required' })
    await sql`DELETE FROM notes WHERE id = ${id as string}`
    return res.status(204).end()
  }
  res.status(405).end()
}
