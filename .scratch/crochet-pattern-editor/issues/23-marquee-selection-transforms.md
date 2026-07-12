# 23 — Marquee selection with rotate, mirror, and move

**What to build:** The selection-lift-transform-stamp interaction validated in the throwaway prototype (`prototype-editor/`, `src/pattern.ts`), built for real: drag out a rectangular marquee (select-all as the trivial whole-grid case), then rotate 90° CW/CCW, flip horizontal/vertical, or move the floating selection by drag or arrow-key nudge. A transform that would push part of the selection out of grid bounds is blocked or clamped — never silently truncated. The floating selection commits back into the grid on Escape, on starting a new marquee, or on switching tools, going through ticket 22's undo log as one step per commit.

**Blocked by:** 22

**Status:** ready-for-agent

- [ ] Dragging out a rectangular marquee selects that region of cells
- [ ] Starting a new marquee drag replaces the current selection (no add/subtract modifiers)
- [ ] "Select all" is available as the trivial whole-grid case of the same tool
- [ ] Rotating the selection 90° clockwise or counter-clockwise works (dimension swap included)
- [ ] Flipping the selection horizontally and flipping vertically are separate actions
- [ ] Dragging the selection repositions it; arrow keys nudge it one cell at a time
- [ ] A rotate, mirror, or move that would push part of the selection outside the grid is blocked or clamped to the nearest in-bounds position — cell content is never truncated/discarded silently (covers the prototype's validated 1×5-strip-near-edge case)
- [ ] The floating selection commits back into the grid on Escape, on starting a new marquee, and on switching tools
- [ ] Committing a transformed selection back into the grid is one undo step through the same log as paint/palette actions
- [ ] Undo/redo continues to never touch selection state (confirms ticket 22's contract holds once selection exists)
- [ ] Marquee/rotate/mirror/move are driven through Pointer Events, matching ticket 21's precision parity for mouse and stylus
- [ ] Store action API tests cover: marquee selecting a region and select-all, replace-on-new-drag, rotate CW/CCW correctness, flip H/V correctness, move by drag and by nudge, the clamp-not-truncate edge case, and commit-on-escape/new-marquee/tool-switch each producing one undo step
