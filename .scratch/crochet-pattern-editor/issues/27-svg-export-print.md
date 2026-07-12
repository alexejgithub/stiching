# 27 — Paginated SVG export/print

**What to build:** The self-contained, printable output that makes a finished pattern usable away from the screen: a crafter picks a physical cell size (input or presets), previews the resulting paginated SVG, and exports/prints it. Every page carries a "Page X of Y" header with its absolute row/column range, a small thumbnail of the whole pattern with that page's region highlighted, and the full color/symbol/label legend — reusing ticket 19's shared per-cell renderer so the printed grid can never drift from the live editor.

**Blocked by:** 19, 20

**Status:** ready-for-agent

- [ ] Crafter can choose a physical cell size (input or presets) before export/print
- [ ] Changing cell size live-updates a page-count preview before finalizing
- [ ] A pattern that fits on one page exports as a single plain SVG, not a multi-file set of one
- [ ] A pattern spanning multiple pages exports as a set of individually self-contained page SVG files
- [ ] Adjacent pages overlap by one shared row/column of cells, for physical alignment
- [ ] Every page's header states its absolute row/column range within the full Pattern (not renumbered per page)
- [ ] Every page includes a small thumbnail of the whole pattern with that page's covered region highlighted
- [ ] Every page carries the complete color/symbol/label legend as a fixed strip below the grid, flowing left-to-right and wrapping as needed, without shrinking the grid's cell size to make room
- [ ] Exported/printed pages keep the same static column numbering and parity-alternating row numbering as the live editor
- [ ] Export and print use the same generated artifact (no separate print-only path)
- [ ] The exported grid is rendered through the same shared per-cell SVG module as the live editor, not a second parallel drawing path
- [ ] SVG render/export module tests assert on generated SVG structure: page count for given cell-size/grid-size combinations, presence and correctness of numbering text elements (parity and absolute position), one-row/col overlap between adjacent pages, and presence of every palette Slot in the legend on every page
