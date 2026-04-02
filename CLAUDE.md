# King Lear Promptbook — CLAUDE.md

## What this app is
A classroom reading platform for King Lear. Students join via a class code and annotate lines of the play. Teachers write notes that are visible to all students. The text is a parallel Quarto/Folio edition with textual variants highlighted. Deployed at klread.vercel.app.

## Stack
- Vite + React 19 + TypeScript, Tailwind v4
- shadcn canary with **neobrutalism** theme — always install components via:
  `npx shadcn@latest add https://neobrutalism.dev/r/<component>.json --overwrite`
  Never improvise neobrutalism layouts — follow the exact registry demo patterns

## UI design rule — HARD RULE, NO EXCEPTIONS
**All UI must use only the neobrutalism.dev design tokens. Nothing custom.**

Allowed utility classes for colour/style:
- `bg-background`, `bg-main`, `bg-secondary-background`, `bg-card`
- `text-foreground`, `text-main-foreground`, `text-muted-foreground`, `text-primary`, `text-primary-foreground`
- `border-border`, `border-foreground`
- `shadow-shadow`
- `rounded-base`, `rounded-sm`, `rounded-md`, `rounded-lg`
- `font-base`, `font-heading`
- `translate-x-boxShadowX`, `translate-y-boxShadowY`, `translate-x-reverseBoxShadowX`, `translate-y-reverseBoxShadowY`
- Spacing, layout, and sizing utilities (p, m, w, h, flex, grid, etc.) are fine

Forbidden — these break the design system:
- Any raw Tailwind colour (`text-gray-400`, `bg-black/5`, `bg-yellow-200`, `text-sky-600`, etc.)
- Any custom hex/rgb/oklch colour values inline
- Any shadow or border style not from the neobrutalism token set
- Any `style={{}}` prop for colour or visual decoration

Exception: the textual apparatus (Quarto/Folio variant highlighting) uses `bg-sky-200/bg-yellow-200` as scholarly convention — these are content colours, not UI decoration, and are exempt.
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
- Teacher name: Ben / initials: B.H

## Database schema (Neon PostgreSQL)
```sql
classes    (join_code PK, label, is_teacher bool, created_at)
sessions   (student_id uuid PK, student_name, join_code FK, initials, last_seen_at, bookmark_line_id)
notes      (id uuid PK, student_id FK, student_name, line_id, line_id_to, act, scene, body, updated_at)
```

## API routes
| Route | Methods | Auth | Notes |
|---|---|---|---|
| `/api/sessions` | GET / POST / PATCH / DELETE | none / none / none / TEACHER_KEY | GET looks up by code+name; POST creates/upserts (normalises initials to `A.B` format); PATCH saves bookmark; DELETE `?studentId=&key=` removes student + their notes |
| `/api/notes` | GET / POST / DELETE | none | `?studentId=` for student notes; `?teacherNotes=1` for all teacher notes (public) |
| `/api/classes` | GET / POST / DELETE | `?key=TEACHER_KEY` | Class management |
| `/api/teacher` | GET | `?key=TEACHER_KEY` | `?summary=1` for student list; default returns all notes |

## Testing
Always test UI changes with Playwright before considering a task done. After deploying (see below), use the browser MCP tools (`mcp__plugin_playwright_playwright__*`) to navigate to `https://klread.vercel.app`, interact with the feature, and verify it works correctly. Check the console for errors.

## Deploying
Always deploy by pushing to GitHub — do NOT use `vercel --prod` directly. GitHub triggers the Vercel deployment automatically.

```bash
git add <files>
git commit -m "..."
git push
```

After pushing, check the deploy succeeded and had no build/rollup errors before marking a task done:
```bash
vercel inspect --logs $(vercel ls --json 2>/dev/null | head -1) 2>/dev/null
# or simply:
gh run list --limit 1
```
If the Vercel build fails, fix the error and push again.

## Starting a task
CLAUDE.md already contains the full component map, stack, schema, and API routes. Do NOT spawn an agent to explore the codebase before starting — read the files you need directly with Read/Grep/Glob.

## Component map
Reading container width is `max-w-3xl` (768px). Verse lines are short so right margin is intentionally open — matches book layout. Do not narrow to `max-w-2xl`.

```
App.tsx                  — login form, session management, top-level routing
  └─ ReadingHeader.tsx   — shared sticky reading header (student + teacher reading mode):
                           BrokenCrown + title | SceneNav | legend (sm+) | right slot | Progress bar
TeacherView.tsx          — teacher dashboard (sticky logo header) + reading mode (uses ReadingHeader)
TextReader.tsx           — renders the play scene; manages annotation maps; scroll bookmark
  └─ LineRenderer.tsx    — single line: text, variant brackets, note badges
  └─ NotesSheet.tsx      — slide-in sheet: view/add notes for a line
SceneNav.tsx             — act/scene navigation menu
SearchDialog.tsx         — Cmd+K full-text line search
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

## SceneNav.tsx
Dropdown menubar with one menu per act (Act I–V). Each item calls `onGoTo(actNum, sceneNum)`. Highlights current act/scene in bold. Uses `shortLocation()` from `TextReader.tsx` to abbreviate location labels.

## Global CSS notes (`src/index.css`)
- `html { overflow-anchor: none }` — prevents scroll jump when accordion opens/closes
- `html { scrollbar-gutter: stable }` — prevents layout shift when scrollbar appears
- `table.tsx` wrapper uses `overflow-x-auto` (not `overflow-auto`) — prevents vertical scrollbar flash during accordion height animation

## Initials format
Initials are always stored and displayed as dot-separated uppercase letters: `B.H`, `A.B.C`. Normalisation (`fmtInitials`) strips non-letters, caps at 4, joins with `.`. Applied client-side (LoginCard, TeacherView add-student) and server-side (POST `/api/sessions`).

## Known issues / active work
See `/plans/` for dated implementation plans.
1. **Bracket alignment** — verified working; zero vertical padding on row divs is critical
2. **Notes reliability** — SheetFooter buttons not full-width, teacher/student separation unclear
3. **End-of-scene nav** — no "Next Scene" link at bottom of scene

## Bracket column alignment — resolved
The `start`/`end` bracket looks like a single pen-highlight box spanning multiple rows. Two things must hold:

1. **Zero vertical gap between rows** — `py-0.5` lives on the text span, never the outer row div. Badge `self-stretch` fills the full row height. If gaps reappear, check no vertical padding/margin was added to the outer row div or the `data-line-id` wrapper divs in TextReader.

2. **Teacher badge column stays horizontally anchored** — `initials` (the session's student initials) is always passed to `LineRenderer` regardless of whether there's an active note. When the teacher badge is present but the student has no note, an `invisible` placeholder span with the same text is rendered to hold the student column width. This prevents the teacher badge shifting right on continuation rows.
