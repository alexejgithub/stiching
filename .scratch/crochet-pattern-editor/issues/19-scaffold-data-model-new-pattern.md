# 19 — Scaffold app, Pattern data model, and New Pattern flow with shared grid renderer

**What to build:** A working React + TypeScript + Vite app (Zustand store, no backend) that lets a crafter open the app, click New Pattern, name it and choose rows × columns, and land on a blank grid rendered with crochet-convention numbering — static column numbers along the top, row numbers alternating sides by parity (odd right, even left). This ticket also establishes the `Pattern`/`Slot`/`Cell` data model (Cells reference Slots by stable id per ADR-0001, never by array position) and the shared SVG per-cell grid-renderer module that every later ticket (paint, selection, export/print) will render through, so the live editor and the print output can never visually drift apart.

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] New Pattern dialog asks for name, rows, and columns only
- [x] Dialog defaults to 20×20
- [x] Rows and columns are each bounded to 1–500; an out-of-range value (e.g. an extra zero) is rejected rather than silently creating an oversized grid
- [x] A newly created Pattern starts fully blank (empty palette, every Cell blank) — no leftover state from a prior session
- [x] The Pattern's top-level `id` is a `crypto.randomUUID()`; Slot ids are minted from a per-Pattern monotonically increasing `nextSlotId` counter (not yet exercised until ticket 20, but present in the schema)
- [x] Cells store a reference to a Slot's stable id (or null for Blank), never a position into the palette array
- [x] The grid renders via one shared SVG rendering module (not duplicated between screens), one element per cell
- [x] Column numbers appear along the top of the grid, consistent regardless of row
- [x] Row numbers alternate sides by parity: odd rows numbered on the right, even rows on the left
- [x] Store action API (or the pure functions it wraps) has tests asserting the resulting `Pattern` state for: creating a pattern at valid/boundary/out-of-bounds dimensions, and the blank initial state

## Comments

Implemented in [app/](../../../app/) — `src/model/pattern.ts`, `src/render/gridRenderer.ts`, `src/store/editorStore.ts`, `src/components/NewPatternDialog.tsx`. Verified live in-browser (New Pattern dialog → blank grid with correct numbering) and via `src/model/pattern.test.ts` / `src/render/gridRenderer.test.ts`. Commit: `cd4a04c`.
