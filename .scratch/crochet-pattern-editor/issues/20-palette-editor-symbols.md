# 20 — Palette editor: Slots with auto-assigned symbols

**What to build:** The palette editing UI and store actions that let a crafter build up their color palette as they work: add a Slot by hex + label, see it get a distinct symbol automatically, override that symbol, rename/recolor an existing Slot with every painted Cell updating to match, reorder the palette safely, and be blocked from deleting a Slot that's still in use (with a clear reason and a "clear those cells first" option).

**Blocked by:** 19

**Status:** ready-for-agent

- [ ] Adding a Slot takes a hex value and a label
- [ ] Each newly added Slot automatically receives a symbol from a fixed, pre-ordered 14-symbol sequence, assigned strictly in add-order (the Nth Slot ever minted gets the Nth symbol)
- [ ] Past 14 Slots, symbol assignment cycles back to the start of the sequence rather than erroring
- [ ] A Slot's symbol can be overridden to any symbol in the library, including one already used by another Slot (unrestricted, duplicates allowed); the override is stored on the Slot (not re-derived at render time) and survives palette reordering
- [ ] Renaming or recoloring an existing Slot updates every Cell already painted with that Slot automatically (since Cells reference the Slot by id, not by copied value)
- [ ] Reordering the palette changes only the list order (legend/picker display), never what color any existing Cell shows
- [ ] Deleting a Slot still referenced by any Cell is blocked, with a clear reason shown and an option to clear those cells first as part of the delete flow
- [ ] Deleting an unreferenced Slot succeeds normally
- [ ] Store action API tests cover: add (symbol assignment across 1, 14, and 15+ Slots), override (including duplicate), rename/recolor propagation to painted Cells, reorder not mutating Cell references, and the delete-blocked-while-referenced path (including the clear-cells-first option)
