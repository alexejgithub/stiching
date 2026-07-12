import { describe, expect, it } from 'vitest';
import { createPattern } from './pattern';
import { paintCell } from './paint';

describe('paintCell', () => {
  it('paints a slot id onto a cell', () => {
    const p = createPattern('T', 3, 3);
    const painted = paintCell(p, 1, 1, 5);
    expect(painted.grid[1][1]).toBe(5);
  });

  it('erases a cell back to Blank when slotId is null', () => {
    let p = createPattern('T', 3, 3);
    p = paintCell(p, 1, 1, 5);
    p = paintCell(p, 1, 1, null);
    expect(p.grid[1][1]).toBeNull();
  });

  it('paints and erases all four grid corners safely', () => {
    let p = createPattern('T', 3, 3);
    p = paintCell(p, 0, 0, 1);
    p = paintCell(p, 0, 2, 2);
    p = paintCell(p, 2, 0, 3);
    p = paintCell(p, 2, 2, 4);
    expect(p.grid[0][0]).toBe(1);
    expect(p.grid[0][2]).toBe(2);
    expect(p.grid[2][0]).toBe(3);
    expect(p.grid[2][2]).toBe(4);

    p = paintCell(p, 0, 0, null);
    p = paintCell(p, 2, 2, null);
    expect(p.grid[0][0]).toBeNull();
    expect(p.grid[2][2]).toBeNull();
  });

  it('is a no-op for out-of-range row/col instead of throwing', () => {
    const p = createPattern('T', 3, 3);
    expect(paintCell(p, -1, 0, 5)).toBe(p);
    expect(paintCell(p, 0, -1, 5)).toBe(p);
    expect(paintCell(p, 3, 0, 5)).toBe(p);
    expect(paintCell(p, 0, 3, 5)).toBe(p);
  });
});
