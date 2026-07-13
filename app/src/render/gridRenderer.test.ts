import { describe, expect, it } from 'vitest';
import { createPattern } from '../model/pattern';
import { buildGridSVG } from './gridRenderer';

describe('buildGridSVG', () => {
  it('renders one cell rect per grid cell', () => {
    const pattern = createPattern('T', 3, 4);
    const svg = buildGridSVG(pattern, { cellSize: 20 });
    expect(svg.querySelectorAll('[data-role="cell"]')).toHaveLength(12);
  });

  it('renders static column numbers 1..cols along the top', () => {
    const pattern = createPattern('T', 3, 4);
    const svg = buildGridSVG(pattern, { cellSize: 20 });
    const labels = Array.from(svg.querySelectorAll('[data-role="column-number"]')).map((n) => n.textContent);
    expect(labels).toEqual(['1', '2', '3', '4']);
  });

  it('alternates row number side by parity: odd right, even left', () => {
    const pattern = createPattern('T', 4, 4);
    const svg = buildGridSVG(pattern, { cellSize: 20 });
    const sides = Array.from(svg.querySelectorAll('[data-role="row-number"]')).map((n) =>
      n.getAttribute('data-side')
    );
    expect(sides).toEqual(['right', 'left', 'right', 'left']);
  });

  // ticket 27: rowOffset/colOffset let a windowed sub-pattern (one export
  // page's slice) draw numbering that reflects its true absolute position in
  // the full Pattern, rather than restarting from 1.
  it('offsets column and row numbers by colOffset/rowOffset when given', () => {
    const pattern = createPattern('T', 3, 3);
    const svg = buildGridSVG(pattern, { cellSize: 20, rowOffset: 10, colOffset: 5 });

    const colLabels = Array.from(svg.querySelectorAll('[data-role="column-number"]')).map((n) => n.textContent);
    expect(colLabels).toEqual(['6', '7', '8']);

    const rowLabels = Array.from(svg.querySelectorAll('[data-role="row-number"]')).map((n) => n.textContent);
    expect(rowLabels).toEqual(['11', '12', '13']);
  });

  it('computes row-number parity from the absolute (offset) row, not the local index', () => {
    const pattern = createPattern('T', 2, 1);
    // rowOffset 1: local row 0 -> absolute row 1 -> display 2 (even) -> left.
    // local row 1 -> absolute row 2 -> display 3 (odd) -> right.
    const svg = buildGridSVG(pattern, { cellSize: 20, rowOffset: 1 });

    const sides = Array.from(svg.querySelectorAll('[data-role="row-number"]')).map((n) => n.getAttribute('data-side'));
    expect(sides).toEqual(['left', 'right']);
  });

  it('defaults rowOffset/colOffset to 0, matching prior unoffset behavior', () => {
    const pattern = createPattern('T', 2, 2);
    const withoutOffset = buildGridSVG(pattern, { cellSize: 20 });
    const withZeroOffset = buildGridSVG(pattern, { cellSize: 20, rowOffset: 0, colOffset: 0 });

    const labelsOf = (svg: SVGSVGElement, role: string) =>
      Array.from(svg.querySelectorAll(`[data-role="${role}"]`)).map((n) => n.textContent);

    expect(labelsOf(withoutOffset, 'column-number')).toEqual(labelsOf(withZeroOffset, 'column-number'));
    expect(labelsOf(withoutOffset, 'row-number')).toEqual(labelsOf(withZeroOffset, 'row-number'));
  });

  // Ticket 29: column/row number <text> elements previously had no fill at
  // all, so they inherited the SVG default black — invisible against the
  // transparent, often dark-themed gutters. They need an explicit fill baked
  // in (so exported/standalone SVGs are legible without any host CSS), with
  // the live app additionally free to override it via CSS for theme-awareness.
  it('gives column-number text elements an explicit fill attribute', () => {
    const pattern = createPattern('T', 2, 2);
    const svg = buildGridSVG(pattern, { cellSize: 20 });
    const labels = svg.querySelectorAll('[data-role="column-number"]');
    expect(labels.length).toBeGreaterThan(0);
    labels.forEach((label) => {
      const fill = label.getAttribute('fill');
      expect(fill).toBeTruthy();
      expect(fill).not.toBe('black');
      expect(fill).not.toBe('#000000');
    });
  });

  it('gives row-number text elements an explicit fill attribute', () => {
    const pattern = createPattern('T', 2, 2);
    const svg = buildGridSVG(pattern, { cellSize: 20 });
    const labels = svg.querySelectorAll('[data-role="row-number"]');
    expect(labels.length).toBeGreaterThan(0);
    labels.forEach((label) => {
      const fill = label.getAttribute('fill');
      expect(fill).toBeTruthy();
      expect(fill).not.toBe('black');
      expect(fill).not.toBe('#000000');
    });
  });
});
