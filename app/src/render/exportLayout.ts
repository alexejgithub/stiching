// Pure pagination math for ticket 27's paginated SVG export/print. No DOM
// here — this only decides which absolute row/col ranges of a Pattern land
// on which page; `exportRenderer.ts` turns those ranges into actual SVG.

import { type Pattern } from '../model/pattern';

export interface PageSizeMm {
  width: number;
  height: number;
}

// ISO 216 A4, portrait, in millimeters. A reasonable v1 default — the
// pagination math below works for any PageSizeMm a caller supplies.
export const A4_PORTRAIT_MM: PageSizeMm = { width: 210, height: 297 };

// Physical size of one grid cell on the printed page, in millimeters — a
// common C2C/mosaic crochet gauge. `exportRenderer.ts` reuses this exact
// value as `buildGridSVG`'s `cellSize` (its SVG user units), so 1 SVG user
// unit is defined as 1mm throughout the export pipeline: the physical page
// size and the on-screen/print SVG geometry never need separate unit
// conversion.
export const DEFAULT_CELL_SIZE_MM = 10;

// Blank margin reserved on all four sides of the physical page.
export const PAGE_MARGIN_MM = 10;

// Vertical space reserved above the grid, on every page, for the "Page X of
// Y" + absolute row/col range header text and the whole-pattern thumbnail.
export const HEADER_BLOCK_MM = 22;

export interface PageRange {
  // Inclusive, 0-indexed row/col range into the full Pattern's grid.
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
}

export interface ExportLayout {
  pageRows: number; // number of page-rows the grid is split into vertically
  pageCols: number; // number of page-cols the grid is split into horizontally
  pages: PageRange[]; // pageRows * pageCols entries, row-major (left-to-right, top-to-bottom)
}

// How many cells of a `cellSizeMm` grid fit along one page axis, after
// reserving margins on both ends plus a fixed `reservedMm` block (gutters
// for number labels, and — on the row/vertical axis only — the header).
function axisCapacity(pageLengthMm: number, reservedMm: number, cellSizeMm: number): number {
  const usable = pageLengthMm - 2 * PAGE_MARGIN_MM - reservedMm;
  return Math.max(1, Math.floor(usable / cellSizeMm));
}

// Splits `total` cells into pages of up to `capacity` cells such that every
// pair of adjacent pages shares exactly one boundary cell (so printed sheets
// can be physically aligned/taped at that shared row or column).
//
// Off-by-one arithmetic: a page starting at `start` covers
// [start, start + capacity - 1]. The next page starts exactly at the
// previous page's *last* cell (not one past it) — that shared index is the
// one row/col of overlap. Each page after the first therefore contributes
// only `capacity - 1` *new* cells. A `capacity` of 1 can't hold both a fresh
// cell and a shared one, so once multiple pages are actually needed we clamp
// the working capacity up to 2 — otherwise pagination could never make
// progress. A pattern that fits within `capacity` in one page produces
// exactly one page with no overlap logic applied at all.
function paginateAxis(total: number, capacity: number): Array<{ start: number; end: number }> {
  if (total <= capacity) {
    return [{ start: 0, end: total - 1 }];
  }
  const cap = Math.max(2, capacity);
  const ranges: Array<{ start: number; end: number }> = [];
  let start = 0;
  for (;;) {
    const end = Math.min(start + cap - 1, total - 1);
    ranges.push({ start, end });
    if (end >= total - 1) break;
    start = end; // next page's first cell = this page's last cell (the overlap)
  }
  return ranges;
}

/**
 * Computes how a Pattern's full rows x cols grid splits across physical
 * pages at a given cell size, with adjacent pages overlapping by exactly one
 * shared row/column. A pattern that fits entirely within one page's capacity
 * produces exactly one page covering the whole grid — no artificial
 * splitting.
 *
 * The legend strip (drawn below the grid by `exportRenderer.ts`) is
 * deliberately NOT accounted for in this capacity math: per spec the grid
 * never shrinks to make room for the legend, so pagination is legend-size
 * agnostic — the legend simply extends a page's rendered height past this
 * nominal per-page cell capacity.
 */
export function computeExportLayout(
  pattern: Pattern,
  cellSizeMm: number = DEFAULT_CELL_SIZE_MM,
  pageSizeMm: PageSizeMm = A4_PORTRAIT_MM
): ExportLayout {
  // Columns reserve cellSizeMm on both the left and right for the row-number
  // gutters buildGridSVG always draws (leftGutter = rightGutter = cellSize).
  const colCapacity = axisCapacity(pageSizeMm.width, 2 * cellSizeMm, cellSizeMm);
  // Rows reserve cellSizeMm for the top column-number gutter, plus the fixed
  // header block above the grid.
  const rowCapacity = axisCapacity(pageSizeMm.height, cellSizeMm + HEADER_BLOCK_MM, cellSizeMm);

  const rowRanges = paginateAxis(pattern.rows, rowCapacity);
  const colRanges = paginateAxis(pattern.cols, colCapacity);

  const pages: PageRange[] = [];
  for (const r of rowRanges) {
    for (const c of colRanges) {
      pages.push({ rowStart: r.start, rowEnd: r.end, colStart: c.start, colEnd: c.end });
    }
  }

  return { pageRows: rowRanges.length, pageCols: colRanges.length, pages };
}
