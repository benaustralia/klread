import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const { key, summary, joinCode } = req.query
  if (key !== process.env.TEACHER_KEY?.trim()) return res.status(403).json({ error: 'forbidden' })

  if (summary) {
    const rows = await sql`
      SELECT s.student_id AS "studentId", s.student_name AS "studentName",
             s.join_code AS "joinCode", c.label AS "classLabel",
             s.initials, s.last_seen_at AS "lastSeen",
             COUNT(n.id)::int AS "noteCount"
      FROM sessions s
      JOIN classes c ON c.join_code = s.join_code
      LEFT JOIN notes n ON n.student_id = s.student_id
      WHERE c.is_teacher = false
      GROUP BY s.student_id, s.student_name, s.join_code, s.initials, c.label, s.last_seen_at
      ORDER BY c.label, s.student_name`
    return res.json(rows)
  }

  const rows = joinCode
    ? await sql`
        SELECT n.id, s.student_name AS "studentName", s.join_code AS "joinCode",
               c.label AS "classLabel", n.line_id AS "lineId", n.act, n.scene,
               n.body, n.updated_at AS "updatedAt"
        FROM notes n
        JOIN sessions s ON s.student_id = n.student_id
        JOIN classes c ON c.join_code = s.join_code
        WHERE s.join_code = ${joinCode}
        ORDER BY s.student_name, n.updated_at DESC`
    : await sql`
        SELECT n.id, s.student_name AS "studentName", s.join_code AS "joinCode",
               c.label AS "classLabel", n.line_id AS "lineId", n.act, n.scene,
               n.body, n.updated_at AS "updatedAt"
        FROM notes n
        JOIN sessions s ON s.student_id = n.student_id
        JOIN classes c ON c.join_code = s.join_code
        ORDER BY c.label, s.student_name, n.updated_at DESC`
  res.json(rows)
}
