# Crochet Pattern Editor

A client-side, browser-based editor for hand-drawn pixel-grid crochet patterns (corner-to-corner, tapestry/mosaic style).

## Language

**Pattern**:
The top-level saved artifact — a named, fixed-size grid of cells plus the palette of slots it draws from.

**Slot**:
A palette entry: a color (hex) + user label + auto-assigned symbol, referenced by cells. Modeled as a distinct object (not a bare color) so a real-yarn-SKU field can be added later without migrating saved patterns.
_Avoid_: Palette entry, color, swatch.

**Cell**:
One square of the grid. Either blank or holds a reference to a Slot.

**Blank** (cell):
A cell with no stitch — deliberately unstitched, distinct from "not yet colored." Needed for non-rectangular motifs (e.g. a diamond) drawn inside the rectangular grid.
