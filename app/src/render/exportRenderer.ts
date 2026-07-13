// Builds the self-contained SVG document for one export/print page (ticket
// 27). Reuses `buildGridSVG` from `gridRenderer.ts` for all cell drawing —
// this module only adds the page chrome (header, thumbnail, legend) around
// it, so the printed grid can never drift from the live editor's.

import { type Pattern } from '../model/pattern';
import { SYMBOLS } from '../model/symbols';
import { buildGridSVG, displayNumber } from './gridRenderer';
import {
  A4_PORTRAIT_MM,
  DEFAULT_CELL_SIZE_MM,
  HEADER_BLOCK_MM,
  type PageRange,
  type PageSizeMm,
  computeExportLayout,
} from './exportLayout';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
}

// Legend item width and row height, both relative to cellSize, chosen to fit
// a color swatch + one glyph + a short label without crowding.
const LEGEND_ITEM_WIDTH_FACTOR = 7;
const LEGEND_ROW_HEIGHT_FACTOR = 1.6;
const THUMBNAIL_SIZE_FACTOR = 8;

/**
 * Slices a Pattern's grid down to one page's absolute row/col range
 * (inclusive, 0-indexed). The result's `rows`/`cols`/`grid` are page-local
 * (so `buildGridSVG` draws a grid of the page's actual size); its `palette`
 * is untouched so cell colors and the legend still resolve correctly.
 *
 * The returned Pattern carries no memory of where it sits in the original
 * grid — callers that need absolute numbering must pass `rowOffset`/
 * `colOffset` (see `buildGridSVG`) alongside it.
 */
export function slicePattern(pattern: Pattern, range: PageRange): Pattern {
  return {
    ...pattern,
    rows: range.rowEnd - range.rowStart + 1,
    cols: range.colEnd - range.colStart + 1,
    grid: pattern.grid
      .slice(range.rowStart, range.rowEnd + 1)
      .map((row) => row.slice(range.colStart, range.colEnd + 1)),
  };
}

function buildHeader(range: PageRange, pageIndex: number, pageCount: number, cellSize: number): SVGGElement {
  const group = el('g');
  group.setAttribute('data-role', 'page-header');

  const title = el('text');
  title.setAttribute('x', String(cellSize * 0.3));
  title.setAttribute('y', String(cellSize * 0.9));
  title.setAttribute('font-size', String(cellSize * 0.8));
  title.setAttribute('data-role', 'page-header-title');
  title.textContent = `Page ${pageIndex + 1} of ${pageCount}`;
  group.appendChild(title);

  const rowStartAbs = displayNumber(range.rowStart);
  const rowEndAbs = displayNumber(range.rowEnd);
  const colStartAbs = displayNumber(range.colStart);
  const colEndAbs = displayNumber(range.colEnd);

  const rangeText = el('text');
  rangeText.setAttribute('x', String(cellSize * 0.3));
  rangeText.setAttribute('y', String(cellSize * 1.7));
  rangeText.setAttribute('font-size', String(cellSize * 0.5));
  rangeText.setAttribute('data-role', 'page-header-range');
  rangeText.setAttribute('data-row-start', String(rowStartAbs));
  rangeText.setAttribute('data-row-end', String(rowEndAbs));
  rangeText.setAttribute('data-col-start', String(colStartAbs));
  rangeText.setAttribute('data-col-end', String(colEndAbs));
  rangeText.textContent = `Rows ${rowStartAbs}-${rowEndAbs}, Columns ${colStartAbs}-${colEndAbs}`;
  group.appendChild(rangeText);

  return group;
}

// A deliberately low-fidelity "key map" thumbnail: a bounding-box sketch of
// the whole pattern with this page's covered region outlined, not a
// per-cell-accurate miniature render.
function buildThumbnail(pattern: Pattern, range: PageRange, x: number, y: number, size: number): SVGGElement {
  const group = el('g');
  group.setAttribute('data-role', 'thumbnail');

  const scaleX = size / pattern.cols;
  const scaleY = size / pattern.rows;

  const bounds = el('rect');
  bounds.setAttribute('x', String(x));
  bounds.setAttribute('y', String(y));
  bounds.setAttribute('width', String(size));
  bounds.setAttribute('height', String(size));
  bounds.setAttribute('fill', '#f0f0f0');
  bounds.setAttribute('stroke', '#888888');
  bounds.setAttribute('data-role', 'thumbnail-bounds');
  group.appendChild(bounds);

  const highlight = el('rect');
  highlight.setAttribute('x', String(x + range.colStart * scaleX));
  highlight.setAttribute('y', String(y + range.rowStart * scaleY));
  highlight.setAttribute('width', String((range.colEnd - range.colStart + 1) * scaleX));
  highlight.setAttribute('height', String((range.rowEnd - range.rowStart + 1) * scaleY));
  highlight.setAttribute('fill', 'none');
  highlight.setAttribute('stroke', '#2563eb');
  highlight.setAttribute('stroke-width', '2');
  highlight.setAttribute('data-role', 'thumbnail-highlight');
  group.appendChild(highlight);

  return group;
}

function legendItemsPerRow(cellSize: number, availableWidth: number): number {
  return Math.max(1, Math.floor(availableWidth / (cellSize * LEGEND_ITEM_WIDTH_FACTOR)));
}

function legendHeight(pattern: Pattern, cellSize: number, availableWidth: number): number {
  if (pattern.palette.length === 0) return 0;
  const itemsPerRow = legendItemsPerRow(cellSize, availableWidth);
  const rows = Math.ceil(pattern.palette.length / itemsPerRow);
  return rows * cellSize * LEGEND_ROW_HEIGHT_FACTOR;
}

// The full color/symbol/label legend, flowing left-to-right and wrapping to
// further rows as needed, at a fixed cellSize-derived item size — it never
// shrinks the grid's own cellSize to fit.
function buildLegend(pattern: Pattern, cellSize: number, width: number, y: number): SVGGElement {
  const group = el('g');
  group.setAttribute('data-role', 'legend');

  const itemWidth = cellSize * LEGEND_ITEM_WIDTH_FACTOR;
  const rowHeight = cellSize * LEGEND_ROW_HEIGHT_FACTOR;
  const itemsPerRow = legendItemsPerRow(cellSize, width);

  pattern.palette.forEach((slot, i) => {
    const col = i % itemsPerRow;
    const row = Math.floor(i / itemsPerRow);
    const itemX = col * itemWidth;
    const itemY = y + row * rowHeight;

    const item = el('g');
    item.setAttribute('data-role', 'legend-item');
    item.setAttribute('data-slot-id', String(slot.id));

    const swatch = el('rect');
    swatch.setAttribute('x', String(itemX));
    swatch.setAttribute('y', String(itemY));
    swatch.setAttribute('width', String(cellSize * 0.8));
    swatch.setAttribute('height', String(cellSize * 0.8));
    swatch.setAttribute('fill', slot.hex);
    swatch.setAttribute('stroke', '#888888');
    swatch.setAttribute('data-role', 'legend-swatch');
    item.appendChild(swatch);

    // Reuses the same 14-glyph symbol library the palette editor UI picks
    // from (src/model/symbols.ts), so a legend symbol always matches what
    // the user actually chose/sees on screen.
    const symbol = el('text');
    symbol.setAttribute('x', String(itemX + cellSize * 0.4));
    symbol.setAttribute('y', String(itemY + cellSize * 0.58));
    symbol.setAttribute('text-anchor', 'middle');
    symbol.setAttribute('font-size', String(cellSize * 0.45));
    symbol.setAttribute('data-role', 'legend-symbol');
    symbol.textContent = SYMBOLS[slot.symbolId] ?? '';
    item.appendChild(symbol);

    const label = el('text');
    label.setAttribute('x', String(itemX + cellSize * 1.0));
    label.setAttribute('y', String(itemY + cellSize * 0.58));
    label.setAttribute('font-size', String(cellSize * 0.45));
    label.setAttribute('data-role', 'legend-label');
    label.textContent = slot.label;
    item.appendChild(label);

    group.appendChild(item);
  });

  return group;
}

export interface ExportPageOptions {
  // Millimeters, and — per exportLayout.ts's unit convention — the same
  // value used as `buildGridSVG`'s `cellSize` (its SVG user units), so 1 SVG
  // user unit equals 1mm on the final document.
  cellSize: number;
  pageIndex: number;
  pageCount: number;
}

/**
 * Builds one page's complete, self-contained export SVG: the windowed grid
 * slice (absolute-numbered), a "Page X of Y" + absolute row/col range
 * header, a whole-pattern thumbnail with this page's region highlighted, and
 * the full legend below the grid.
 */
export function buildExportPageSVG(pattern: Pattern, range: PageRange, options: ExportPageOptions): SVGSVGElement {
  const { cellSize, pageIndex, pageCount } = options;
  const slice = slicePattern(pattern, range);
  // rowOffset/colOffset (ticket 27's additive buildGridSVG option) make this
  // windowed slice's number labels read as absolute pattern coordinates
  // instead of restarting from 1, and keep row-parity (left/right) correct
  // for the slice's true absolute row.
  const gridSvg = buildGridSVG(slice, { cellSize, rowOffset: range.rowStart, colOffset: range.colStart });

  const gridWidth = Number(gridSvg.getAttribute('width'));
  const gridHeight = Number(gridSvg.getAttribute('height'));

  const headerHeight = cellSize + HEADER_BLOCK_MM;
  const thumbnailSize = cellSize * THUMBNAIL_SIZE_FACTOR;
  const legendH = legendHeight(pattern, cellSize, gridWidth);

  const totalWidth = gridWidth;
  const totalHeight = headerHeight + gridHeight + legendH;

  const svg = el('svg');
  svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
  svg.setAttribute('width', `${totalWidth}mm`);
  svg.setAttribute('height', `${totalHeight}mm`);
  svg.setAttribute('data-role', 'export-page');
  svg.setAttribute('data-page-index', String(pageIndex));
  svg.setAttribute('data-page-count', String(pageCount));

  svg.appendChild(buildHeader(range, pageIndex, pageCount, cellSize));
  svg.appendChild(
    buildThumbnail(pattern, range, totalWidth - thumbnailSize - cellSize * 0.5, cellSize * 0.3, thumbnailSize)
  );

  gridSvg.setAttribute('x', '0');
  gridSvg.setAttribute('y', String(headerHeight));
  svg.appendChild(gridSvg);

  svg.appendChild(buildLegend(pattern, cellSize, totalWidth, headerHeight + gridHeight));

  return svg;
}

/** Computes the layout and builds every page's SVG for a full export/print run. */
export function buildExportPages(
  pattern: Pattern,
  cellSizeMm: number = DEFAULT_CELL_SIZE_MM,
  pageSizeMm: PageSizeMm = A4_PORTRAIT_MM
): SVGSVGElement[] {
  const layout = computeExportLayout(pattern, cellSizeMm, pageSizeMm);
  return layout.pages.map((range, i) =>
    buildExportPageSVG(pattern, range, { cellSize: cellSizeMm, pageIndex: i, pageCount: layout.pages.length })
  );
}
