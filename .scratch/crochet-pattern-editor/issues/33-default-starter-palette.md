# 33 — Seed new patterns with a default 8-color starter palette

**Requested by:** user, 2026-07-13

**Status:** resolved

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

- [x] `createPattern` returns a pattern with 8 pre-populated palette slots at the hues above (or an equivalently spread substitute), correct auto-assigned symbols, and `nextSlotId = 9`
- [x] `NewPatternDialog` → `store.newPattern` flow shows the 8 colors ready to paint with immediately, no palette-editor trip required first
- [x] Imported (`.crochet` file) and autosave-restored patterns are unaffected — their saved palette (including empty) is preserved exactly
- [x] Each default slot behaves identically to a manually-added slot: renamable, recolorable, reorderable, deletable (including the "in use" block/clear-cells prompt)
- [x] A test in `pattern.test.ts` (or wherever `createPattern` is covered) asserts the seeded palette's length, hexes, symbol ids, and resulting `nextSlotId`

## Comments

Implemented in [app/](../../../app/) — `src/model/pattern.ts`'s `createPattern` now builds its palette by folding the 8 hues above through `addSlot` (`src/model/palette.ts`) starting from a blank pattern, so seeded slots are minted through the exact same id/symbol-assignment code path as a manually-added slot (id 1-8, `nextSlotId` ends at 9, symbols 0-7 from `SYMBOLS` in add-order) — nothing about them is special-cased. `replacePattern` (`src/store/editorStore.ts`, used by import and autosave boot-load) was left untouched and still assigns the incoming pattern's palette verbatim, including a deliberately empty one.

Verified via:
- `app/src/model/pattern.test.ts` — new `createPattern` test asserting the seeded palette's length, hexes (in order), symbol ids, slot ids, `nextSlotId = 9`, and that no seeded slot carries a yarn link.
- `app/src/store/editorStore.test.ts` — new `newPattern` describe block: one test confirming the store-level seed, and one end-to-end test that paints with a seeded slot then renames/recolors/reorders/deletes it (including the blocked-while-in-use case) to prove it behaves exactly like a hand-added slot. A new `replacePattern` test confirms an incoming pattern with an empty palette stays empty (no seeding injected on top).
- Existing suites that previously assumed `createPattern` returned an empty palette (`app/src/model/palette.test.ts`, the rest of `app/src/store/editorStore.test.ts`) were adjusted to start from an explicit blank palette so they keep testing `addSlot`/`deleteSlot`/paint mechanics in isolation from the new seed, rather than silently drifting to index into the seeded slots instead of the ones they add.
- `npm run typecheck` and `npm test` (`npx vitest run`) both pass: 148 tests across 14 files, 0 failures.
- Ran the `code-review` skill (Standards + Spec sub-agents) against the diff; addressed both real findings it raised: deduplicated the seeded-slot construction to route through `addSlot` instead of reimplementing its id/symbol formula, and added the two test gaps it flagged (end-to-end editability of a seeded slot, and an explicit `replacePattern`-preserves-empty-palette test).

Commit: `<pending>`
