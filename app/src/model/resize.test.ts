import { describe, expect, it } from 'vitest';
import { createPattern, MAX_DIMENSION, MIN_DIMENSION } from './pattern';
import { previewResize, resizePattern, type ResizeEdges } from './resize';

const NO_OP: ResizeEdges = { top: 0, bottom: 0, left: 0, right: 0 };

function setCell(pattern: ReturnType<typeof createPattern>, row: number, col: number, value: number) {
  const grid = pattern.grid.map((r) => [...r]);
  grid[row][col] = value;
  return { ...pattern, grid };
}

describe('previewResize', () => {
  it('reports the resulting dimensions and zero loss for a pure grow', () => {
    const p = createPattern('T', 3, 3);
    const preview = previewResize(p, { top: 1, bottom: 2, left: 0, right: 3 });
    expect(preview).toEqual({ ok: true, rows: 6, cols: 6, lostStitchedCellCount: 0 });
  });

  it('reports zero loss when shrinking only removes already-Blank space', () => {
    const p = createPattern('T', 5, 5);
    const preview = previewResize(p, { top: -1, bottom: -1, left: 0, right: 0 });
    expect(preview).toEqual({ ok: true, rows: 3, cols: 5, lostStitchedCellCount: 0 });
  });

  it('counts stitched cells that a shrink would discard, per edge', () => {
    let p = createPattern('T', 4, 4);
    p = setCell(p, 0, 0, 1); // in the shrunk-away top row
    p = setCell(p, 3, 3, 2); // in the shrunk-away right col
    p = setCell(p, 1, 1, 3); // survives

    const preview = previewResize(p, { top: -1, bottom: 0, left: 0, right: -1 });

    expect(preview).toEqual({ ok: true, rows: 3, cols: 3, lostStitchedCellCount: 2 });
  });

  it('does not mutate the pattern while previewing', () => {
    let p = createPattern('T', 4, 4);
    p = setCell(p, 0, 0, 1);
    const before = p.grid;

    previewResize(p, { top: -2, bottom: 0, left: 0, right: 0 });

    expect(p.grid).toBe(before);
    expect(p.rows).toBe(4);
  });

  it('rejects a resize whose result would be out of bounds (too small)', () => {
    const p = createPattern('T', MIN_DIMENSION, MIN_DIMENSION);
    expect(previewResize(p, { top: -1, bottom: 0, left: 0, right: 0 })).toEqual({ ok: false, reason: 'out-of-bounds' });
  });

  it('rejects a resize whose result would be out of bounds (too large)', () => {
    const p = createPattern('T', MAX_DIMENSION, MAX_DIMENSION);
    expect(previewResize(p, { top: 1, bottom: 0, left: 0, right: 0 })).toEqual({ ok: false, reason: 'out-of-bounds' });
  });

  it('accepts a resize landing exactly on the 1 and 500 bounds', () => {
    const p = createPattern('T', 5, 5);
    expect(previewResize(p, { top: -4, bottom: 0, left: -4, right: 0 })).toMatchObject({
      ok: true,
      rows: MIN_DIMENSION,
      cols: MIN_DIMENSION,
    });
    expect(previewResize(p, { top: MAX_DIMENSION - 5, bottom: 0, left: 0, right: 0 })).toMatchObject({
      ok: true,
      rows: MAX_DIMENSION,
    });
  });
});

describe('resizePattern', () => {
  it('is a no-op with all-zero edges', () => {
    const p = createPattern('T', 4, 4);
    const resized = resizePattern(p, NO_OP);
    expect(resized.rows).toBe(4);
    expect(resized.cols).toBe(4);
    expect(resized.grid).toEqual(p.grid);
  });

  it('grows an edge padding Blank cells there, keeping content at its absolute position', () => {
    let p = createPattern('T', 2, 2);
    p = setCell(p, 0, 0, 1);
    p = setCell(p, 1, 1, 2);

    const resized = resizePattern(p, { top: 1, bottom: 0, left: 0, right: 0 });

    expect(resized.rows).toBe(3);
    expect(resized.cols).toBe(2);
    // content shifted down by 1 (top grew), new top row is Blank
    expect(resized.grid).toEqual([
      [null, null],
      [1, null],
      [null, 2],
    ]);
  });

  it('grows each edge independently', () => {
    const base = createPattern('T', 2, 2);
    expect(resizePattern(base, { top: 1, bottom: 0, left: 0, right: 0 })).toMatchObject({ rows: 3, cols: 2 });
    expect(resizePattern(base, { top: 0, bottom: 1, left: 0, right: 0 })).toMatchObject({ rows: 3, cols: 2 });
    expect(resizePattern(base, { top: 0, bottom: 0, left: 1, right: 0 })).toMatchObject({ rows: 2, cols: 3 });
    expect(resizePattern(base, { top: 0, bottom: 0, left: 0, right: 1 })).toMatchObject({ rows: 2, cols: 3 });
  });

  it('grows all four edges together in one operation', () => {
    let p = createPattern('T', 2, 2);
    p = setCell(p, 0, 0, 9);

    const resized = resizePattern(p, { top: 1, bottom: 1, left: 1, right: 1 });

    expect(resized.rows).toBe(4);
    expect(resized.cols).toBe(4);
    // original (0,0) is now at (1,1) — shifted by top=1, left=1
    expect(resized.grid[1][1]).toBe(9);
    expect(resized.grid.flat().filter((c) => c !== null)).toEqual([9]);
  });

  it('shrinks an edge, dropping only the cells in that edge region', () => {
    let p = createPattern('T', 4, 4);
    p = setCell(p, 3, 3, 7); // bottom-right corner, in the shrunk region
    p = setCell(p, 0, 0, 8); // survives

    const resized = resizePattern(p, { top: 0, bottom: -1, left: 0, right: -1 });

    expect(resized.rows).toBe(3);
    expect(resized.cols).toBe(3);
    expect(resized.grid[0][0]).toBe(8);
    expect(resized.grid.flat().filter((c) => c !== null)).toEqual([8]);
  });

  it('never reflows content — growth only pads blank cells at the edges', () => {
    let p = createPattern('T', 3, 3);
    p = setCell(p, 0, 0, 1);
    p = setCell(p, 0, 1, 2);
    p = setCell(p, 0, 2, 3);
    p = setCell(p, 1, 0, 4);
    p = setCell(p, 1, 1, 5);
    p = setCell(p, 1, 2, 6);
    p = setCell(p, 2, 0, 7);
    p = setCell(p, 2, 1, 8);
    p = setCell(p, 2, 2, 9);

    const resized = resizePattern(p, { top: 0, bottom: 0, left: 0, right: 2 });

    // every original row is untouched except for two new Blank cols appended
    expect(resized.grid).toEqual([
      [1, 2, 3, null, null],
      [4, 5, 6, null, null],
      [7, 8, 9, null, null],
    ]);
  });

  it('throws if applied with out-of-bounds edges (defensive backstop)', () => {
    const p = createPattern('T', MIN_DIMENSION, MIN_DIMENSION);
    expect(() => resizePattern(p, { top: -1, bottom: 0, left: 0, right: 0 })).toThrow(RangeError);
  });
});
