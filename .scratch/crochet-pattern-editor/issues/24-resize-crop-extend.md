# 24 — Resize/crop-extend the grid

**What to build:** A resize dialog with one signed number field per edge (top/bottom/left/right) — positive grows, negative shrinks — applied together as a single action. Growth only pads Blank cells at the grid's edges, never reflowing existing content. Shrinking that only removes already-blank space applies immediately; shrinking that would discard stitched Cells requires a confirmation naming how many cells will be lost.

**Blocked by:** 22

**Status:** resolved

- [x] Resize dialog offers a signed field per edge (top/bottom/left/right); all four apply together as one action
- [x] Growing an edge pads new Blank cells at that edge only — existing design content keeps its absolute position, never reflowed
- [x] The resulting dimensions after resize are still bounded to 1–500 per side
- [x] Shrinking that only removes cells that are already Blank applies immediately, no confirmation
- [x] Shrinking that would discard any stitched (non-Blank) Cell shows a confirmation naming the count of cells that will be lost, before applying
- [x] The whole resize (all four edges) is one undo step
- [x] Store action API tests cover: growing each edge independently and in combination, shrinking Blank-only space (no confirmation path exercised), shrinking that would discard stitched cells (confirmation-required path and the resulting cell-loss count), bounds enforcement at 1 and 500, and the single-undo-step guarantee

## Comments

Implemented in [app/](../../../app/) — `src/model/resize.ts` (`previewResize`/`resizePattern`), `previewResize`/`applyResize` actions in `src/store/editorStore.ts` (new `'resize'` Command kind), `src/components/ResizeDialog.tsx`. Verified live in-browser (grow top by 2 shifted content correctly, shrink-with-loss showed the exact count and required confirmation, undo reverted the whole resize as one step) and via `src/model/resize.test.ts` / `src/store/editorStore.test.ts`. Commit: `75d27da`.
