# 29 — Row/column numbers around the grid are illegible

**Reported by:** user bug report, 2026-07-13

**Status:** resolved

## Symptom

The row and column numbers drawn around the edge of the grid (top = column numbers, left/right alternating = row numbers, per [ticket 04](04-numbering-convention.md)) are hard or impossible to read.

## Root cause

`buildColumnNumbers` and `buildRowNumbers` in [gridRenderer.ts](../../../app/src/render/gridRenderer.ts) create `<text>` elements but never set a `fill` (or any other color styling), and no CSS rule targets `[data-role="column-number"]` / `[data-role="row-number"]` either. That leaves the SVG spec's initial `fill: black` in effect unconditionally.

- The cell squares themselves are always painted on an explicit white rect (`BLANK_FILL = '#ffffff'`), so black digits over a cell read fine.
- The number gutters (`leftGutter`/`rightGutter`/`topGutter`) have **no background rect at all** — they're transparent, showing whatever sits behind the SVG. In dark mode (`index.css`'s `@media (prefers-color-scheme: dark)` block sets `--bg: #16171d`), that's a near-black page background, so black-on-near-black numbers disappear. Even in light mode the unstyled default can read as too low-contrast/thin depending on browser UA text rendering, since nothing pins the intended text color deliberately.

This affects both the live editor (`PatternGrid.tsx` → `buildGridSVG`) and the SVG export (`exportRenderer.ts` reuses the same `buildGridSVG`), plus the page header text in `exportRenderer.ts`'s `buildHeader`/`buildThumbnail`/`buildLegend`, which have the same missing-fill issue.

## Fix

Give the numbering (and other chrome) text elements an explicit, theme-aware fill — e.g. set `fill="currentColor"` plus a CSS rule scoping SVG text to `var(--text)`, or bake in a fixed dark color plus a light gutter background rect so it's legible regardless of page theme. Exported SVGs are standalone documents (opened outside the app's CSS), so the export path specifically needs a fill baked into the SVG itself, not just a CSS rule scoped to the live app.

## Acceptance criteria

- [x] Column and row numbers are clearly legible in the live editor in both light and dark OS theme
- [x] Column and row numbers (and page header/legend text) are legible in the exported/printed SVG opened standalone (no host page CSS applied)
- [x] Fix applied in `gridRenderer.ts` (and `exportRenderer.ts` chrome text) covers both call sites since they share `buildGridSVG`

## Comments

Fixed the missing-fill issue on all number/chrome `<text>` elements in [app/src/render/gridRenderer.ts](../../../app/src/render/gridRenderer.ts) and [app/src/render/exportRenderer.ts](../../../app/src/render/exportRenderer.ts):

- `gridRenderer.ts`: added an exported `NUMBER_TEXT_FILL = '#1c1c1f'` constant and set it as an explicit `fill` attribute on `buildColumnNumbers`'/`buildRowNumbers`' `<text>` elements (previously unset, falling back to the SVG-spec default opaque black).
- `exportRenderer.ts`: imported `NUMBER_TEXT_FILL` and applied it to `buildHeader`'s title/range `<text>` and `buildLegend`'s symbol/label `<text>`. `buildThumbnail` needed no change — it only draws two pre-filled `<rect>`s, no text.
- `index.css`: added a `@media screen` rule mapping the same `[data-role]` selectors to `fill: var(--text)`, which flips between the light/dark `--text` tokens already defined via `prefers-color-scheme`. This overrides the baked-in fill wherever the SVG is live-mounted in the app's own DOM (the editor grid via `PatternGrid.tsx`, and the Export dialog's on-screen preview via `ExportDialog.tsx`) — CSS rules win over presentation attributes regardless of specificity, so no renderer change was needed to get theme-awareness there. Scoped to `@media screen` specifically so `window.print()` (which reuses this same live DOM) keeps the baked dark-on-assumed-white fill instead of following the OS's dark theme onto printed paper.
- Downloaded/standalone SVG files (opened outside the app, no CSS) keep the baked `NUMBER_TEXT_FILL` dark fill directly on every element, satisfying the "fill baked into the SVG itself" requirement for that path.

Did not touch `buildCells` (ticket 30), `buildOverlayRect`/selection rendering (ticket 31), or `buildThumbnail`'s sizing/positioning (ticket 32) — confirmed zero diff lines in `buildThumbnail`.

Verified via:
- New TDD tests (red before the fix, green after): `app/src/render/gridRenderer.test.ts` asserts `column-number`/`row-number` text carries a truthy, non-black `fill`; `app/src/render/exportRenderer.test.ts` asserts the same for `page-header-title`, `page-header-range`, `legend-symbol`, `legend-label`.
- `npm run typecheck` — clean.
- `npx vitest run src/render/gridRenderer.test.ts src/render/exportRenderer.test.ts` — 17/17 passing.
- `npm test` (full suite) — 147/147 passing.
- `code-review` skill run on the diff (Standards + Spec axes in parallel): no hard standard violations found; two minor judgement-call smells noted (a hardcoded hex coincidentally duplicating `--text`'s light value, and a small "shotgun surgery" risk if a 7th chrome-text role is ever added) — both accepted as reasonable trade-offs given the small fixed scope. Spec review confirmed no scope creep into tickets 30/31/32 and that both the live-editor and standalone-export legibility requirements are genuinely met; it flagged that the ticket's alternative suggestion of also adding a gutter background rect wasn't done — left out deliberately since the task instructions scoped this fix to "the fill/color issue on numbering and chrome text only," and the ticket phrased the background-rect approach as an alternative ("bake in a fixed dark color ... **or** ... a light gutter background rect"), not an additional requirement.

Commit: `92b0f01`
