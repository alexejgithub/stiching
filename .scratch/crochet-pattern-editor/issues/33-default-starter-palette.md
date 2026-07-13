# 33 — Seed new patterns with a default 8-color starter palette

**Requested by:** user, 2026-07-13

**Status:** ready-for-agent

## What to build

Today `createPattern` ([pattern.ts](../../../app/src/model/pattern.ts)) always starts a brand-new pattern with `palette: []` — every color has to be added by hand via the palette editor before the user can paint a single cell. Seed new patterns with 8 default colors spread evenly around the hue spectrum instead, so a user can start painting immediately and edit/rename/delete/recolor from there like any other slot.

Suggested 8 hues (evenly spaced, high-contrast, colorblind-friendlier than a raw rainbow — from the well-known Trubetskoy distinct-color set, free to substitute exact hexes at implementation time as long as they stay evenly spread around the wheel and mutually distinguishable):

| # | Label   | Hex       |
| - | ------- | --------- |
| 1 | Red     | `#e6194B` |
| 2 | Orange  | `#f58231` |
| 3 | Yellow  | `#ffe119` |
| 4 | Green   | `#3cb44b` |
| 5 | Cyan    | `#42d4f4` |
| 6 | Blue    | `#4363d8` |
| 7 | Purple  | `#911eb4` |
| 8 | Magenta | `#f032e6` |

## Scope

- Seed only applies to genuinely **new** patterns (the `createPattern` path used by `NewPatternDialog` → `store.newPattern`, per [ticket 19](19-scaffold-data-model-new-pattern.md)).
- Does **not** apply to `replacePattern` — imported patterns ([ticket 26](26-file-export-import.md)) and autosave boot-load ([ticket 25](25-autosave-indexeddb.md)) restore an already-authored palette (including a deliberately empty one) and must not have colors injected on top of it.
- The 8 slots are ordinary `Slot`s — freeform hex + label per [ticket 01](01-palette-model.md), auto-assigned symbols 1–8 from `SYMBOLS` in add-order per [ticket 14](14-symbol-assignment.md) (so they get the first 8 of the 14 hand-picked glyphs). Fully editable/renamable/recolorable/deletable afterward through the existing palette editor — nothing about them is special-cased once created.
- `nextSlotId` must end up at `9` after seeding, so the next user-added slot doesn't collide with or skip a ready-made id.

## Acceptance criteria

- [ ] `createPattern` returns a pattern with 8 pre-populated palette slots at the hues above (or an equivalently spread substitute), correct auto-assigned symbols, and `nextSlotId = 9`
- [ ] `NewPatternDialog` → `store.newPattern` flow shows the 8 colors ready to paint with immediately, no palette-editor trip required first
- [ ] Imported (`.crochet` file) and autosave-restored patterns are unaffected — their saved palette (including empty) is preserved exactly
- [ ] Each default slot behaves identically to a manually-added slot: renamable, recolorable, reorderable, deletable (including the "in use" block/clear-cells prompt)
- [ ] A test in `pattern.test.ts` (or wherever `createPattern` is covered) asserts the seeded palette's length, hexes, symbol ids, and resulting `nextSlotId`
