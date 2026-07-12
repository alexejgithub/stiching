# Tool scope

Type: grilling
Status: resolved

## Question

Do "select, rotate, move, mirror" operate on a selected region, or only on the whole pattern at once?

## Answer

Selection-based, Aseprite-style: a marquee selects a rectangular region of cells, and rotate/move/mirror act on that selection. Whole-pattern transforms are just the trivial "select all" case, not a separate mode. This unlocks real crochet workflows like designing one quadrant of a symmetric motif and mirroring it to fill the rest.
