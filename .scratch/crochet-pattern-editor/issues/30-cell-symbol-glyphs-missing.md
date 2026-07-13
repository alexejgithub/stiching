# 30 — Cells never render their slot's symbol glyph

**Reported by:** user bug report, 2026-07-13

**Status:** resolved

## Symptom

Colored (stitched) cells show only their fill color — no symbol glyph is drawn on top, in either the live editor or the exported/printed SVG.

## Root cause

Per [ticket 09 (Cell representation)](09-cell-representation.md), the explicit v1 decision was **color + symbol together**, specifically because the export "is meant to be used standalone with yarn in hand — color-only cells become ambiguous on a black-and-white printout or for a colorblind reader." [Ticket 14](14-symbol-assignment.md) and [ticket 16](16-svg-export-print.md) reaffirm every palette slot gets an auto-assigned symbol from `SYMBOLS` ([symbols.ts](../../../app/src/model/symbols.ts)) that should render "in the cell alongside its color."

`buildCells` in [gridRenderer.ts](../../../app/src/render/gridRenderer.ts) only ever creates a `<rect>` per cell (fill = slot color or blank white) — it never looks up `SYMBOLS[slot.symbolId]` or appends a `<text>` glyph. Since `gridRenderer.ts` is the shared renderer for both the live editor (`PatternGrid.tsx`) and the export pipeline (`exportRenderer.ts`), the glyph is missing everywhere a cell is drawn — it only currently appears in the export legend (`buildLegend` in `exportRenderer.ts`), which maps color→symbol→label but doesn't help identify any specific cell on the grid itself.

No existing test in `gridRenderer.test.ts` or `exportRenderer.test.ts` asserts a per-cell symbol exists, consistent with the feature having never been built.

## Fix

In `buildCells`, for every non-blank cell, append a `<text>` glyph (`SYMBOLS[slot.symbolId]`) centered on the cell, sized/colored for contrast against the fill color, alongside the existing color rect.

## Acceptance criteria

- [x] Every stitched cell in the live editor shows its slot's symbol glyph centered on the color
- [x] Exported/printed SVG cells show the same glyph (same renderer, so this should fall out for free)
- [x] Glyph remains legible against both light and dark slot colors (contrast, not just a fixed fill)
- [x] Blank cells remain glyph-free
- [x] A test in `gridRenderer.test.ts` asserts a `data-role="cell-symbol"` (or similar) element exists per stitched cell with the correct glyph text

## Comments

Implemented in [app/src/render/gridRenderer.ts](../../../app/src/render/gridRenderer.ts): `buildCells` now appends a centered `<text data-role="cell-symbol">` glyph (`SYMBOLS[slot.symbolId]`) on top of every non-blank cell's rect. Glyph color is picked by `contrastGlyphColor`, a WCAG relative-luminance check against the slot's hex (near-black on light fills, near-white on dark fills), not a fixed color. Blank cells (`slot` undefined) get no glyph. Since `exportRenderer.ts` reuses `buildGridSVG`, the export/print pipeline gets the glyph for free — verified via the existing `exportRenderer.test.ts` suite, unchanged and still passing.

Added three cases to `gridRenderer.test.ts`: a `data-role="cell-symbol"` glyph exists per stitched cell with the correct text, blank cells stay glyph-free, and light-vs-dark fills resolve to different (correct) glyph colors.

Reviewed via the `code-review` skill (Standards + Spec sub-agents): Spec review found no missing/partial criteria and no scope creep. Standards review (no documented repo standards exist, so judgement-call-only) flagged a duplicated "vertical text-centering nudge" magic number (`cellSize * 0.18`) between the new glyph code and the pre-existing `buildRowNumbers` — extracted into a shared `TEXT_BASELINE_NUDGE_FACTOR` constant used by both. `npm run typecheck` and `npm test` (147 tests) pass.

Commit: `6cdba6f`.
