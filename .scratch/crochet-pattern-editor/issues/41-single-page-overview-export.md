# 41 — Single-page overview export/print

**Requested by:** user, 2026-07-15

Type: task
Blocked by: 27
Status: resolved

## Question

[Ticket 27](27-svg-export-print.md) built the to-scale, paginated export/print (physical cell size drives page count, header + thumbnail + legend on every page). The user additionally wants a second, separate artifact from the same Export/Print dialog: a whole-pattern overview that always fits on one physical page, for at-a-glance reference rather than stitching. Decided live via `/grilling`:

- **Role:** a third artifact, reference-only. The existing to-scale paginated print/download is untouched and unaffected.
- **Content:** the color grid only, shrunk to fit — no per-cell symbol glyphs, no row/column numbers (illegible at this scale) — plus the full color/symbol/label legend below it, at a legend text size that stays readable regardless of how small the grid cells get.
- **Entry point:** a second pair of buttons ("Print Overview" / "Download Overview") in the existing `ExportDialog`, alongside the existing Print/Download for the paginated artifact.
- **Scale-to-fit rule:** one uniform scale factor (from whichever axis — rows or cols — is more constrained by the page), so cells stay square; the grid is centered on the page with any leftover space on the other axis.
- **Print/export parity:** same rule ticket 27 established — one self-contained SVG, "Print Overview" and "Download Overview" both act on that exact artifact, no separate rendering path.

## Acceptance criteria

- [ ] A "Print Overview" and "Download Overview" action exist in `ExportDialog`, independent of the existing paginated Print/Download
- [ ] The overview is always exactly one page (A4 portrait, matching the paginated export's page size), regardless of pattern size
- [ ] The overview grid shows color only — no cell symbols, no row/column numbers
- [ ] The overview grid uses one uniform scale (square cells), centered on the page
- [ ] The full color/symbol/label legend appears below the grid, at a fixed readable size independent of how small the grid cells are scaled
- [ ] "Print Overview" and "Download Overview" act on the same generated SVG (no separate print-only path)
- [ ] The existing paginated Print/Download behavior (ticket 27) is unchanged
- [x] Tests cover: uniform/square cell-size computation for various pattern shapes, absence of number/symbol elements, presence of every palette Slot in the legend, and the download file name

## Answer

Built as a third, independent artifact in `ExportDialog`. Pure layout math (`computeOverviewLayout`) lives in `exportLayout.ts` alongside the paginated layout math it now shares legend-sizing helpers with (`legendItemsPerRow`/`legendHeight`/the two `LEGEND_*_FACTOR` constants moved there from `exportRenderer.ts` so both artifacts compute legend size identically without duplicating it). `overviewRenderer.ts` builds the actual SVG: a title line, a hand-rolled color-only cell loop (deliberately not `gridRenderer.ts`'s shared `buildCells`/`buildGridSVG`, which always draw gutters/numbers/symbols with no way to suppress them — threading that option through for one caller wasn't worth it), and the existing `buildLegend` (now exported from `exportRenderer.ts`) at a fixed `OVERVIEW_LEGEND_CELL_SIZE_MM` (6mm) independent of the grid's shrink-to-fit scale. `exportPatternOverviewAsSVG`/`exportOverviewFileName` in `exportSvg.ts` mirror the paginated download path exactly (`<name>-overview.svg`, one file, always).

`ExportDialog` mounts the overview SVG into its own `.export-overview-preview` container the same imperative way the paginated pages mount, and adds "Print Overview"/"Download Overview" actions. Since only one of the two artifacts should reach the physical printer per `window.print()` call, `handlePrintOverview` toggles a `printing-overview` class onto the dialog root (cleared via an `afterprint` listener), and `handlePrintPages` explicitly clears it — `index.css`'s `@media print` block reads that class to decide which preview container stays visible. The existing paginated Print/Download path is untouched otherwise.

One bug found and fixed during browser verification: `.dialog` had no `max-height`/`overflow-y`, so with both artifacts' previews now stacked in one dialog, "Print Overview"/"Download Overview" fell below the viewport with no way to scroll to them (`.dialog-backdrop` is `position: fixed` with no overflow of its own). Added `max-height: calc(100vh - 2rem); overflow-y: auto` to `.dialog` — fixes this dialog and makes any future tall dialog safe by construction, with no visible effect on today's shorter dialogs.

## Comments

Implemented in [app/src/render/exportLayout.ts](../../../app/src/render/exportLayout.ts) (`computeOverviewLayout` + relocated legend math), [app/src/render/overviewRenderer.ts](../../../app/src/render/overviewRenderer.ts) (new), [app/src/render/exportRenderer.ts](../../../app/src/render/exportRenderer.ts) (`buildLegend` exported, legend math imported instead of duplicated), [app/src/persistence/exportSvg.ts](../../../app/src/persistence/exportSvg.ts) (`exportOverviewFileName`/`exportPatternOverviewAsSVG`), [app/src/components/ExportDialog.tsx](../../../app/src/components/ExportDialog.tsx), [app/src/index.css](../../../app/src/index.css).

Tests: `exportLayout.test.ts` (`computeOverviewLayout` — square cells, correct constrained axis, centering, always-fits-one-page, positive cellSize even under a large palette/pattern), `overviewRenderer.test.ts` (new — page sizing, cell count, no symbol/number elements, per-cell color, full legend, uniform/square cell size, baked-in text fill), `exportSvg.test.ts` (overview file name, single-file download, distinct from paginated output). Full suite: 211/211 passing. `tsc --noEmit` clean.

Verified live in the browser (Browser pane, `crochet-app` dev server): opened Export/Print on a 20x20 pattern, confirmed the Overview section renders below the existing paginated preview with its own title/grid/legend; confirmed clicking Download Overview completes without console errors; confirmed (with `window.print` stubbed) that Print Overview sets `printing-overview` on the dialog and calls `window.print()`, that dispatching `afterprint` clears the class, and that clicking the paginated Print button also clears any leftover `printing-overview` state. Caught and fixed the dialog-overflow bug above during this pass.
