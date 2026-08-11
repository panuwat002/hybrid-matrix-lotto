---
description: UX/UI polish audit — snapshot the app, list issues by severity, propose fixes, ask before implementing
argument-hint: [optional focus, e.g. "mobile", "landing", "accessibility"]
---

# Impeccable — UX/UI Polish Audit

You are running a fresh UX/UI review pass on this project. Be opinionated.

## Focus for this run
$ARGUMENTS

If empty, do a general polish audit of all key pages.

## Process (do NOT skip steps)

### 1. Snapshot the current state
- Ask the user which pages/URLs are the review target if not obvious from the code.
- If a dev server is running, use the Browser tool to visit each key page at desktop (1280px) AND mobile (375px) widths and capture screenshots. If not, ask the user to share screenshots.
- Read the current component code for the target pages so your review isn't guessing.

### 2. Systematic scan
For each page, note issues in these categories:

- **Hierarchy** — is the most important thing visually the biggest / glowiest?
- **Balance** — grid resolved? any orphan cards or awkward gaps?
- **Repetition** — any info shown more than once (score bars, badges, labels)?
- **Empty states** — what does the page look like BEFORE any user action?
- **Loading states** — what does the user see while waiting for a Server Action?
- **Error states** — is the error message actionable, or just red text?
- **Copy tone** — Thai natural? Any bureaucratic phrasing? Any English strings that should be Thai (or vice versa)?
- **Micro-interactions** — hover, focus, active, transition, feedback on click
- **Mobile responsive** — does it work at 375px width without horizontal scroll?
- **Accessibility** — aria labels, contrast ratios, keyboard nav, `prefers-reduced-motion`
- **Performance** — obvious jank, oversized images, layout shift

### 3. Report — ranked by impact
- 🔥 **Critical** — user can't complete the flow / dangerously confusing
- ⚠️ **Important** — noticeable rough edge that hurts trust
- ✨ **Polish** — nice-to-have

For each finding: one sentence of what's wrong + one sentence of the proposed fix.

### 4. Ask before implementing
Present the findings, then ask which subset to implement. Batch options:
- "All findings"
- "Just critical + important"
- "Just polish"
- "Pick specific numbers"

### 5. Implement
- One commit per logical group (not one huge commit)
- Keep tests + lint green (`pnpm lint && pnpm test`)
- Match existing style: color tokens `matrix.bg / matrix.green / matrix.cyan / matrix.dim`, fonts `mono` / `thai`
- Any new animation must respect `@media (prefers-reduced-motion: reduce)`
- Never remove behavior — only polish presentation — unless the finding explicitly says so

## Guardrails
- Do not commit unrelated files (use specific paths, not `git add -A`).
- Do not touch engine/`lib/**` unless the finding is about server-visible copy in Server Actions.
- If a finding contradicts the design spec in `docs/superpowers/specs/`, flag it and ask which governs before fixing.
