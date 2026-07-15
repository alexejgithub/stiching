# Design palette/pattern data-model integration

Type: grilling
Blocked by: None
Status: resolved

## Question

Once the pixelation/quantization pipeline (see [ticket 02](02-pixelation-quantization-pipeline.md)) has produced a grid of cell colors and a ≤8-color palette, how does that become a real `Pattern` in the existing data model ([ticket 11](../../crochet-pattern-editor/issues/11-data-model.md))?

- Does each extracted color become a new `PaletteSlot` (hex + label + symbolId)? What's the default label (e.g. "Color 1", or empty for the user to fill in)?
- Does symbol assignment reuse the existing fixed 14-glyph, add-order system unchanged ([ticket 14](../../crochet-pattern-editor/issues/14-symbol-assignment.md)), given imports never exceed 8 colors so the 14-glyph ceiling is never at risk?
- Does the created pattern need a name, and if so is that its own prompt or does it reuse the New Pattern dialog's naming convention?
- Does committing land the user in the same app-state/storage path as the New Pattern flow ([ticket 19](../../crochet-pattern-editor/issues/19-scaffold-data-model-new-pattern.md)'s scaffold, autosaved via [ticket 15](../../crochet-pattern-editor/issues/15-persistence-layer.md)'s IndexedDB layer), so an imported pattern is indistinguishable from a hand-drawn one once created?

## Answer

- **Default label**: each extracted color becomes a new `PaletteSlot` labeled `"Color 1"`, `"Color 2"`, ... by add-order (non-empty, parallel to "Untitled Pattern" as a friendly default elsewhere) — there's no semantic name to derive from an arbitrary photo's hex values.
- **Symbol assignment**: reuses the existing `addSlot` (`src/model/palette.ts`) unchanged, called once per distinct extracted color in extraction order. `addSlot` already assigns `symbolId` strictly by add-order ((`nextSlotId - 1) % SYMBOLS.length`), identical to ticket 14's algorithm, so no import-specific symbol logic is needed — an imported slot goes through the exact same minting path as a manually-added one.
- **Commit path**: build the final `Pattern` by (1) calling `addSlot` once per distinct extracted color to mint the palette + slot ids, (2) mapping each quantized cell color to its slot's id to build the `grid`, (3) calling the existing `replacePattern(pattern)` store action (`src/store/editorStore.ts`) — the same action `.crochet` file import and autosave boot-load already use, not a new store action — and (4) immediately calling `savePattern` right after, mirroring `handleCreatePattern`'s immediate-save-not-waiting-for-debounce behavior. The pattern's name comes from ticket 03's "Name & Create" wizard step. This makes an imported pattern indistinguishable from a hand-drawn or `.crochet`-imported one once created, with no new persisted fields and no new store surface.
