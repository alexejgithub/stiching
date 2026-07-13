# 30 — Cells never render their slot's symbol glyph

**Reported by:** user bug report, 2026-07-13

**Status:** ready-for-agent

## Symptom

Colored (stitched) cells show only their fill color — no symbol glyph is drawn on top, in either the live editor or the exported/printed SVG.

## Root cause

Per [ticket 09 (Cell representation)](09-cell-representation.md), the explicit v1 decision was **color + symbol together**, specifically because the export "is meant to be used standalone with yarn in hand — color-only cells become ambiguous on a black-and-white printout or for a colorblind reader." [Ticket 14](14-symbol-assignment.md) and [ticket 16](16-svg-export-print.md) reaffirm every palette slot gets an auto-assigned symbol from `SYMBOLS` ([symbols.ts](../../../app/src/model/symbols.ts)) that should render "in the cell alongside its color."

`buildCells` in [gridRenderer.ts](../../../app/src/render/gridRenderer.ts) only ever creates a `<rect>` per cell (fill = slot color or blank white) — it never looks up `SYMBOLS[slot.symbolId]` or appends a `<text>` glyph. Since `gridRenderer.ts` is the shared renderer for both the live editor (`PatternGrid.tsx`) and the export pipeline (`exportRenderer.ts`), the glyph is missing everywhere a cell is drawn — it only currently appears in the export legend (`buildLegend` in `exportRenderer.ts`), which maps color→symbol→label but doesn't help identify any specific cell on the grid itself.

No existing test in `gridRenderer.test.ts` or `exportRenderer.test.ts` asserts a per-cell symbol exists, consistent with the feature having never been built.

## Fix

In `buildCells`, for every non-blank cell, append a `<text>` glyph (`SYMBOLS[slot.symbolId]`) centered on the cell, sized/colored for contrast against the fill color, alongside the existing color rect.

## Acceptance criteria

- [ ] Every stitched cell in the live editor shows its slot's symbol glyph centered on the color
- [ ] Exported/printed SVG cells show the same glyph (same renderer, so this should fall out for free)
- [ ] Glyph remains legible against both light and dark slot colors (contrast, not just a fixed fill)
- [ ] Blank cells remain glyph-free
- [ ] A test in `gridRenderer.test.ts` asserts a `data-role="cell-symbol"` (or similar) element exists per stitched cell with the correct glyph text
