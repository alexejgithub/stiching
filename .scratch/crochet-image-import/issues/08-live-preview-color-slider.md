# 08 — Live preview and adjustable color-count/grid-size

**What to build:** Replace ticket 06's fixed defaults with the real interactive experience: a live pixelated preview and palette swatches that update instantly as the crafter drags a 1–8 color-count slider, backed by a downscale-once/cache-reuse analysis buffer rather than re-quantizing the full photo on every tick. Grid-size changes (rows/cols, from ticket 07 if it's landed, or the fixed defaults if not) resample against the same cached buffer.

**Blocked by:** 06 (not 07 — this only needs whatever crop region is currently active, which ticket 06 already provides as "the whole image"; it can land before, after, or in parallel with 07)

**Status:** resolved

- [x] After a crop/photo is finalized, the cropped region is downscaled once into an analysis buffer capped at ~200–300px on its longest side (sized independently of both the source resolution and the target grid size) and cached
- [x] A 1–8 color-count slider is shown; dragging it re-quantizes only the cached analysis buffer, never the original photo or a fresh full-resolution read
- [x] The live preview (pixelated grid of cell colors) and palette swatches update on every slider tick without visible lag
- [x] A palette shorter than the requested color count (on low-color-variety crops) is shown as-is — no padding, no forced minimum
- [x] Requesting exactly 1 color uses the appropriate single-dominant-color extraction path rather than the multi-color path (which has a documented floor above 1)
- [x] Changing rows/cols re-samples cell colors against the already-built palette and cached buffer — it does not trigger a fresh quantization pass — while the crafter is adjusting rows/cols on the crop step, only the crop box's own geometry updates (no quantization at all); the cached buffer/palette are only rebuilt when the crop is (re-)finalized, which is the one point where the region can actually change (rows/cols are aspect-locked to the crop box per ticket 07, so a grid-size change is never independent of a crop change in this UI)
- [x] A new crop or a newly picked photo re-triggers the downscale/cache step (the cache is not reused across a different source region)
- [x] The final committed `Pattern` (via ticket 06's commit path) reflects whatever color count and grid size were last shown in the live preview at the moment of "Create Pattern"
