// Shared per-cell SVG grid renderer. Built with plain DOM APIs (not JSX) so
// the same module drives both the live editor (mounted imperatively into a
// container) and the paginated export/print pipeline (ticket 27), without
// the two ever being able to visually drift apart.

import { type Cell, type Pattern, getSlot } from '../model/pattern';
import { blockRect, type Rect } from '../model/selection';
import { SYMBOLS } from '../model/symbols';

const SVG_NS = 'http://www.w3.org/2000/svg';

// ticket 31: the current floating selection (marquee-select or Select All
// result), lifted out of `pattern.grid` into its own standalone block — see
// `FloatingSelection` in editorStore.ts and `liftRect` in model/selection.ts.
// `anchorRow`/`anchorCol` is the block's current top-left position in the
// full grid, so the overlay can render it wherever it's been moved/rotated/
// mirrored to.
export interface FloatingSelectionBlock {
  anchorRow: number;
  anchorCol: number;
  block: Cell[][];
}

export interface GridRenderOptions {
  cellSize: number;
  // ticket 23: an in-progress marquee-drag preview rect, in grid (row/col)
  // coordinates. Purely additive — omitting it renders exactly as before.
  marqueeRect?: Rect | null;
  // ticket 23/31: the current floating selection, if any. Its lifted cell
  // contents (color + symbol) render inside the overlay — positioned at
  // anchorRow/anchorCol — instead of a plain tint, so the selection never
  // reads as "the colors vanished" (they're floating, not gone).
  selection?: FloatingSelectionBlock | null;
  // ticket 27: the absolute row/col that local row/col 0 of `pattern` maps
  // to. Lets the export pipeline pass in a windowed sub-pattern (one page's
  // row/col slice) while still drawing column/row number labels — and their
  // left/right parity — reflecting true position in the full Pattern, rather
  // than renumbering from 1 per page. Default 0 reproduces prior behavior
  // exactly, so the live editor (which never windows) is unaffected.
  rowOffset?: number;
  colOffset?: number;
}

const BLANK_FILL = '#ffffff';
const GRID_STROKE = '#c0c0c0';
const MARQUEE_FILL = 'rgba(59, 130, 246, 0.15)';
const MARQUEE_STROKE = '#3b82f6';
const SELECTION_FILL = 'rgba(37, 99, 235, 0.25)';
const SELECTION_STROKE = '#2563eb';
const GLYPH_DARK = '#1a1a1a';
const GLYPH_LIGHT = '#ffffff';
// SVG <text> baselines sit at the text's bottom, not its vertical center, so
// every vertically-centered label nudges its y down by this fraction of
// cellSize to visually center it (empirically tuned, shared so the nudge
// can't drift between labels).
const TEXT_BASELINE_NUDGE_FACTOR = 0.18;

/**
 * Picks a legible glyph color (near-black or near-white) for text drawn on
 * top of `hex`, using the WCAG relative-luminance formula so the choice
 * reflects actual contrast rather than a fixed color per cell.
 */
export function contrastGlyphColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return GLYPH_DARK;
  const luminance = relativeLuminance(rgb);
  // Threshold of 0.5 on the 0..1 relative luminance scale: light fills get a
  // dark glyph, dark fills get a light glyph.
  return luminance > 0.5 ? GLYPH_DARK : GLYPH_LIGHT;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const int = parseInt(match[1], 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const [rl, gl, bl] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

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
  const { cellSize, rowOffset = 0, colOffset = 0 } = options;
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
  svg.appendChild(buildColumnNumbers(pattern, cellSize, leftGutter, topGutter, colOffset));
  svg.appendChild(buildRowNumbers(pattern, cellSize, leftGutter, topGutter, rowOffset));

  if (options.marqueeRect) {
    svg.appendChild(
      buildOverlayRect(options.marqueeRect, cellSize, leftGutter, topGutter, 'marquee-overlay', MARQUEE_FILL, MARQUEE_STROKE, '4 2')
    );
  }
  if (options.selection) {
    svg.appendChild(buildSelectionOverlay(options.selection, pattern, cellSize, leftGutter, topGutter));
  }

  return svg;
}

// Converts a Rect (grid row/col bounds, inclusive) to the pixel x/y/width/
// height of the region it covers, given the shared cellSize/gutter geometry.
// Centralized so every overlay that draws "a box over this Rect" (marquee
// preview, selection tint, selection border) computes the same pixels.
function rectPixels(
  rect: Rect,
  cellSize: number,
  leftGutter: number,
  topGutter: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: rect.c0 * cellSize + leftGutter,
    y: rect.r0 * cellSize + topGutter,
    width: (rect.c1 - rect.c0 + 1) * cellSize,
    height: (rect.r1 - rect.r0 + 1) * cellSize,
  };
}

function setRectPixels(rectEl: SVGRectElement, pixels: { x: number; y: number; width: number; height: number }): void {
  rectEl.setAttribute('x', String(pixels.x));
  rectEl.setAttribute('y', String(pixels.y));
  rectEl.setAttribute('width', String(pixels.width));
  rectEl.setAttribute('height', String(pixels.height));
}

// A semi-transparent rect over a rectangular region, for the in-progress
// marquee preview and the floating selection. `pointer-events: none` so it
// never intercepts the `elementFromPoint` cell hit-testing PatternGrid relies
// on during drags.
function buildOverlayRect(
  rect: Rect,
  cellSize: number,
  leftGutter: number,
  topGutter: number,
  role: string,
  fill: string,
  stroke: string,
  dash?: string
): SVGGElement {
  const group = el('g');
  group.setAttribute('data-role', role);
  group.setAttribute('pointer-events', 'none');

  const rectEl = el('rect');
  setRectPixels(rectEl, rectPixels(rect, cellSize, leftGutter, topGutter));
  rectEl.setAttribute('fill', fill);
  rectEl.setAttribute('stroke', stroke);
  rectEl.setAttribute('stroke-width', '2');
  if (dash) rectEl.setAttribute('stroke-dasharray', dash);
  group.appendChild(rectEl);

  return group;
}

/**
 * The floating selection overlay (ticket 31): a background tint over the
 * selection's full bounds (so blank cells inside the block still read as
 * "selected"), the block's actual lifted cell contents (color + symbol,
 * ticket 30) drawn on top at their current anchored position, and a border
 * stroke on top of that to keep the selection outline crisp. `pointer-events:
 * none` throughout so it never intercepts the `elementFromPoint` cell
 * hit-testing PatternGrid relies on during drags.
 */
function buildSelectionOverlay(
  selection: FloatingSelectionBlock,
  pattern: Pattern,
  cellSize: number,
  leftGutter: number,
  topGutter: number
): SVGGElement {
  const { anchorRow, anchorCol, block } = selection;
  const rect = blockRect(anchorRow, anchorCol, block);
  const pixels = rectPixels(rect, cellSize, leftGutter, topGutter);

  const group = el('g');
  group.setAttribute('data-role', 'selection-overlay');
  group.setAttribute('pointer-events', 'none');

  const tint = el('rect');
  setRectPixels(tint, pixels);
  tint.setAttribute('fill', SELECTION_FILL);
  tint.setAttribute('data-role', 'selection-tint');
  group.appendChild(tint);

  for (let r = 0; r < block.length; r++) {
    for (let c = 0; c < block[r].length; c++) {
      const cellId = block[r][c];
      if (cellId === null) continue; // blank within the block: tint shows through, no cell/glyph
      const slot = getSlot(pattern, cellId);
      if (!slot) continue;

      const absRow = anchorRow + r;
      const absCol = anchorCol + c;
      const x = absCol * cellSize + leftGutter;
      const y = absRow * cellSize + topGutter;

      const cellRect = el('rect');
      cellRect.setAttribute('x', String(x));
      cellRect.setAttribute('y', String(y));
      cellRect.setAttribute('width', String(cellSize));
      cellRect.setAttribute('height', String(cellSize));
      cellRect.setAttribute('fill', slot.hex);
      cellRect.setAttribute('data-role', 'selection-cell');
      cellRect.setAttribute('data-row', String(absRow));
      cellRect.setAttribute('data-col', String(absCol));
      group.appendChild(cellRect);

      const glyph = buildCellSymbol(slot, x, y, cellSize, absRow, absCol);
      if (glyph) group.appendChild(glyph);
    }
  }

  const border = el('rect');
  setRectPixels(border, pixels);
  border.setAttribute('fill', 'none');
  border.setAttribute('stroke', SELECTION_STROKE);
  border.setAttribute('stroke-width', '2');
  border.setAttribute('data-role', 'selection-border');
  group.appendChild(border);

  return group;
}

function buildCells(pattern: Pattern, cellSize: number, leftGutter: number, topGutter: number): SVGGElement {
  const group = el('g');
  group.setAttribute('data-role', 'cells');

  for (let row = 0; row < pattern.rows; row++) {
    for (let col = 0; col < pattern.cols; col++) {
      const slot = getSlot(pattern, pattern.grid[row][col]);
      const x = col * cellSize + leftGutter;
      const y = row * cellSize + topGutter;

      const rect = el('rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(cellSize));
      rect.setAttribute('height', String(cellSize));
      rect.setAttribute('fill', slot ? slot.hex : BLANK_FILL);
      rect.setAttribute('stroke', GRID_STROKE);
      rect.setAttribute('stroke-width', '1');
      rect.setAttribute('data-role', 'cell');
      rect.setAttribute('data-row', String(row));
      rect.setAttribute('data-col', String(col));
      group.appendChild(rect);

      const glyph = buildCellSymbol(slot, x, y, cellSize, row, col);
      if (glyph) group.appendChild(glyph);
    }
  }

  return group;
}

/**
 * The glyph text drawn on top of a stitched cell's color, per ticket 30 (v1
 * decision: color + symbol together, since the export must still be legible
 * in black-and-white or to a colorblind reader). Returns null for blank
 * cells (no slot), which stay glyph-free.
 */
function buildCellSymbol(
  slot: ReturnType<typeof getSlot>,
  x: number,
  y: number,
  cellSize: number,
  row: number,
  col: number
): SVGTextElement | null {
  if (!slot) return null;
  const glyph = SYMBOLS[slot.symbolId] ?? '';
  if (!glyph) return null;

  const text = el('text');
  text.setAttribute('x', String(x + cellSize / 2));
  text.setAttribute('y', String(y + cellSize / 2 + cellSize * TEXT_BASELINE_NUDGE_FACTOR));
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-size', String(cellSize * 0.6));
  text.setAttribute('fill', contrastGlyphColor(slot.hex));
  text.setAttribute('pointer-events', 'none');
  text.setAttribute('data-role', 'cell-symbol');
  text.setAttribute('data-row', String(row));
  text.setAttribute('data-col', String(col));
  text.textContent = glyph;
  return text;
}

function buildColumnNumbers(
  pattern: Pattern,
  cellSize: number,
  leftGutter: number,
  topGutter: number,
  colOffset: number
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
    text.textContent = String(displayNumber(col + colOffset));
    group.appendChild(text);
  }

  return group;
}

function buildRowNumbers(
  pattern: Pattern,
  cellSize: number,
  leftGutter: number,
  topGutter: number,
  rowOffset: number
): SVGGElement {
  const group = el('g');
  group.setAttribute('data-role', 'row-numbers');

  for (let row = 0; row < pattern.rows; row++) {
    const absRow = row + rowOffset;
    const side = rowSide(absRow);
    const text = el('text');
    const y = row * cellSize + topGutter + cellSize / 2 + cellSize * TEXT_BASELINE_NUDGE_FACTOR;
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
    text.textContent = String(displayNumber(absRow));
    group.appendChild(text);
  }

  return group;
}
