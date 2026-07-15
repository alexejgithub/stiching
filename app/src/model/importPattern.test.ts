import { describe, expect, it } from 'vitest';
import { createPatternFromImport } from './importPattern';

describe('createPatternFromImport', () => {
  it('builds a Pattern sized to the cells grid, with no starter palette', () => {
    const cells = [
      [0, 1],
      [1, 0],
    ];
    const p = createPatternFromImport('Imported', cells, ['#ff0000', '#0000ff']);
    expect(p.rows).toBe(2);
    expect(p.cols).toBe(2);
    expect(p.name).toBe('Imported');
    expect(p.palette).toHaveLength(2);
  });

  it('mints palette slots in extraction order with default "Color N" labels', () => {
    const cells = [[0, 1, 2]];
    const p = createPatternFromImport('Imported', cells, ['#111111', '#222222', '#333333']);
    expect(p.palette.map((s) => s.label)).toEqual(['Color 1', 'Color 2', 'Color 3']);
    expect(p.palette.map((s) => s.hex)).toEqual(['#111111', '#222222', '#333333']);
  });

  it('assigns slot ids and symbol ids by add-order, matching addSlot elsewhere', () => {
    const cells = [[0, 1]];
    const p = createPatternFromImport('Imported', cells, ['#111111', '#222222']);
    expect(p.palette.map((s) => s.id)).toEqual([1, 2]);
    expect(p.palette.map((s) => s.symbolId)).toEqual([0, 1]);
    expect(p.nextSlotId).toBe(3);
    expect(p.palette.every((s) => s.yarnLink === null)).toBe(true);
  });

  it('maps each cell to the slot id of its palette index', () => {
    const cells = [
      [0, 1],
      [1, 0],
    ];
    const p = createPatternFromImport('Imported', cells, ['#ff0000', '#0000ff']);
    const redId = p.palette[0].id;
    const blueId = p.palette[1].id;
    expect(p.grid).toEqual([
      [redId, blueId],
      [blueId, redId],
    ]);
  });

  it('preserves null cells as Blank', () => {
    const cells = [[0, null]];
    const p = createPatternFromImport('Imported', cells, ['#ff0000']);
    expect(p.grid).toEqual([[p.palette[0].id, null]]);
  });

  it('mints a distinct id per pattern', () => {
    const a = createPatternFromImport('A', [[0]], ['#ff0000']);
    const b = createPatternFromImport('B', [[0]], ['#ff0000']);
    expect(a.id).not.toBe(b.id);
  });

  it('handles a palette shorter than 8 (low-color-variety import)', () => {
    const cells = [[0, 0, 0]];
    const p = createPatternFromImport('Imported', cells, ['#ff0000']);
    expect(p.palette).toHaveLength(1);
    expect(p.grid[0].every((id) => id === p.palette[0].id)).toBe(true);
  });
});
