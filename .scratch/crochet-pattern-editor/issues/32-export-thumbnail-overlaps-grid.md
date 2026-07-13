# 32 — Export key-map thumbnail overlaps the grid ("blue box" in top right)

**Reported by:** user bug report, 2026-07-13

**Status:** resolved

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

- [x] Thumbnail is fully contained within the header block's reserved space at the default cell size, no overlap with the grid, at both a small and a large (multi-page) pattern
- [x] Single-page exports either omit the thumbnail or render it in a way that's clearly not confusable with a rendering glitch
- [x] Multi-page exports still show the highlighted "this page's region" thumbnail correctly positioned

## Comments

Fixed in [app/](../../../app/) — `src/render/exportRenderer.ts`:

1. **Sizing**: `THUMBNAIL_SIZE_FACTOR` (in `exportRenderer.ts`, not `exportLayout.ts`) changed from `8` (a `cellSize` multiplier, giving an 80mm box at the default 10mm cell size) to `0.6`, now a fraction of `HEADER_BLOCK_MM` (the fixed 22mm header budget) instead: `thumbnailSize = HEADER_BLOCK_MM * 0.6 = 13.2mm`. Since `cellSize` can vary per export (`ExportDialog.tsx` offers 6/10/14mm presets) while `HEADER_BLOCK_MM` does not, tying the thumbnail to the fixed-mm budget rather than to `cellSize` keeps it contained regardless of which preset the user picks. The thumbnail is vertically centered in the header block via `thumbnailMargin = (HEADER_BLOCK_MM - thumbnailSize) / 2 = 4.4mm`, placed at `y = thumbnailMargin`, so `y + thumbnailSize = 17.6mm <= 22mm` with margin to spare — well clear of the grid, which starts at `cellSize + HEADER_BLOCK_MM` (32mm at the default cell size).
2. **Single-page omission**: checked ticket 16 first — it says every page carries a thumbnail, but also that a "single-page pattern exports as one plain SVG," and ticket 32's own acceptance criteria explicitly permit omission. Since a single page's range *is* the whole pattern, the highlight-vs-bounds distinction is meaningless there, so `buildExportPageSVG` now skips building/appending the thumbnail entirely when `pageCount > 1` is false, rather than rendering a contextless gray box. Multi-page exports are unaffected — the highlight thumbnail still renders, now correctly positioned/sized.

Did not touch `buildHeader` (numbering, ticket 29), symbol glyph rendering (ticket 30), or selection rendering (ticket 31) — scoped strictly to `buildThumbnail`'s call site and the `THUMBNAIL_SIZE_FACTOR` constant.

Verified via `npm run typecheck` (clean) and `npx vitest run src/render/exportRenderer.test.ts src/render/exportLayout.test.ts` (18 passed), including new tests: an `it.each` asserting the thumbnail's bounds (`y + height <= HEADER_BLOCK_MM`) across small/large patterns and small/large cell-size presets, and a test asserting `pageCount: 1` renders no `thumbnail`/`thumbnail-bounds`/`thumbnail-highlight` elements at all. Full suite (`npm test`) passes: 149/149. Reviewed via the `code-review` skill (Standards + Spec axes in parallel) — no blocking findings on either axis. Commit: `cbeedd0`.
