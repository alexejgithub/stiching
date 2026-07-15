# Import Image (spec)

Status: ready-for-agent

Synthesized from the [Image Import for Crochet Pattern Editor map](.scratch/crochet-image-import/map.md) and its five resolved tickets ([01](issues/01-quantization-research.md)/[01 findings](issues/01-quantization-research-findings.md), [02](issues/02-pixelation-quantization-pipeline.md), [03](issues/03-import-flow-prototype.md), [04](issues/04-data-model-integration.md), [05](issues/05-file-format-size-support.md)). No further decisions are open — this document is ready to hand to implementation.

## Problem Statement

A crafter using the crochet pattern editor can only build a pattern cell-by-cell by hand, or open an existing `.crochet` file. There's no way to start from a photo. Turning a photo into a corner-to-corner/mosaic-style crochet chart today means manually eyeballing colors and grid placement one cell at a time — slow and error-prone, and it's the single biggest friction point for anyone who wants to crochet a photo-realistic design rather than a pattern they drew from scratch.

## Solution

A new "Import Image" entry point, separate from "New Pattern," that always creates a brand-new pattern from an uploaded photo:

1. Crafter clicks "Import Image" (next to "New Pattern," reachable from both the landing screen and the editor header) and picks a photo.
2. They crop it to their chosen grid's aspect ratio (rows × columns, reusing the existing New Pattern dialog's 1–500 bounds).
3. A live preview re-pixelates and re-quantizes instantly as they adjust target size and a color-count slider (1–8, a ceiling not a guarantee).
4. "Create Pattern" commits — the palette is auto-generated only, no in-flow color editing (the existing palette editor handles that afterward).

The source image is discarded after commit. The resulting pattern is a normal `Pattern` — same data model, same export/print, no new persisted fields — indistinguishable from a hand-drawn or `.crochet`-imported one.

## User Stories

1. As a crafter on the landing screen, I want an "Import Image" button next to "New Pattern," so that I can start a pattern from a photo without it being confused with the blank-grid flow.
2. As a crafter already in the editor, I want the same "Import Image" entry point in the editor header, so that I can replace my in-progress pattern with an imported one without returning to the landing screen.
3. As a crafter, I want to pick any common photo file (JPEG, PNG, GIF, WebP, and anything else my browser can decode), so that I'm not blocked by an arbitrary format whitelist.
4. As a crafter who selects an unsupported or corrupted file, I want a clear inline error message, so that I understand the import failed without losing my current in-progress pattern.
5. As a crafter who selects a very large file (over 25 MB), I want a clear inline error naming the size limit, so that I understand why the import was rejected before the browser hangs trying to decode it.
6. As a crafter, I want to crop my photo with a drag-to-move, drag-corner-to-resize box constrained to my chosen grid's aspect ratio, so that the final pattern isn't stretched or letterboxed.
7. As a crafter, I want the crop box's aspect ratio to update live if I change rows/columns, so that I don't have to re-crop from scratch after changing my mind about grid size.
8. As a crafter, I want a live pixelated preview that updates instantly as I drag the color-count slider (1–8), so that I can see the tradeoff between color count and visual fidelity before committing.
9. As a crafter who requests more colors than the crop actually contains, I want the palette to just come back shorter, so that I'm not blocked or shown a padded/duplicated palette on a low-color-variety photo.
10. As a crafter whose photo is smaller than my chosen target grid, I want the import to still work (just blockier/blurrier), so that a small or low-res photo isn't an error.
11. As a crafter, I want a name field as the final step before committing, so that I can name my pattern the same way I would with New Pattern.
12. As a crafter, once I click "Create Pattern," I want to land in the same editor, with the same autosave behavior, as if I'd used New Pattern or imported a `.crochet` file, so that an imported pattern behaves identically to any other pattern from that point on.
13. As a crafter, I want each extracted color to become an editable palette slot (default-labeled "Color 1," "Color 2," ...) with an auto-assigned symbol, so that I can rename, recolor, or reassign symbols afterward using the existing palette editor.
14. As a crafter using touch or stylus, I want the crop interaction to work the same way it does with a mouse (full parity for stylus; touch just needs to not break), consistent with the rest of the editor's touch/stylus support.

## Implementation Decisions

**Quantization approach** ([ticket 01](issues/01-quantization-research.md)):
- Library: `colorthief` (`getPaletteSync` for 2–8 colors; `getColorSync` as a one-line special case when the requested count is exactly 1, since `colorthief`'s `colorCount` option only accepts 2–20).
- Algorithm family: MMCQ (Modified Median Cut Quantization), `colorthief`'s default — the lowest-risk choice at k≤8 per the research.
- Performance: after the crop is finalized, downscale the cropped region once into an offscreen canvas capped at ~200–300px on its longest side — sized independently of the target grid, only needing to exceed the largest supported grid dimension. Cache that downscaled buffer. Every color-count *and* grid-size slider tick re-quantizes/re-samples only against the cached buffer, never the original photo or a fresh full-resolution read. Only a new crop or a new source photo re-triggers the downscale.

**Pixelation & quantization pipeline** ([ticket 02](issues/02-pixelation-quantization-pipeline.md)):
- Order of operations: quantize-first. Build the global ≤N-color palette from the cached downscaled buffer; the grid-size (rows × cols) step only resamples cells against that already-built palette, so changing grid size doesn't require re-quantizing.
- Per-cell sampling: the mean color of all source pixels inside a target cell's region, snapped to the nearest palette entry (not mode, not single-pixel sampling).
- Under-supply behavior: the color-count slider is a ceiling, not a guarantee. If a crop has fewer genuinely distinct colors than requested, the palette comes back shorter — no padding, no forced minimum.

**UI flow** ([ticket 03](issues/03-import-flow-prototype.md), prototyped on throwaway branch `prototype/ticket-03-import-flow`, commit `8f9ed92` — reference only, not to be merged as-is):
- Entry point: a new "Import Image" button placed next to "New Pattern," present on both the landing screen and the editor header (mirroring the existing `ImportControl`'s "reachable from both places" convention).
- Shape: a modal wizard styled like the existing `NewPatternDialog`, three steps in order:
  1. **Crop** — rows/columns inputs (reusing the 1–500 bounds from `pattern.ts`/[ticket 17](../crochet-pattern-editor/issues/17-new-pattern-resize-ux.md)) above a drag-to-move, drag-corner-to-resize crop box constrained to that aspect ratio, clamped to the image's bounds.
  2. **Preview & Colors** — the live pixelated preview alongside the 1–8 color-count slider and palette swatches.
  3. **Name & Create** — a name field (own step, not reusing the New Pattern dialog directly, though visually consistent with it) and the "Create Pattern" button.
- The prototype's other two variants (split-screen all-live, fullscreen immersive) were rejected in favor of the wizard's simpler, sequenced steps.

**Data model integration** ([ticket 04](issues/04-data-model-integration.md), building on the `Pattern`/`Slot`/`Cell` schema in [ticket 11](../crochet-pattern-editor/issues/11-data-model.md) and [ADR-0001](../../docs/adr/0001-slot-id-references.md)):
- Each distinct extracted color becomes a new `PaletteSlot` via the existing `addSlot` function (`app/src/model/palette.ts`), called once per distinct color in extraction order — unchanged, no import-specific variant.
- Default label: `"Color 1"`, `"Color 2"`, ... by add-order (there's no semantic name to derive from an arbitrary photo's hex values).
- Symbol assignment: falls out of `addSlot` for free — it already assigns `symbolId` strictly by add-order (`(nextSlotId - 1) % SYMBOLS.length`), identical to [ticket 14](../crochet-pattern-editor/issues/14-symbol-assignment.md)'s algorithm. No new symbol logic.
- Commit path: (1) call `addSlot` once per distinct extracted color to mint the palette and slot ids, (2) map each quantized cell's color to its slot id to build the `grid`, (3) call the existing `replacePattern(pattern)` store action (`app/src/store/editorStore.ts`) — the same action already used for `.crochet` file import and autosave boot-load, not a new store action — and (4) immediately call `savePattern`, mirroring the New Pattern flow's immediate-save-not-waiting-for-debounce behavior. The pattern's name comes from the wizard's final step. No new persisted fields.

**File format, size, and error handling** ([ticket 05](issues/05-file-format-size-support.md)):
- Accepted formats: `<input accept="image/*">` with no hardcoded format whitelist — the browser's own `<img>` decoder is the source of truth (`onload` = accepted, `onerror` = rejected). The accepted set grows automatically as browsers add codecs.
- Size cap: a single 25 MB file-size cap, checked before attempting to load the file. No separate pixel-dimension cap — nothing downstream scales with source resolution once the ~200–300px analysis-cache downscale (ticket 01) applies, so the cap exists only to guard against a pathological file, not normal camera photos.
- Errors: unsupported-type and corrupt/unreadable-file both surface as one generic message via `onerror` (no attempt to distinguish the two). Over-the-cap files are rejected before decode with a message naming the limit. Both use the same display convention as existing `.crochet` import errors: an inline `<p role="alert">` next to the trigger, with the current in-progress pattern left untouched.
- An image smaller than the target grid is explicitly **not** an error — no minimum enforced; the result is just blockier/blurrier (consistent with the "ceiling not guarantee" philosophy above).

**Touch/stylus** (map Notes, deferring to [ticket 07](../crochet-pattern-editor/issues/07-touch-stylus-parity.md)): the crop interaction needs full parity for stylus; bare-finger touch just needs to not break.

## Testing Decisions

Following this codebase's existing convention of testing pure model-layer functions directly rather than through components or the DOM (see `app/src/model/pattern.test.ts`, `app/src/model/resize.test.ts`, `app/src/persistence/file.test.ts`):

- **Pattern construction** — a pure function (e.g. `createPatternFromImport(name, cells, palette)` → `Pattern`, mirroring `createPattern` in `app/src/model/pattern.ts`) is the seam that verifies the data-model integration decisions above: palette slots minted via `addSlot`, `"Color N"` labels, grid cells referencing the correct slot ids. No image/canvas APIs involved — same style of test as `pattern.test.ts`'s `createPattern` suite.
- **Quantization** — the pipeline from ticket 02 should be implemented as a pure array-in/array-out function (sampled pixel grid → snapped grid + palette), not one that takes `HTMLImageElement`/`Canvas` objects directly, so it's testable with plain synthetic pixel data the same way `resize.test.ts` tests grid transforms — no jsdom canvas faking required.
- **Not unit-tested directly**: file loading, the crop drag interaction, and the canvas `drawImage` sampling glue that feeds the quantization function. These are thin, DOM-only edges — verify them live in-browser (crop drag, live preview updating, error states) rather than through automated tests, consistent with how the UI prototype itself was verified.

## Out of Scope

- Combining multiple images into a single pattern — single-image import only.
- Keeping the source image for later re-pixelation (changing crop/size/color-count without re-uploading) — the source image is discarded after "Create Pattern" commits. Re-importing means re-uploading the file.
- In-flow palette editing (merging/renaming/hex-editing extracted colors before commit) — the extracted palette is auto-generated and read-only during import; the existing palette editor handles edits afterward.
- Real yarn-catalog integration, backend/accounts/cloud sync — inherited from the v1 map's scope boundary.
- A hardcoded image-format whitelist, and a pixel-dimension cap separate from the file-size cap (both explicitly decided against in ticket 05).
- Enforcing a minimum source-image resolution relative to the target grid (explicitly decided against in ticket 05).

## Further Notes

- The full decision history and rationale for each item above lives in the linked tickets — this spec is the synthesized, implementation-ready summary, not a replacement for them.
- The three-variant UI prototype (modal wizard, split-screen, fullscreen immersive) is preserved on throwaway branch `prototype/ticket-03-import-flow` for reference; it was never merged to `master` and shouldn't be treated as production-ready code even for the winning variant (written under prototype constraints — no tests, minimal error handling).
- Reuses existing infrastructure throughout rather than introducing parallel systems: `NewPatternDialog`'s dialog styling, `pattern.ts`'s `MIN_DIMENSION`/`MAX_DIMENSION` bounds, `addSlot`'s symbol-assignment behavior, and the `replacePattern` + `savePattern` commit path already shared by `.crochet` import and autosave boot-load.
