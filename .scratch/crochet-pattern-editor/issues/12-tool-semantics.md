# Define tool semantics in detail

Type: grilling
Blocked by: 11
Status: resolved

## Question

Given tools act on a marquee-selected region ([Tool scope](03-tool-scope.md)), what exactly are the interaction details: how is a selection made and shown (drag marquee, keyboard modifiers for add/subtract)? What rotate increments are allowed (90-degree steps only, given a stitch grid)? What mirror axes are offered (horizontal, vertical, both)? How does "move" work (drag the selection, arrow-key nudge, both)? What happens when a rotate/mirror would take the selection outside the grid bounds?

## Answer

- **Selection shape: rectangle-only marquee.** Drag defines a rectangular region of cells. No freeform/lasso selection in v1 — rotating or mirroring a non-rectangular region is ambiguous, and a rectangle covers every corner-to-corner/mosaic editing need. Freeform selection is noted as a v2 candidate.
- **Selection is replace-only.** Every new marquee drag replaces the current selection; there are no shift/alt add-or-subtract modifiers. Keeps the selection guaranteed rectangular and the interaction model simple. A larger or combined area is just a bigger single drag.
- **Move: drag or arrow-key nudge, both supported.** Dragging the selection repositions it coarsely (and is the natural touch/stylus gesture, keeping parity with [Touch/stylus input parity](07-touch-stylus-parity.md)); arrow keys nudge the selection by one cell at a time for precise repositioning.
- **Rotate: 90° steps only, both directions.** Two distinct actions — rotate clockwise and rotate counter-clockwise — each a 90° step. No finer increments: a stitch grid has no sub-cell resolution, so only multiples of 90° keep every cell grid-aligned. Offering both directions avoids forcing three taps of a single button to go the other way.
- **Mirror: flip-horizontal and flip-vertical, as two separate actions.** No separate diagonal/transpose mirror — that only makes clean sense on a square selection and isn't a common crochet-motif need.
- **Bounds handling: block/clamp, never truncate.** If a rotate, mirror, or move would push part of the selection outside the grid, the action is disallowed or the result is clamped to the nearest in-bounds position. Cell content is never silently discarded — losing part of a hand-authored motif off the edge would be a bad, hard-to-notice failure mode.
