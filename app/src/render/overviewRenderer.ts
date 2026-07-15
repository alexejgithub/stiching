// Builds the self-contained SVG for ticket 41's single-page overview: a
// third artifact alongside the paginated export/print (ticket 27), always
// exactly one physical page, showing color only (no cell symbols, no
// row/column numbers — illegible at the shrink-to-fit scale this requires)
// plus the full legend at a fixed, grid-independent size.

import { type Pattern, getSlot } from '../model/pattern';
import { NUMBER_TEXT_FILL } from './gridRenderer';
import {
  A4_PORTRAIT_MM,
  OVERVIEW_LEGEND_CELL_SIZE_MM,
  PAGE_MARGIN_MM,
  type OverviewLayout,
  type PageSizeMm,
  computeOverviewLayout,
} from './exportLayout';
import { buildLegend } from './exportRenderer';

const SVG_NS = 'http://www.w3.org/2000/svg';
const BLANK_FILL = '#ffffff';

function el<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
}

// A plain color-only cell grid: no gutters, no row/column numbers, no
// per-cell symbol glyphs (decided in ticket 41 — all illegible at the
// uniform shrink-to-fit scale a whole pattern needs to land on one page).
// Deliberately a small local rect loop rather than gridRenderer.ts's shared
// buildCells/buildGridSVG: those always draw numbering + symbol glyphs with
// no option to suppress either, and threading such an option through for
// this one caller would be more machinery than the difference warrants.
function buildOverviewGrid(pattern: Pattern, layout: OverviewLayout): SVGGElement {
  const { cellSize, gridX, gridY, gridWidth, gridHeight } = layout;
  const group = el('g');
  group.setAttribute('data-role', 'overview-grid');

  for (let row = 0; row < pattern.rows; row++) {
    for (let col = 0; col < pattern.cols; col++) {
      const slot = getSlot(pattern, pattern.grid[row][col]);
      const rect = el('rect');
      rect.setAttribute('x', String(gridX + col * cellSize));
      rect.setAttribute('y', String(gridY + row * cellSize));
      rect.setAttribute('width', String(cellSize));
      rect.setAttribute('height', String(cellSize));
      rect.setAttribute('fill', slot ? slot.hex : BLANK_FILL);
      rect.setAttribute('data-role', 'overview-cell');
      rect.setAttribute('data-row', String(row));
      rect.setAttribute('data-col', String(col));
      group.appendChild(rect);
    }
  }

  const border = el('rect');
  border.setAttribute('x', String(gridX));
  border.setAttribute('y', String(gridY));
  border.setAttribute('width', String(gridWidth));
  border.setAttribute('height', String(gridHeight));
  border.setAttribute('fill', 'none');
  border.setAttribute('stroke', '#888888');
  border.setAttribute('data-role', 'overview-grid-bounds');
  group.appendChild(border);

  return group;
}

/**
 * Builds the complete, self-contained single-page overview SVG for a
 * Pattern: a title line, the whole-pattern color grid scaled uniformly
 * (square cells) to fit one page, and the full color/symbol/label legend
 * below it at a fixed size. Print and download both act on this exact
 * artifact — no separate rendering path (mirrors ticket 27's rule).
 */
export function buildOverviewSVG(pattern: Pattern, pageSizeMm: PageSizeMm = A4_PORTRAIT_MM): SVGSVGElement {
  const layout = computeOverviewLayout(pattern, pageSizeMm);

  const svg = el('svg');
  svg.setAttribute('viewBox', `0 0 ${pageSizeMm.width} ${pageSizeMm.height}`);
  svg.setAttribute('width', `${pageSizeMm.width}mm`);
  svg.setAttribute('height', `${pageSizeMm.height}mm`);
  svg.setAttribute('data-role', 'overview-page');

  // All content lives inside one margin-relative group so layout.ts's
  // gridX/gridY/legendY (relative to the margin box) don't need to
  // separately re-add PAGE_MARGIN_MM everywhere.
  const content = el('g');
  content.setAttribute('transform', `translate(${PAGE_MARGIN_MM}, ${PAGE_MARGIN_MM})`);
  svg.appendChild(content);

  const title = el('text');
  title.setAttribute('x', '0');
  title.setAttribute('y', String(layout.gridY * 0.6));
  title.setAttribute('font-size', '4');
  title.setAttribute('fill', NUMBER_TEXT_FILL);
  title.setAttribute('data-role', 'overview-title');
  title.textContent = `${pattern.name} — Overview`;
  content.appendChild(title);

  content.appendChild(buildOverviewGrid(pattern, layout));

  const availableWidth = pageSizeMm.width - 2 * PAGE_MARGIN_MM;
  content.appendChild(buildLegend(pattern, OVERVIEW_LEGEND_CELL_SIZE_MM, availableWidth, layout.legendY));

  return svg;
}
