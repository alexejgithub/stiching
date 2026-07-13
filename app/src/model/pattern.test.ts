import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DIMENSION,
  MAX_DIMENSION,
  MIN_DIMENSION,
  createPattern,
  isValidDimension,
} from './pattern';

describe('createPattern', () => {
  it('creates a blank grid at the default 20x20 size', () => {
    const p = createPattern('Test', DEFAULT_DIMENSION, DEFAULT_DIMENSION);
    expect(p.rows).toBe(20);
    expect(p.cols).toBe(20);
    expect(p.grid).toHaveLength(20);
    expect(p.grid.every((row) => row.length === 20 && row.every((c) => c === null))).toBe(true);
  });

  it('seeds an 8-slot starter palette so a user can paint immediately', () => {
    const p = createPattern('Test', DEFAULT_DIMENSION, DEFAULT_DIMENSION);
    expect(p.palette).toHaveLength(8);
    expect(p.palette.map((s) => s.hex)).toEqual([
      '#e6194B',
      '#f58231',
      '#ffe119',
      '#3cb44b',
      '#42d4f4',
      '#4363d8',
      '#911eb4',
      '#f032e6',
    ]);
    // Auto-assigned symbols 1-8 from SYMBOLS in add-order, same as any
    // manually-added slot (ticket 14).
    expect(p.palette.map((s) => s.symbolId)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    // ids run 1..8 in add-order, and the next manually-added slot must not
    // collide with or skip a seeded id.
    expect(p.palette.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(p.nextSlotId).toBe(9);
    // Each seeded slot is an ordinary, fully-editable Slot - nothing
    // special-cased about it (no yarn link, ids/labels are plain values).
    expect(p.palette.every((s) => s.yarnLink === null)).toBe(true);
  });

  it('mints a distinct id per pattern', () => {
    const a = createPattern('A', 5, 5);
    const b = createPattern('B', 5, 5);
    expect(a.id).not.toBe(b.id);
  });

  it('accepts boundary dimensions 1 and 500', () => {
    expect(() => createPattern('min', MIN_DIMENSION, MIN_DIMENSION)).not.toThrow();
    expect(() => createPattern('max', MAX_DIMENSION, MAX_DIMENSION)).not.toThrow();
  });

  it('rejects dimensions outside 1-500', () => {
    expect(() => createPattern('bad', 0, 20)).toThrow(RangeError);
    expect(() => createPattern('bad', 20, 501)).toThrow(RangeError);
  });

  it('rejects non-integer dimensions', () => {
    expect(() => createPattern('bad', 20.5, 20)).toThrow(RangeError);
  });
});

describe('isValidDimension', () => {
  it('validates the 1-500 inclusive bound', () => {
    expect(isValidDimension(1)).toBe(true);
    expect(isValidDimension(500)).toBe(true);
    expect(isValidDimension(0)).toBe(false);
    expect(isValidDimension(501)).toBe(false);
    expect(isValidDimension(3.5)).toBe(false);
  });
});
