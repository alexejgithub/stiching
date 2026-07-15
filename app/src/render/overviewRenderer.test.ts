import { describe, expect, it } from 'vitest';
import { addSlot } from '../model/palette';
import { createPattern } from '../model/pattern';
import { SYMBOLS } from '../model/symbols';
import { A4_PORTRAIT_MM } from './exportLayout';
import { buildOverviewSVG } from './overviewRenderer';

// createPattern already seeds a starter palette (ticket 33, includes a
// "Red"/"Green"/"Blue" among its labels), so these use distinct labels to
// stay unambiguous when a test looks a slot up by label.
function patternWithPalette(rows: number, cols: number): ReturnType<typeof createPattern> {
  let p = createPattern('My Blanket', rows, cols);
  p = addSlot(p, '#ff0000', 'TestRed');
  p = addSlot(p, '#00ff00', 'TestGreen');
  p = addSlot(p, '#0000ff', 'TestBlue');
  return p;
}

describe('buildOverviewSVG (ticket 41)', () => {
  it('is sized to exactly one physical page, regardless of pattern size', () => {
    const pattern = patternWithPalette(200, 200);
    const svg = buildOverviewSVG(pattern, A4_PORTRAIT_MM);

    expect(svg.getAttribute('width')).toBe(`${A4_PORTRAIT_MM.width}mm`);
    expect(svg.getAttribute('height')).toBe(`${A4_PORTRAIT_MM.height}mm`);
  });

  it('draws exactly one cell per grid position, with no gutters/glyphs mixed in', () => {
    const pattern = patternWithPalette(12, 8);
    const svg = buildOverviewSVG(pattern);

    const cells = svg.querySelectorAll('[data-role="overview-cell"]');
    expect(cells).toHaveLength(12 * 8);
  });

  it('draws the grid with color only: no cell symbols and no row/column numbers', () => {
    const pattern = patternWithPalette(20, 20);
    pattern.grid[0][0] = pattern.palette[0].id;
    const svg = buildOverviewSVG(pattern);

    expect(svg.querySelector('[data-role="cell-symbol"]')).toBeNull();
    expect(svg.querySelector('[data-role="column-number"]')).toBeNull();
    expect(svg.querySelector('[data-role="row-number"]')).toBeNull();
  });

  it('colors each cell rect from its palette slot', () => {
    const pattern = patternWithPalette(2, 2);
    const green = pattern.palette.find((slot) => slot.label === 'TestGreen')!;
    pattern.grid[0][0] = green.id;

    const svg = buildOverviewSVG(pattern);
    const cell = svg.querySelector('[data-role="overview-cell"][data-row="0"][data-col="0"]');
    expect(cell?.getAttribute('fill')).toBe(green.hex);
  });

  it('includes every palette Slot in the legend, with its color, symbol, and label', () => {
    const pattern = patternWithPalette(15, 15);
    const svg = buildOverviewSVG(pattern);

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

  it('uses one uniform (square) cell size for the whole grid, not independent x/y scaling', () => {
    const pattern = patternWithPalette(40, 10); // tall, narrow: rows constrain scale
    const svg = buildOverviewSVG(pattern);

    const cells = Array.from(svg.querySelectorAll('[data-role="overview-cell"]'));
    const widths = new Set(cells.map((c) => c.getAttribute('width')));
    const heights = new Set(cells.map((c) => c.getAttribute('height')));
    expect(widths.size).toBe(1);
    expect(heights.size).toBe(1);
    expect([...widths][0]).toBe([...heights][0]);
  });

  it('gives title and legend text elements an explicit fill attribute (standalone document, no app CSS)', () => {
    const pattern = patternWithPalette(10, 10);
    const svg = buildOverviewSVG(pattern);

    const textRoles = ['overview-title', 'legend-symbol', 'legend-label'];
    textRoles.forEach((role) => {
      const nodes = svg.querySelectorAll(`[data-role="${role}"]`);
      expect(nodes.length).toBeGreaterThan(0);
      nodes.forEach((node) => {
        expect(node.getAttribute('fill')).toBeTruthy();
      });
    });
  });
});
