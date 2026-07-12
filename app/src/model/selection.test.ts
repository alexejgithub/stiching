import { describe, expect, it } from 'vitest';
import { createPattern } from './pattern';
import {
  clampAnchor,
  liftRect,
  mirrorHorizontal,
  mirrorVertical,
  rotateCCW,
  rotateCW,
  stampBlock,
} from './selection';

describe('liftRect / stampBlock', () => {
  it('lifts a rect out, blanking it in place, then stamps it back at a new anchor', () => {
    let p = createPattern('T', 4, 4);
    p = { ...p, grid: p.grid.map((row, r) => row.map((_, c) => (r === 0 && c < 2 ? 7 : null))) };

    const { pattern: lifted, block } = liftRect(p, { r0: 0, c0: 0, r1: 0, c1: 1 });
    expect(lifted.grid[0][0]).toBeNull();
    expect(lifted.grid[0][1]).toBeNull();
    expect(block).toEqual([[7, 7]]);

    const stamped = stampBlock(lifted, block, 2, 2);
    expect(stamped.grid[2][2]).toBe(7);
    expect(stamped.grid[2][3]).toBe(7);
  });

  it('stamping leaves underlying cells alone where the block is blank (transparent)', () => {
    let p = createPattern('T', 3, 3);
    p = { ...p, grid: p.grid.map((row, r) => row.map((_, c) => (r === 1 && c === 1 ? 9 : null))) };
    const block = [
      [1, null],
      [null, null],
    ];
    const stamped = stampBlock(p, block, 0, 0);
    expect(stamped.grid[0][0]).toBe(1);
    expect(stamped.grid[1][1]).toBe(9); // untouched — block cell there was null
  });
});

describe('rotateCW / rotateCCW', () => {
  it('swaps dimensions for a non-square block and preserves content', () => {
    const block = [
      [1, 2, 3],
      [4, 5, 6],
    ]; // 2 rows x 3 cols
    const cw = rotateCW(block);
    expect(cw).toEqual([
      [4, 1],
      [5, 2],
      [6, 3],
    ]); // 3 rows x 2 cols

    const ccw = rotateCCW(block);
    expect(ccw).toEqual([
      [3, 6],
      [2, 5],
      [1, 4],
    ]);
  });

  it('rotating CW then CCW is the identity', () => {
    const block = [
      [1, null, 3],
      [null, 5, null],
    ];
    expect(rotateCCW(rotateCW(block))).toEqual(block);
  });
});

describe('mirrorHorizontal / mirrorVertical', () => {
  it('reverses columns for horizontal, rows for vertical', () => {
    const block = [
      [1, 2],
      [3, 4],
    ];
    expect(mirrorHorizontal(block)).toEqual([
      [2, 1],
      [4, 3],
    ]);
    expect(mirrorVertical(block)).toEqual([
      [3, 4],
      [1, 2],
    ]);
  });
});

describe('clampAnchor', () => {
  it('leaves an already in-bounds anchor untouched', () => {
    expect(clampAnchor(2, 3, 2, 2, 10, 10)).toEqual({ row: 2, col: 3 });
  });

  it('clamps an anchor that would overhang the bottom/right edge', () => {
    expect(clampAnchor(9, 9, 2, 2, 10, 10)).toEqual({ row: 8, col: 8 });
  });

  it('clamps a negative anchor back to 0', () => {
    expect(clampAnchor(-3, -3, 2, 2, 10, 10)).toEqual({ row: 0, col: 0 });
  });

  it('blocks (returns null) when the block is larger than the grid on either axis', () => {
    expect(clampAnchor(0, 0, 11, 2, 10, 10)).toBeNull();
    expect(clampAnchor(0, 0, 2, 11, 10, 10)).toBeNull();
  });

  it('the validated 1x5-strip-near-edge case: rotating clamps position, never truncates content', () => {
    // A 1x5 horizontal strip sitting flush against the right edge of a 5x5 grid.
    const block: (number | null)[][] = [[1, 2, 3, 4, 5]]; // 1 row x 5 cols
    const anchorRow = 2;
    const anchorCol = 0; // occupies cols 0..4 of a 5-wide grid — flush right

    const rotated = rotateCW(block); // becomes 5 rows x 1 col
    expect(rotated).toEqual([[1], [2], [3], [4], [5]]);

    const clamped = clampAnchor(anchorRow, anchorCol, rotated.length, rotated[0].length, 5, 5);
    // 5 rows fits exactly once clamped to row 0; content must be the full,
    // untruncated 5-cell strip — no cell was dropped.
    expect(clamped).toEqual({ row: 0, col: 0 });
    expect(rotated.flat()).toEqual([1, 2, 3, 4, 5]);
  });

  it('blocks a rotate outright when even the clamped position cannot fit the rotated block', () => {
    // A 1x5 strip in a grid only 4 cells tall: rotating to 5x1 cannot fit at all.
    const block: (number | null)[][] = [[1, 2, 3, 4, 5]];
    const rotated = rotateCW(block);
    expect(clampAnchor(0, 0, rotated.length, rotated[0].length, 4, 5)).toBeNull();
  });
});
