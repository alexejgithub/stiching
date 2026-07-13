# 20 — Palette editor: Slots with auto-assigned symbols

**What to build:** The palette editing UI and store actions that let a crafter build up their color palette as they work: add a Slot by hex + label, see it get a distinct symbol automatically, override that symbol, rename/recolor an existing Slot with every painted Cell updating to match, reorder the palette safely, and be blocked from deleting a Slot that's still in use (with a clear reason and a "clear those cells first" option).

**Blocked by:** 19

**Status:** resolved

- [x] Adding a Slot takes a hex value and a label
- [x] Each newly added Slot automatically receives a symbol from a fixed, pre-ordered 14-symbol sequence, assigned strictly in add-order (the Nth Slot ever minted gets the Nth symbol)
- [x] Past 14 Slots, symbol assignment cycles back to the start of the sequence rather than erroring
- [x] A Slot's symbol can be overridden to any symbol in the library, including one already used by another Slot (unrestricted, duplicates allowed); the override is stored on the Slot (not re-derived at render time) and survives palette reordering
- [x] Renaming or recoloring an existing Slot updates every Cell already painted with that Slot automatically (since Cells reference the Slot by id, not by copied value)
- [x] Reordering the palette changes only the list order (legend/picker display), never what color any existing Cell shows
- [x] Deleting a Slot still referenced by any Cell is blocked, with a clear reason shown and an option to clear those cells first as part of the delete flow
- [x] Deleting an unreferenced Slot succeeds normally
- [x] Store action API tests cover: add (symbol assignment across 1, 14, and 15+ Slots), override (including duplicate), rename/recolor propagation to painted Cells, reorder not mutating Cell references, and the delete-blocked-while-referenced path (including the clear-cells-first option)

## Comments

Implemented in [app/](../../../app/) — `src/model/symbols.ts`, `src/model/palette.ts`, `src/components/PaletteEditor.tsx`, wired into `src/store/editorStore.ts`. Verified live in-browser and via `src/model/palette.test.ts` / `src/store/editorStore.test.ts`. Commit: `5caa63c`.
