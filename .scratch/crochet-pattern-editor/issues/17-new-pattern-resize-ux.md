# Design new-pattern creation & resize/crop-extend UX

Type: grilling
Status: resolved
Blocked by: 11

## Question

Given dimensions are fixed at creation but resizable after ([Grid dimensions](02-grid-dimensions.md)), what does the "New Pattern" dialog ask for and default to, and how does the resize/crop-extend operation work — where do added rows/columns get inserted (edges only, or anywhere), and what happens to existing cell content when shrinking (crop, with or without a confirmation/preview)?

## Answer

**New Pattern dialog**: name + rows + columns only — no starting palette (palette is built in the editor after creation). Rows/columns default to 20x20, with enforced bounds of 1-500 per side (guards against typos and runaway dense-array size, not against real pattern sizes). Grid starts fully blank (all cells `null`).

**Resize/crop-extend operation**: a single "Resize Pattern" dialog with one signed number field per edge (top/bottom/left/right) — positive adds rows/columns, negative removes them. All four edges are set and applied together as one commit (one undo step, per [Undo/redo architecture](13-undo-redo-architecture.md)'s command-log model). New rows/columns from growing are only ever added at the four edges (no arbitrary mid-grid insertion), padded with blank cells — this is pure padding, no reflow of existing content, matching how these patterns are actually extended. The same 1-500-per-side bounds from the New Pattern dialog apply to the resulting dimensions.

**Shrinking**: if every cell in the region being removed is blank, the crop applies silently — no data lost, no friction. If any stitched (non-blank) cell would be discarded, a confirmation dialog names the loss (e.g. "12 stitched cells will be removed") before proceeding. No live visual preview for v1 — that's a heavier interactive drag-handle UI that isn't worth the build cost here.
