// Shared per-cell SVG grid renderer. Built with plain DOM APIs (not JSX) so
// the same module drives both the live editor (mounted imperatively into a
// container) and the paginated export/print pipeline (ticket 27), without
// the two ever being able to visually drift apart.

import { type Pattern, getSlot } from '../model/pattern';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface GridRenderOptions {
  cellSize: number;
}

const BLANK_FILL = '#ffffff';
const GRID_STROKE = '#c0c0c0';

function el<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
}

/** 1-indexed row/column number a cell displays, from its 0-indexed grid position. */
export function displayNumber(index: number): number {
  return index + 1;
}

/** Crochet-convention parity: odd display numbers read on the right, even on the left. */
export function rowSide(rowIndex: number): 'left' | 'right' {
  return displayNumber(rowIndex) % 2 === 1 ? 'right' : 'left';
}

/**
 * Builds a full grid SVG: cells, static column numbers along the top, and
 * row numbers alternating sides by parity. `cellSize` is in SVG user units
 * (px on screen; physical print units are the caller's concern in ticket 27).
 */
export function buildGridSVG(pattern: Pattern, options: GridRenderOptions): SVGSVGElement {
  const { cellSize } = options;
  const leftGutter = cellSize;
  const rightGutter = cellSize;
  const topGutter = cellSize;

  const width = pattern.cols * cellSize + leftGutter + rightGutter;
  const height = pattern.rows * cellSize + topGutter;

  const svg = el('svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('data-role', 'pattern-grid');

  svg.appendChild(buildCells(pattern, cellSize, leftGutter, topGutter));
  svg.appendChild(buildColumnNumbers(pattern, cellSize, leftGutter, topGutter));
  svg.appendChild(buildRowNumbers(pattern, cellSize, leftGutter, topGutter));

  return svg;
}

function buildCells(pattern: Pattern, cellSize: number, leftGutter: number, topGutter: number): SVGGElement {
  const group = el('g');
  group.setAttribute('data-role', 'cells');

  for (let row = 0; row < pattern.rows; row++) {
    for (let col = 0; col < pattern.cols; col++) {
      const slot = getSlot(pattern, pattern.grid[row][col]);
      const rect = el('rect');
      rect.setAttribute('x', String(col * cellSize + leftGutter));
      rect.setAttribute('y', String(row * cellSize + topGutter));
      rect.setAttribute('width', String(cellSize));
      rect.setAttribute('height', String(cellSize));
      rect.setAttribute('fill', slot ? slot.hex : BLANK_FILL);
      rect.setAttribute('stroke', GRID_STROKE);
      rect.setAttribute('stroke-width', '1');
      rect.setAttribute('data-role', 'cell');
      rect.setAttribute('data-row', String(row));
      rect.setAttribute('data-col', String(col));
      group.appendChild(rect);
    }
  }

  return group;
}

function buildColumnNumbers(
  pattern: Pattern,
  cellSize: number,
  leftGutter: number,
  topGutter: number
): SVGGElement {
  const group = el('g');
  group.setAttribute('data-role', 'column-numbers');

  for (let col = 0; col < pattern.cols; col++) {
    const text = el('text');
    text.setAttribute('x', String(col * cellSize + leftGutter + cellSize / 2));
    text.setAttribute('y', String(topGutter * 0.65));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', String(cellSize * 0.5));
    text.setAttribute('data-role', 'column-number');
    text.setAttribute('data-col', String(col));
    text.textContent = String(displayNumber(col));
    group.appendChild(text);
  }

  return group;
}

function buildRowNumbers(pattern: Pattern, cellSize: number, leftGutter: number, topGutter: number): SVGGElement {
  const group = el('g');
  group.setAttribute('data-role', 'row-numbers');

  for (let row = 0; row < pattern.rows; row++) {
    const side = rowSide(row);
    const text = el('text');
    const y = row * cellSize + topGutter + cellSize / 2 + cellSize * 0.18;
    if (side === 'right') {
      text.setAttribute('x', String(leftGutter + pattern.cols * cellSize + cellSize * 0.3));
      text.setAttribute('text-anchor', 'start');
    } else {
      text.setAttribute('x', String(leftGutter - cellSize * 0.3));
      text.setAttribute('text-anchor', 'end');
    }
    text.setAttribute('y', String(y));
    text.setAttribute('font-size', String(cellSize * 0.5));
    text.setAttribute('data-role', 'row-number');
    text.setAttribute('data-row', String(row));
    text.setAttribute('data-side', side);
    text.textContent = String(displayNumber(row));
    group.appendChild(text);
  }

  return group;
}
