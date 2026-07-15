# Design the pixelation & quantization pipeline

Type: grilling
Blocked by: 01
Status: resolved

## Question

Given the approach chosen in [Research: client-side color quantization](01-quantization-research.md), design the actual pixelation + quantization pipeline end to end. This pipeline is what both the live preview and the final "Create Pattern" commit run against the cropped image, target rows × cols, and requested color count (1–8).

Specifically:

- **Order of operations**: does quantization run against the whole cropped image first (building a global ≤N-color palette), with each target cell then snapping to the nearest palette color — or does pixelation run first (one averaged color per target cell), with quantization then reducing those per-cell colors down to ≤N?
- **Per-cell sampling method**: when computing a target cell's representative color, is it the mean of all source pixels inside that cell's region, the mode (most common color), or a single sampled pixel (e.g. the cell's center)?
- **Under-supply behavior**: if the requested color count (say 8) exceeds the number of genuinely distinct colors in the crop (e.g. a mostly solid-color photo), does the resulting palette just come back shorter, or is there a minimum?

## Answer

**Quantize-first.** Run `colorthief`'s `getPaletteSync`/`getColorSync` against the whole cached ~200–300px downscaled buffer to build a global ≤8-color palette. Only then does the target-grid-size step run, mapping the cached buffer into cells against that already-fixed palette. This keeps the palette a property of the photo, not an artifact of grid coarseness, and means a grid-size-only change never needs to re-run quantization — only re-sample cells and re-snap to the existing palette.

**Per-cell sampling: mean.** Each target cell's representative color is the average (RGB) of all source pixels from the cached buffer that fall inside that cell's region; that average is then snapped to the nearest palette color. Chosen over mode (noisy, ties common) and center-pixel (throws away all but one pixel, risks a speckled result) as the standard, most robust downsampling approach.

**Under-supply: no minimum, palette comes back shorter.** If the crop doesn't have enough genuinely distinct color clusters to fill the requested count (e.g. slider at 8 on a mostly two-color crop), the pattern just uses fewer colors than requested — no artificial padding/splitting to force the count. The color-count slider is a ceiling, not a guarantee, consistent with how it was already framed during the map's destination-grilling.
