import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function migrate() {
  await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS char_start INT`
  await sql`ALTER TABLE notes ADD COLUMN IF NOT EXISTS char_end INT`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await migrate()

  if (req.method === 'GET') {
    if (req.query.teacherNotes) {
      const rows = await sql`
        SELECT n.id, n.line_id AS "lineId", n.line_id_to AS "lineIdTo",
               n.char_start AS "charStart", n.char_end AS "charEnd",
               n.body, n.act, n.scene, s.initials, s.student_name AS "studentName"
        FROM notes n
        JOIN sessions s ON s.student_id = n.student_id
        JOIN classes c ON c.join_code = s.join_code
        WHERE c.is_teacher = true
        ORDER BY n.updated_at DESC`
      return res.json(rows)
    }
    if (req.query.joinCode) {
      const rows = await sql`
        SELECT n.id, n.student_id AS "studentId", n.student_name AS "studentName",
               n.line_id AS "lineId", n.line_id_to AS "lineIdTo",
               n.char_start AS "charStart", n.char_end AS "charEnd",
               n.body, n.updated_at AS "updatedAt", s.initials
        FROM notes n
        JOIN sessions s ON s.student_id = n.student_id
        JOIN classes c ON c.join_code = s.join_code
        WHERE s.join_code = ${req.query.joinCode as string} OR c.is_teacher = true
        ORDER BY n.updated_at DESC`
      return res.json(rows)
    }
    const { studentId } = req.query
    if (!studentId) return res.status(400).json({ error: 'studentId required' })
    const rows = await sql`
      SELECT id, student_id AS "studentId", student_name AS "studentName",
             line_id AS "lineId", line_id_to AS "lineIdTo",
             char_start AS "charStart", char_end AS "charEnd",
             act, scene, body, updated_at AS "updatedAt"
      FROM notes WHERE student_id = ${studentId as string}
      ORDER BY updated_at DESC`
    return res.json(rows)
  }

  if (req.method === 'POST') {
    const { studentId, studentName, lineId, lineIdTo, charStart, charEnd, act, scene, body } = req.body ?? {}
    if (!studentId || !lineId || !body) return res.status(400).json({ error: 'studentId, lineId, body required' })
    const rows = await sql`
      INSERT INTO notes (student_id, student_name, line_id, line_id_to, char_start, char_end, act, scene, body)
      VALUES (${studentId}, ${studentName}, ${lineId}, ${lineIdTo ?? null},
              ${charStart ?? null}, ${charEnd ?? null}, ${act}, ${scene}, ${body})
      RETURNING id, updated_at AS "updatedAt"`
    return res.json(rows[0])
  }

  if (req.method === 'PATCH') {
    const { id, body } = req.body ?? {}
    if (!id || !body) return res.status(400).json({ error: 'id, body required' })
    const rows = await sql`
      UPDATE notes SET body = ${body}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, body, updated_at AS "updatedAt"`
    if (!rows.length) return res.status(404).json({ error: 'not found' })
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
