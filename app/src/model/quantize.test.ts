import { describe, expect, it } from 'vitest';
import { quantizeImage, type RGB } from './quantize';

function solidBuffer(rows: number, cols: number, color: RGB): RGB[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ ...color })));
}

const RED: RGB = { r: 220, g: 20, b: 20 };
const BLUE: RGB = { r: 20, g: 20, b: 220 };

// Left half red, right half blue.
function twoColorBuffer(rows: number, cols: number): RGB[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (_, x) => (x < cols / 2 ? { ...RED } : { ...BLUE }))
  );
}

describe('quantizeImage', () => {
  it('builds the palette from the whole buffer, independent of target grid size (quantize-first)', () => {
    const buffer = twoColorBuffer(20, 20);
    const small = quantizeImage(buffer, 2, 2, 8);
    const large = quantizeImage(buffer, 10, 10, 8);
    expect(small.palette).toEqual(large.palette);
  });

  it('returns a palette no longer than requested', () => {
    const buffer = twoColorBuffer(20, 20);
    const result = quantizeImage(buffer, 4, 4, 8);
    expect(result.palette.length).toBeLessThanOrEqual(8);
    expect(result.palette.length).toBeGreaterThan(0);
  });

  it('returns a shorter palette than requested on low-color-variety input, with no padding', () => {
    const buffer = solidBuffer(10, 10, RED);
    const result = quantizeImage(buffer, 2, 2, 8);
    expect(result.palette).toHaveLength(1);
    expect(result.grid.flat().every((idx) => idx === 0)).toBe(true);
  });

  it('snaps each cell to the mean of its source pixels, not a single sampled pixel', () => {
    // A 2x2 target over a 2x4 buffer: left cell sees only red, right cell
    // sees 3 blue + 1 red, so its mean should still snap to blue.
    const buffer: RGB[][] = [
      [RED, RED, BLUE, BLUE],
      [RED, RED, BLUE, RED],
    ];
    const result = quantizeImage(buffer, 1, 2, 2);
    expect(result.palette).toHaveLength(2);
    const [leftIdx, rightIdx] = result.grid[0];
    expect(result.palette[leftIdx].toLowerCase()).toMatch(/^#[cd][0-9a-f]/); // reddish
    expect(leftIdx).not.toBe(rightIdx);
  });

  it('uses the single-dominant-color path when colorCount is 1, not the multi-color floor', () => {
    // Mostly red with a small blue patch - the multi-color path has a
    // documented floor above 1, so requesting 1 must go through the
    // dedicated dominant-color extraction instead.
    const buffer: RGB[][] = [
      [RED, RED, RED],
      [RED, RED, BLUE],
      [RED, RED, RED],
    ];
    const result = quantizeImage(buffer, 1, 1, 1);
    expect(result.palette).toHaveLength(1);
    expect(result.grid).toEqual([[0]]);
  });

  it('rejects a non-positive or non-integer colorCount', () => {
    const buffer = solidBuffer(2, 2, RED);
    expect(() => quantizeImage(buffer, 1, 1, 0)).toThrow(RangeError);
    expect(() => quantizeImage(buffer, 1, 1, 1.5)).toThrow(RangeError);
  });

  it('produces a grid matching the requested target dimensions', () => {
    const buffer = twoColorBuffer(20, 20);
    const result = quantizeImage(buffer, 5, 7, 4);
    expect(result.grid).toHaveLength(5);
    expect(result.grid.every((row) => row.length === 7)).toBe(true);
  });
});
