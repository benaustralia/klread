# King Lear Promptbook — Project Notes

## Stack
- Vite + React 19 + TypeScript, Tailwind v4, shadcn canary (neobrutalism theme)
- Neon PostgreSQL via `@neondatabase/serverless`
- Vercel serverless API routes in `/api/`
- neobrutalism components: always install via `npx shadcn@latest add https://neobrutalism.dev/r/<component>.json --overwrite`

## Code style
- No horizontal stacking — all props and SQL on separate lines
- Target ~80 lines per component, no code splitting
- No improvised neobrutalism layouts — follow exact registry demo patterns

## Outstanding issues

### 1. Range badge visual (in progress)
The `start`/`mid`/`end` bracket that spans multiple annotated lines is still being iterated on. The current approach uses:
- `start`: badge with initials, no bottom border, rounded top — `border border-b-0 rounded-t`
- `mid`: side borders only, transparent text for width
- `end`: badge with bottom border, no top border, rounded bottom — `border border-t-0 rounded-b`

The goal is a single continuous pen-highlight shape spanning all covered rows. The gap-free vertical connection relies on `self-stretch` on badge spans and zero vertical padding on the outer row div (padding lives on the inner text span only).

**Not yet built/pushed after last change.**

### 2. Note range UX clarity
- Clicking a line always opens that line's sheet (for adding a new note)
- Clicking a badge navigates to the note's anchor
- Teacher range notes appear in the sheet for any line they cover (not just the anchor)
- The sheet header shows the student's own note range; teacher range is shown inside the teacher note card

### 3. Known visual edge case
When a teacher note spans lines (e.g. 1.1.51–1.1.52) and a student has a solo note on the first line (1.1.51), the badges appear side by side in a shared `flex gap-1` container. The bracket shape for the teacher note should span both rows; the student solo badge should only appear on the first row. This combination has had repeated visual issues — treat with care.
