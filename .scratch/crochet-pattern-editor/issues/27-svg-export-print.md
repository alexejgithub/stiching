# 27 — Paginated SVG export/print

**What to build:** The self-contained, printable output that makes a finished pattern usable away from the screen: a crafter picks a physical cell size (input or presets), previews the resulting paginated SVG, and exports/prints it. Every page carries a "Page X of Y" header with its absolute row/column range, a small thumbnail of the whole pattern with that page's region highlighted, and the full color/symbol/label legend — reusing ticket 19's shared per-cell renderer so the printed grid can never drift from the live editor.

**Blocked by:** 19, 20

**Status:** resolved

- [x] Crafter can choose a physical cell size (input or presets) before export/print
- [x] Changing cell size live-updates a page-count preview before finalizing
- [x] A pattern that fits on one page exports as a single plain SVG, not a multi-file set of one
- [x] A pattern spanning multiple pages exports as a set of individually self-contained page SVG files
- [x] Adjacent pages overlap by one shared row/column of cells, for physical alignment
- [x] Every page's header states its absolute row/column range within the full Pattern (not renumbered per page)
- [x] Every page includes a small thumbnail of the whole pattern with that page's covered region highlighted
- [x] Every page carries the complete color/symbol/label legend as a fixed strip below the grid, flowing left-to-right and wrapping as needed, without shrinking the grid's cell size to make room
- [x] Exported/printed pages keep the same static column numbering and parity-alternating row numbering as the live editor
- [x] Export and print use the same generated artifact (no separate print-only path)
- [x] The exported grid is rendered through the same shared per-cell SVG module as the live editor, not a second parallel drawing path
- [x] SVG render/export module tests assert on generated SVG structure: page count for given cell-size/grid-size combinations, presence and correctness of numbering text elements (parity and absolute position), one-row/col overlap between adjacent pages, and presence of every palette Slot in the legend on every page

## Comments

Implemented in [app/](../../../app/) — `src/render/exportLayout.ts` (pagination math), `src/render/exportRenderer.ts` (page SVG, reuses `buildGridSVG` via new additive `rowOffset`/`colOffset` options), `src/persistence/exportSvg.ts` (download), `src/components/ExportDialog.tsx` (preview/print/download UI). Verified live in-browser (page-count readout updated live on cell-size change; a 2-page export showed correct absolute header ranges "Rows 1-3, Columns 1-2" / "Rows 1-3, Columns 2-3" with column 2 shared; downloaded both files with correct names) and via `src/render/exportLayout.test.ts` / `src/render/exportRenderer.test.ts` / `src/persistence/exportSvg.test.ts`. Commit: `195fce3`.
