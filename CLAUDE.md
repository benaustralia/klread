# King Lear Promptbook — CLAUDE.md

## What this app is
A classroom reading platform for King Lear. Students join via a class code and annotate lines of the play. Teachers write notes that are visible to all students. The text is a parallel Quarto/Folio edition with textual variants highlighted. Deployed at klread.vercel.app.

## Stack
- Vite + React 19 + TypeScript, Tailwind v4
- shadcn canary with **neobrutalism** theme — always install components via:
  `npx shadcn@latest add https://neobrutalism.dev/r/<component>.json --overwrite`
  Never improvise neobrutalism layouts — follow the exact registry demo patterns
- Neon PostgreSQL via `@neondatabase/serverless`
- Vercel serverless API routes in `/api/`
- Local dev: Vite proxy in `vite.config.ts` routes `/api` → `https://klread.vercel.app` (not committed)

## Code style rules
- No horizontal stacking — all props and SQL on separate lines
- Target ~80 lines per component, no code-splitting workarounds
- No docstrings, no superfluous comments, no over-engineering

## Key credentials (local dev)
- Teacher key: `KL-TEACH` (also the join code for the teacher class)
- Class code for White Friars 2026: `WFVCE26`
- Teacher name: Ben / initials: BH

## Database schema (Neon PostgreSQL)
```sql
classes    (join_code PK, label, is_teacher bool, created_at)
sessions   (student_id uuid PK, student_name, join_code FK, initials, last_seen_at, bookmark_line_id)
notes      (id uuid PK, student_id FK, student_name, line_id, line_id_to, act, scene, body, updated_at)
```

## API routes
| Route | Methods | Auth | Notes |
|---|---|---|---|
| `/api/sessions` | GET / POST / PATCH | none | GET looks up by code+name; POST creates/upserts; PATCH saves bookmark |
| `/api/notes` | GET / POST / DELETE | none | `?studentId=` for student notes; `?teacherNotes=1` for all teacher notes (public) |
| `/api/classes` | GET / POST / DELETE | `?key=TEACHER_KEY` | Class management |
| `/api/teacher` | GET | `?key=TEACHER_KEY` | `?summary=1` for student list; default returns all notes |

## Component map
```
App.tsx                  — login form, session management, top-level routing
TeacherView.tsx          — teacher dashboard: class codes, student list, notes table, reading mode
TextReader.tsx           — renders the play scene; manages annotation maps; scroll bookmark
  └─ LineRenderer.tsx    — single line: text, variant brackets, note badges
  └─ NotesSheet.tsx      — slide-in sheet: view/add notes for a line
SceneNav.tsx             — act/scene navigation menu
```

## Annotation system — how it works

### Data model
- A note has `lineId` (anchor/start) and optional `lineIdTo` (end of range). If both are the same, stored as null.
- Notes are per-student. Teacher notes are notes saved under a session in a class where `is_teacher = true`.

### Annotation maps (TextReader)
`buildAnnotationMap(notes, allLineIds)` returns `Map<lineId, {pos, anchor, initials}>` where:
- `pos`: `'solo'` (single line) | `'start'` | `'mid'` | `'end'`
- `anchor`: the start line ID of the range (used to open the correct note when a mid/end line is clicked)

Two maps: `annotated` (student's own) and `teacherAnnotated` (all teacher notes, fetched from `?teacherNotes=1`).

### Click behaviour
- **Click line text** → open NotesSheet for that exact line (to add a new note)
- **Click student badge** → resolve anchor from `annotated` map, open NotesSheet at anchor line
- **Click teacher badge** → resolve anchor from `teacherAnnotated` map, open NotesSheet at anchor line

### NotesSheet
- Opened with `line` (the selected line) and `allLines` (full play line list)
- Fetches student notes filtered to `lineId === line.id`
- Fetches teacher notes filtered to any note whose range covers `line.id` (using `allLines` index)
- `rangeEnd` derived from **student notes only** (not teacher) — controls header title and description
- Teacher notes shown read-only; their range displayed as `initials · name · start – end`
- Header: `line.id` or `line.id – rangeEnd` if the student has a range note
- Description: all non-stage lines from `line.id` to `rangeEnd`

## Badge / bracket visual (LineRenderer)

### Layout rules — critical for gap-free brackets
- Outer row div: `flex gap-3 items-stretch` — **NO vertical padding**
- Text span: `py-0.5` — padding lives here, not on the outer div
- Badge spans: `self-stretch` — fills full row height including text padding
- Badge wrapper: `flex gap-1 shrink-0 self-stretch items-stretch`
- Adjacent rows have zero margin between them → badges on consecutive rows visually connect

### Badge shapes
- `solo`: full border, rounded all corners, `self-stretch flex items-center`
- `start`: border top+left+right, NO bottom border, rounded top — `border border-b-0 rounded-t`
- `mid`: border left+right only, NO top/bottom — `border-x`, text transparent (keeps width)
- `end`: border bottom+left+right, NO top border, rounded bottom — `border border-t-0 rounded-b`, text transparent

### Hover behaviour
- Badge hover: `cursor-pointer hover:opacity-70` + `data-badge` attribute
- Line hover: `hover:bg-black/5` suppressed when hovering a badge via `[&:has([data-badge]:hover)]:bg-transparent`
- Teacher badge: `primary=false` → `text-muted-foreground bg-secondary-background`
- Student badge: `primary=true` → `text-primary`

## Outstanding issue — bracket visual gap
The `start`/`end` bracket should look like a single pen-highlight box spanning multiple rows. This works **only if** there is zero vertical gap between adjacent line rows. Historically `py-0.5` on the outer div caused 4px gaps — this was fixed by moving padding to the text span. If gaps reappear, check that no vertical padding/margin has been added to the outer row div or the `data-line-id` wrapper divs in TextReader. The bracket was still being visually verified when this file was written.
