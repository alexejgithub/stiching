# 32 — Export key-map thumbnail overlaps the grid ("blue box" in top right)

**Reported by:** user bug report, 2026-07-13

**Status:** ready-for-agent

## Symptom

The exported/printed SVG shows an unexplained box outlined in blue near the top right of the page, overlapping the pattern grid.

## Root cause

This is the per-page "key-map" thumbnail specified in [ticket 16](16-svg-export-print.md) ("a small key-map thumbnail of the whole pattern with this page's region highlighted") — `buildThumbnail` in [exportRenderer.ts](../../../app/src/render/exportRenderer.ts). It's not unexplained by design, but its size is miscalculated relative to the space reserved for it, so it visually collides with the grid instead of sitting cleanly in the header:

- `THUMBNAIL_SIZE_FACTOR = 8`, so at the default export cell size (`DEFAULT_CELL_SIZE_MM = 10`, [exportLayout.ts](../../../app/src/render/exportLayout.ts)) the thumbnail is `8 * 10 = 80mm` square.
- The vertical space actually reserved for the whole header block is `HEADER_BLOCK_MM = 22mm` (plus one `cellSize` for the column-number gutter, so ~32mm total before the grid starts).
- The thumbnail is placed at `y = cellSize * 0.3` (3mm) with no clamping to the header's height, so an 80mm-tall box is drawn into a ~32mm-tall header — it extends roughly 50mm past the header boundary, down over the top rows of the actual grid. That overlap, with its blue (`#2563eb`) highlight-rect stroke drawn at full page-region size for single-page exports (where the highlight covers the entire thumbnail bounds), is what reads as "a weird blue box."
- For a single-page export in particular, the highlight rect exactly covers the thumbnail bounds (the one page's range *is* the whole pattern), so there's no visible "you are here" distinction — it's just a gray box with a blue border sitting on top of the pattern.

## Fix

Two independent things to correct:

1. Size `THUMBNAIL_SIZE_FACTOR` (or make the thumbnail size a function of `HEADER_BLOCK_MM`) so the thumbnail actually fits inside the header block instead of overlapping the grid below it.
2. Consider skipping the thumbnail entirely when `pageCount === 1` (no "you are here" question to answer when there's only one page) — confirm intended behavior isn't already covered elsewhere in ticket 16 before doing this; if kept, it should visually read as decoration/context, not overlap grid content.

## Acceptance criteria

- [ ] Thumbnail is fully contained within the header block's reserved space at the default cell size, no overlap with the grid, at both a small and a large (multi-page) pattern
- [ ] Single-page exports either omit the thumbnail or render it in a way that's clearly not confusable with a rendering glitch
- [ ] Multi-page exports still show the highlighted "this page's region" thumbnail correctly positioned
