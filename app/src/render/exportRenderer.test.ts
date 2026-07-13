import { describe, expect, it } from 'vitest';
import { createPattern } from '../model/pattern';
import { addSlot } from '../model/palette';
import { SYMBOLS } from '../model/symbols';
import { computeExportLayout } from './exportLayout';
import { buildExportPageSVG, buildExportPages, slicePattern } from './exportRenderer';

function patternWithPalette(rows: number, cols: number): ReturnType<typeof createPattern> {
  let p = createPattern('T', rows, cols);
  p = addSlot(p, '#ff0000', 'Red');
  p = addSlot(p, '#00ff00', 'Green');
  p = addSlot(p, '#0000ff', 'Blue');
  return p;
}

describe('slicePattern', () => {
  it('slices the grid to the given absolute range and keeps the full palette', () => {
    const pattern = patternWithPalette(5, 5);
    pattern.grid[2][3] = pattern.palette[0].id;

    const slice = slicePattern(pattern, { rowStart: 2, rowEnd: 4, colStart: 2, colEnd: 4 });

    expect(slice.rows).toBe(3);
    expect(slice.cols).toBe(3);
    expect(slice.grid[0][1]).toBe(pattern.palette[0].id); // absolute (2,3) -> local (0,1)
    expect(slice.palette).toEqual(pattern.palette);
  });
});

describe('buildExportPageSVG', () => {
  it('carries a header stating the page number and absolute row/col range, not page-local numbers', () => {
    const pattern = patternWithPalette(50, 50);
    const range = { rowStart: 20, rowEnd: 39, colStart: 5, colEnd: 24 };

    const svg = buildExportPageSVG(pattern, range, { cellSize: 10, pageIndex: 1, pageCount: 3 });

    const title = svg.querySelector('[data-role="page-header-title"]');
    expect(title?.textContent).toBe('Page 2 of 3');

    const rangeText = svg.querySelector('[data-role="page-header-range"]');
    expect(rangeText?.textContent).toBe('Rows 21-40, Columns 6-25');
    expect(rangeText?.getAttribute('data-row-start')).toBe('21');
    expect(rangeText?.getAttribute('data-row-end')).toBe('40');
    expect(rangeText?.getAttribute('data-col-start')).toBe('6');
    expect(rangeText?.getAttribute('data-col-end')).toBe('25');
  });

  it('draws the windowed grid slice with number labels reflecting absolute pattern position', () => {
    const pattern = patternWithPalette(50, 50);
    // A page starting at absolute row/col 20 (0-indexed) — local row 0 is
    // absolute row 20, which should display as "21", not "1".
    const range = { rowStart: 20, rowEnd: 24, colStart: 5, colEnd: 9 };

    const svg = buildExportPageSVG(pattern, range, { cellSize: 10, pageIndex: 0, pageCount: 1 });

    const colLabels = Array.from(svg.querySelectorAll('[data-role="column-number"]')).map((n) => n.textContent);
    expect(colLabels).toEqual(['6', '7', '8', '9', '10']);

    const rowLabels = Array.from(svg.querySelectorAll('[data-role="row-number"]')).map((n) => n.textContent);
    expect(rowLabels).toEqual(['21', '22', '23', '24', '25']);
  });

  it('keeps correct left/right row-number parity based on absolute row, not the page-local index', () => {
    const pattern = patternWithPalette(50, 50);
    // Local row 0 = absolute row 20 (0-indexed) -> display number 21 (odd) -> right.
    // A page starting at an even absolute row would flip local row 0 to "left".
    const range = { rowStart: 20, rowEnd: 23, colStart: 0, colEnd: 4 };

    const svg = buildExportPageSVG(pattern, range, { cellSize: 10, pageIndex: 0, pageCount: 1 });

    const sides = Array.from(svg.querySelectorAll('[data-role="row-number"]')).map((n) => n.getAttribute('data-side'));
    // Absolute rows 21,22,23,24 (1-indexed) -> right, left, right, left.
    expect(sides).toEqual(['right', 'left', 'right', 'left']);
  });

  it('includes every palette Slot in the legend, with its color, symbol, and label', () => {
    const pattern = patternWithPalette(10, 10);
    const range = { rowStart: 0, rowEnd: 9, colStart: 0, colEnd: 9 };

    const svg = buildExportPageSVG(pattern, range, { cellSize: 10, pageIndex: 0, pageCount: 1 });

    const items = svg.querySelectorAll('[data-role="legend-item"]');
    expect(items).toHaveLength(pattern.palette.length);

    pattern.palette.forEach((slot) => {
      const item = svg.querySelector(`[data-role="legend-item"][data-slot-id="${slot.id}"]`);
      expect(item).not.toBeNull();
      const swatch = item?.querySelector('[data-role="legend-swatch"]');
      expect(swatch?.getAttribute('fill')).toBe(slot.hex);
      const symbol = item?.querySelector('[data-role="legend-symbol"]');
      expect(symbol?.textContent).toBe(SYMBOLS[slot.symbolId]);
      const label = item?.querySelector('[data-role="legend-label"]');
      expect(label?.textContent).toBe(slot.label);
    });
  });

  it('includes a thumbnail with the whole pattern bounds and this page region highlighted', () => {
    const pattern = patternWithPalette(40, 40);
    const range = { rowStart: 10, rowEnd: 19, colStart: 0, colEnd: 19 };

    const svg = buildExportPageSVG(pattern, range, { cellSize: 10, pageIndex: 0, pageCount: 2 });

    expect(svg.querySelector('[data-role="thumbnail-bounds"]')).not.toBeNull();
    expect(svg.querySelector('[data-role="thumbnail-highlight"]')).not.toBeNull();
  });
});

describe('buildExportPages: single-vs-multi-file behavior', () => {
  it('produces exactly one self-contained page for a pattern that fits on one page', () => {
    const pattern = patternWithPalette(5, 5);
    const layout = computeExportLayout(pattern, 10);
    expect(layout.pages).toHaveLength(1);

    const pages = buildExportPages(pattern, 10);

    expect(pages).toHaveLength(1);
    expect(pages[0].getAttribute('data-page-count')).toBe('1');
    // Every page is fully self-contained: header, grid cells, and legend
    // items are all present directly in this single document.
    expect(pages[0].querySelector('[data-role="page-header-title"]')).not.toBeNull();
    expect(pages[0].querySelectorAll('[data-role="cell"]')).toHaveLength(25);
    expect(pages[0].querySelectorAll('[data-role="legend-item"]')).toHaveLength(pattern.palette.length);
  });

  it('produces N individually self-contained pages for a pattern spanning N pages, each with its own legend/header/thumbnail', () => {
    const pattern = patternWithPalette(60, 60);
    const layout = computeExportLayout(pattern, 10);
    expect(layout.pages.length).toBeGreaterThan(1);

    const pages = buildExportPages(pattern, 10);

    expect(pages).toHaveLength(layout.pages.length);
    pages.forEach((svg, i) => {
      expect(svg.getAttribute('data-page-index')).toBe(String(i));
      expect(svg.getAttribute('data-page-count')).toBe(String(pages.length));
      expect(svg.querySelector('[data-role="page-header-title"]')?.textContent).toBe(`Page ${i + 1} of ${pages.length}`);
      expect(svg.querySelectorAll('[data-role="legend-item"]')).toHaveLength(pattern.palette.length);
      expect(svg.querySelector('[data-role="thumbnail"]')).not.toBeNull();
    });
  });
});
