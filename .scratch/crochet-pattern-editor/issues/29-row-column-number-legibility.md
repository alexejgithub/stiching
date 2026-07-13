# 29 — Row/column numbers around the grid are illegible

**Reported by:** user bug report, 2026-07-13

**Status:** ready-for-agent

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

- [ ] Column and row numbers are clearly legible in the live editor in both light and dark OS theme
- [ ] Column and row numbers (and page header/legend text) are legible in the exported/printed SVG opened standalone (no host page CSS applied)
- [ ] Fix applied in `gridRenderer.ts` (and `exportRenderer.ts` chrome text) covers both call sites since they share `buildGridSVG`
