# Research client-side color quantization approaches

Type: research
Blocked by: None
Status: resolved

## Question

Import Image needs to reduce an arbitrary uploaded photo's colors down to a user-chosen count (1–8, ceiling of 8 per the map's destination) entirely client-side — no backend, consistent with the project's existing no-backend architecture ([ticket 10](../../crochet-pattern-editor/issues/10-tech-stack.md)).

Investigate feasible client-side color-quantization approaches for a React + TypeScript + Vite app:

- Algorithm options (median cut, k-means, octree, popularity/histogram-based) and their quality-vs-speed trade-offs on typical photo sizes (e.g. up to ~4000×3000px before any downscaling).
- Whether a well-maintained, lightweight library exists that does this in-browser (e.g. `image-q`, `quantize`, `rgbquant`) versus hand-rolling one.
- Expected performance running interactively — the destination requires the live preview (see the prototype ticket) to feel instant as the user drags sliders, not a multi-second wait per adjustment. Note whether downscaling the source image before quantization (independent of the final target grid size) is necessary to hit that.

Produce a summary doc (markdown, linked as an asset from this ticket) recommending an approach, with enough detail for [Design the pixelation & quantization pipeline](02-pixelation-quantization-pipeline.md) to make the pipeline decision.

## Answer

Full findings: [01-quantization-research-findings.md](01-quantization-research-findings.md).

Use **`colorthief`** (`getPaletteSync(img, { colorCount, quality })`), implementing median-cut/MMCQ — not `image-q` (no code push since 2023), `rgbquant`/`quantize` (less active, no native TS types), or `node-vibrant` (actively maintained but architecturally a poor fit — fixed 6 semantic swatches, not an arbitrary 1–8 count), and not a hand-rolled quantizer. `colorthief` is the most actively-maintained, browser-native option found (republished 2026-07-01), has native TypeScript types and zero required runtime deps, and its `colorCount`/`quality` params map directly onto our color-count and live-preview-performance needs. For a requested count of 1, use `getColorSync` instead (`colorCount` only supports 2–20). For performance: on crop confirm (not every slider tick), downscale the cropped region once to ~200–300px on the long edge via an offscreen canvas / `createImageBitmap` resize options, cache that buffer, and run `colorthief` against it on every color-count *and* grid-size tick — independent of both the original photo resolution and the target grid size, which only resamples the already-quantized buffer. Tune `quality` (pixel-sampling rate) or shrink the cache further as a second lever if profiling shows it's needed. If `colorthief`'s MMCQ output looks visually weak later, `image-q`'s `WuQuant` mode is the flagged upgrade path (best quality/speed reputation for small k) — not the starting point.
