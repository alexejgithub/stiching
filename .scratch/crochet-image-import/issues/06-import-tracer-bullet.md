# 06 — Import a photo straight into a pattern (tracer bullet)

**What to build:** An "Import Image" entry point, next to "New Pattern" on the landing screen and in the editor header, that lets a crafter pick a photo and land in the editor with a real `Pattern` built from it — no crop step and no adjustable grid size/color count yet (a fixed default grid size and color count, quantizing the whole photo). This is the thin, complete, end-to-end slice every later ticket builds on: file picking, validation/errors, the pure quantization function, the pure pattern-construction function, and the commit path all land here.

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] An "Import Image" button appears next to "New Pattern" on both the landing screen and the editor header
- [x] Picking a file uses `accept="image/*"` with no hardcoded format whitelist; the browser's own `<img>` decode (`onload`/`onerror`) is the sole accept/reject signal
- [x] Files over 25 MB are rejected before attempting to decode, with an inline error message naming the limit
- [x] Unsupported or corrupt/unreadable files (decode failure) show one generic inline error message; the two failure modes are not distinguished
- [x] Errors display the same way `.crochet` import errors do today — an inline `<p role="alert">` next to the button — and leave any current in-progress pattern untouched
- [x] On a valid file, the (now croppable, ticket 07) image is quantized at the app's default grid size and a default color count on load, via a pure quantization function (pixel grid in → snapped grid + palette out, no `HTMLImageElement`/`Canvas` types in its signature) — tickets 07/08 landed together with this one, so grid size/color count/crop start at these defaults and are adjustable before commit rather than fixed
- [x] A name step (default text, editable) precedes commit
- [x] Committing calls a pure `createPatternFromImport`-style function (cells + palette + name → `Pattern`) that mints each distinct extracted color as a new `PaletteSlot` via the existing `addSlot` (unchanged), default-labeled `"Color 1"`, `"Color 2"`, ... by add-order
- [x] Committing then calls the existing `replacePattern` store action (the same one `.crochet` import and autosave boot-load already use) followed by an immediate `savePattern` — no new store action, no new persisted `Pattern` fields
- [x] After commit, the user lands in the same editor, in the same state, as New Pattern or `.crochet` import would produce
- [x] The quantization function has unit tests, using synthetic pixel data, asserting: quantize-first order of operations, mean-of-source-pixels-per-cell snapped to nearest palette entry, and a palette shorter than requested on low-color-variety input (no padding)
- [x] The pattern-construction function has unit tests asserting palette slots are minted in extraction order with correct default labels and correct (add-order) symbol ids, matching the existing `addSlot`/symbol-assignment behavior

## Implementation notes

Implemented together with [ticket 07](07-crop-step.md) and [ticket 08](08-live-preview-color-slider.md) in one pass rather than landing the "whole photo, fixed defaults" milestone separately, since all three were ready-for-agent and building the end state directly avoided throwing away UI code.

- `app/src/model/quantize.ts` — pure `quantizeImage(pixels, targetRows, targetCols, colorCount)`. Uses `colorthief`'s bundled MMCQ (`MmcqQuantizer` from `colorthief/internals`) for the actual median-cut, per [ticket 01](01-quantization-research.md)'s recommendation. Its box-splitting has no base case for a single-histogram-bucket box that still holds >1 pixel (e.g. a solid-color crop) — asked to split further than the real color variety allows, it degenerates into near-duplicate palette entries instead of stopping. Worked around by clamping the requested color count to the number of 5-bit histogram buckets actually present before calling it (`extractPalette`/`countDistinctBuckets`), which is also what makes "palette comes back shorter, no padding" hold for genuinely low-variety crops. `colorthief/internals` also bundles an optional `WasmQuantizer` with a static `import()` of a wasm build the package never actually ships; Vite's import-analysis eagerly resolves that at transform time and fails even though it's never called. Worked around with a `resolve.alias` in `vite.config.ts` pointing the exact broken specifier at an empty stub (`app/src/stubs/colorthief-wasm-stub.ts`).
- `app/src/model/importPattern.ts` — pure `createPatternFromImport(name, cells, palette)`.
- `app/src/model/imageSampling.ts` / `app/src/model/crop.ts` — DOM/canvas glue and crop-box geometry respectively (not unit-tested per the spec's Testing Decisions, except `crop.ts`'s pure aspect-lock/resize/clamp math, which got its own tests since it's genuinely pure).
- `app/src/components/ImportImageControl.tsx`, `ImportImageDialog.tsx`, `CropBox.tsx` — the three-step wizard (Crop → Preview & Colors → Name & Create) and entry-point button, wired into `App.tsx` next to the existing `.crochet` `ImportControl` on both the landing screen and editor header.

Verified live in the browser (Browser pane screenshot capture was broken this session, so verification was done via `read_page`/`get_page_text`/`javascript_tool` DOM inspection and synthetic `File`/`PointerEvent` dispatch instead): oversized-file rejection, corrupt-file rejection (both leave the current pattern untouched), a two-color test image producing a 2-entry palette, a narrowed crop producing a correctly-shorter 1-entry palette (no padding), live rows/cols aspect retargeting of the crop box, drag-move with clamping, color-count slider re-quantizing the cached buffer, and a full create → lands in the editor → persists across reload. Full suite (196 tests) and `tsc -b` clean.
