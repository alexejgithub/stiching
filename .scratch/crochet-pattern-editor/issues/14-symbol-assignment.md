# Design symbol-assignment system

Type: grilling
Blocked by: 11
Status: resolved

## Question

Given every palette entry needs an auto-assigned symbol ([Cell representation](09-cell-representation.md)), what's the symbol library (how many distinct symbols, how are they drawn at small cell sizes), how are they auto-assigned to new palette entries (order added, visual-distinctiveness rules), can a user override the auto-assignment, and what happens when a pattern has more colors than available distinct symbols?

## Answer

- **Library size**: 14 distinct symbols, fixed and hand-picked (not procedurally generated) — e.g. dot, cross, triangle, square, diamond, plus, asterisk, wave, etc. 14 comfortably covers typical C2C/mosaic color counts without straining visual distinctiveness.
- **Legibility at small sizes**: design principle only, not a pinned pixel threshold — glyphs must be hand-drawn/chosen to stay distinguishable at small/dense scale (editor thumbnail zoom, dense print grids). The exact minimum legible cell size is an implementation-time concern for whoever draws the final glyphs, not decidable in the abstract here.
- **Assignment algorithm**: strictly by add-order from a hand-ordered fixed sequence — the Nth palette slot minted gets the Nth symbol in the sequence. The sequence itself is pre-ordered by the designer so the earliest/most-common symbols are maximally distinct from each other; no runtime distinctiveness-scoring logic.
- **User override**: allowed. A slot's `symbolId` (already persisted per [the data model](11-data-model.md)) can be manually reassigned to any of the 14 symbols, including one already used by another slot in the same pattern — no hard block on duplicates.
- **Overflow (>14 colors)**: symbols cycle back to the start of the sequence; color remains the primary disambiguator in normal (non-B&W) use. No warning is shown when this happens — patterns aren't expected to routinely need more than 14 colors.
