# Design SVG export & print layout

Type: grilling
Blocked by: 11, 14
Status: resolved

## Question

Given export/print must contain grid + numbers + legend ([Export/print contents](06-export-contents.md)) including the alternating numbering ([Numbering convention](04-numbering-convention.md)) and per-color symbols ([Cell representation](09-cell-representation.md) / [Design symbol-assignment system](14-symbol-assignment.md)), what's the concrete SVG structure and legend layout, and how does printing handle patterns too large for one page (pagination/splitting across sheets)?

## Answer

- **Cell size drives pagination.** At export/print time, the user picks a physical cell size (input or presets); the app computes how many pages that requires and shows a live page-count preview. Single-page is just the case where it fits — no separate shrink-to-fit or fixed-tiling mode.
- **Pages overlap by one row/column** of cells at each shared edge, so adjacent sheets can be physically aligned by matching the duplicated strip when taping together.
- **Every page carries**: a header with "Page X of Y" and the absolute row/column range it covers, a small key-map thumbnail of the whole pattern with this page's region highlighted, and the full color/symbol/label legend.
- **Legend layout**: a fixed strip below the grid, entries flowing left-to-right and wrapping into additional rows as needed; the grid's cell size never shrinks to accommodate the legend.
- **Export and print are the same artifact.** A pattern needing multiple pages exports as a *set* of page SVG files (each fully self-contained per the above), not one giant borderless SVG — so exporting and printing directly from the app produce identical, individually-usable sheets. A single-page pattern exports as one plain SVG.
- **SVG element structure** (row/cell grouping, symbol glyphs, numbering as text elements) shares the same cell-renderer as the on-screen editor, per the [tech-stack decision](10-tech-stack.md) — mechanical given that prior decision, not a fresh judgment call here.
- Row/column numbers shown on each page reflect their **absolute position** in the full pattern (not renumbered per page), consistent with the page-range header and needed for correct assembly.
