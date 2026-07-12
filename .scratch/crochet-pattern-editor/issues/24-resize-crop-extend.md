# 24 — Resize/crop-extend the grid

**What to build:** A resize dialog with one signed number field per edge (top/bottom/left/right) — positive grows, negative shrinks — applied together as a single action. Growth only pads Blank cells at the grid's edges, never reflowing existing content. Shrinking that only removes already-blank space applies immediately; shrinking that would discard stitched Cells requires a confirmation naming how many cells will be lost.

**Blocked by:** 22

**Status:** ready-for-agent

- [ ] Resize dialog offers a signed field per edge (top/bottom/left/right); all four apply together as one action
- [ ] Growing an edge pads new Blank cells at that edge only — existing design content keeps its absolute position, never reflowed
- [ ] The resulting dimensions after resize are still bounded to 1–500 per side
- [ ] Shrinking that only removes cells that are already Blank applies immediately, no confirmation
- [ ] Shrinking that would discard any stitched (non-Blank) Cell shows a confirmation naming the count of cells that will be lost, before applying
- [ ] The whole resize (all four edges) is one undo step
- [ ] Store action API tests cover: growing each edge independently and in combination, shrinking Blank-only space (no confirmation path exercised), shrinking that would discard stitched cells (confirmation-required path and the resulting cell-loss count), bounds enforcement at 1 and 500, and the single-undo-step guarantee
