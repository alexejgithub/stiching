# Image Import for Crochet Pattern Editor (spec)

Label: wayfinder:map

## Destination

A written spec (agreed decisions, ready to hand to implementation, no code written by this map) for an **Import Image** feature: a separate entry point from "New Pattern" that always creates a brand-new pattern from an uploaded photo. Flow: upload an image → crop it to a target aspect ratio the user sets as rows × columns (reusing the existing New Pattern dialog's 1–500 bounds, see [ticket 17](../crochet-pattern-editor/issues/17-new-pattern-resize-ux.md)) → a live preview re-pixelates and re-quantizes instantly as the user adjusts target size and a color-count slider (1–8, ceiling of 8) → "Create Pattern" commits. The palette is auto-generated only — no in-flow color editing; use the existing palette editor ([ticket 20](../crochet-pattern-editor/issues/20-palette-editor-symbols.md)) afterward. The source image is discarded after commit, so the resulting pattern is a normal `Pattern` — same data model, same export/print, no new persisted fields.

This is the v2 effort explicitly deferred as out-of-scope from the v1 map (see [Crochet Pattern Editor map](../crochet-pattern-editor/map.md), "Out of scope": "Image upload + automatic pixelation/scaling").

## Notes

- Domain: same as the v1 map — grid/pixel-based crochet patterns (corner-to-corner, tapestry/mosaic style).
- No backend: this stays client-side only, consistent with the v1 tech-stack decision ([ticket 10](../crochet-pattern-editor/issues/10-tech-stack.md) — React + TypeScript + Vite + Zustand, plain SVG grid rendering).
- Existing data model to integrate with ([ticket 11](../crochet-pattern-editor/issues/11-data-model.md)): `Pattern` = dense `Cell[row][col]` grid (`SlotId | null`) + `PaletteSlot[]` (hex, label, symbolId, reserved yarnLink), cells reference slots by stable id per [ADR-0001](../../docs/adr/0001-slot-id-references.md).
- Consult `/domain-modeling` for data-model-shaped tickets, `/grilling` as the default resolution mode, `/prototype` for the UI-feel ticket.
- Touch/stylus: default to the v1 parity bar ([ticket 07](../crochet-pattern-editor/issues/07-touch-stylus-parity.md)) — stylus needs full parity for the crop interaction, bare-finger touch just needs to not break — unless a ticket surfaces a reason to revisit.

## Decisions so far

- [Research client-side color quantization approaches](issues/01-quantization-research.md) — use `colorthief` (`getPaletteSync`/`getColorSync`, median-cut/MMCQ), the best-fit actively-maintained option checked; downscale the cropped image once to ~200–300px on the long edge (independent of target grid size), cache it, and re-quantize only that cache on every slider tick.
- [Design the pixelation & quantization pipeline](issues/02-pixelation-quantization-pipeline.md) — quantize-first (global palette from the cached buffer, grid-size step only resamples against it); per-cell color is the mean of source pixels snapped to nearest palette entry; the color-count slider is a ceiling, not a guarantee (palette comes back shorter on low-color-variety crops, no padding).
- [Prototype the Import Image flow](issues/03-import-flow-prototype.md) — modal wizard (three steps: Crop → Preview & Colors → Name & Create), styled like the existing New Pattern dialog; entry point is a new "Import Image" button next to "New Pattern," reachable from both landing and editor chrome; commit is its own final "Name & Create" step. Prototype code on throwaway branch `prototype/ticket-03-import-flow`.
- [Design palette/pattern data-model integration](issues/04-data-model-integration.md) — extracted colors become `PaletteSlot`s labeled "Color 1", "Color 2", ... via the existing `addSlot` unchanged (symbol assignment falls out for free); commit builds the `Pattern` then calls the existing `replacePattern` store action (same path as `.crochet` import) plus an immediate `savePattern`, no new store surface or persisted fields.
- [Decide file format & size support, and error handling](issues/05-file-format-size-support.md) — `accept="image/*"` with no hardcoded format whitelist, browser's own decoder (`onload`/`onerror`) is the source of truth; single 25 MB file-size cap, no separate pixel-dimension cap; unsupported-type and corrupt-file errors collapse to one generic message shown the same way as `.crochet` import errors; an image smaller than the target grid is not an error (no minimum enforced, degrades to a blockier result).

## Not yet specified

## Out of scope

- Combining multiple images into a single pattern — this effort is single-image import only.
- Keeping the source image for later re-pixelation (changing crop/size/color-count without re-uploading) — decided against; the source image is discarded after "Create Pattern" commits, matching the "always creates a brand-new, ordinary pattern" destination. Re-importing means re-uploading the file.
- In-flow palette editing (merging/renaming/hex-editing extracted colors before commit) — the extracted palette is auto-generated and read-only during import; the existing palette editor handles edits after the pattern exists.
- Real yarn-catalog integration, backend/accounts/cloud sync — inherited from the v1 map's scope boundary, still not this effort's concern.
