import { describe, expect, it } from 'vitest';
import { type Pattern, createPattern, getSlot } from './pattern';
import { addSlot, deleteSlot, overrideSlotSymbol, recolorSlot, renameSlot, reorderSlot } from './palette';
import { SYMBOLS } from './symbols';

// These tests exercise addSlot/deleteSlot/reorderSlot mechanics in isolation
// from createPattern's starter-palette seed (ticket 33, covered separately in
// pattern.test.ts), so they start from a pattern with a genuinely blank
// palette rather than createPattern's real (now pre-seeded) output.
function blank(rows: number, cols: number): Pattern {
  const p = createPattern('T', rows, cols);
  return { ...p, palette: [], nextSlotId: 1 };
}

describe('addSlot', () => {
  it('assigns the 1st slot ever minted the 1st symbol', () => {
    const p = addSlot(blank(1, 1), '#ff0000', 'Red');
    expect(p.palette[0].symbolId).toBe(0);
    expect(p.nextSlotId).toBe(2);
  });

  it('assigns the 14th slot ever minted the last symbol in the sequence', () => {
    let p = blank(1, 1);
    for (let i = 0; i < 14; i++) p = addSlot(p, '#000000', `S${i}`);
    expect(p.palette[13].symbolId).toBe(SYMBOLS.length - 1);
  });

  it('cycles back to the start of the sequence past 14 slots', () => {
    let p = blank(1, 1);
    for (let i = 0; i < 15; i++) p = addSlot(p, '#000000', `S${i}`);
    expect(p.palette[14].symbolId).toBe(0);
  });

  it('bases assignment on total slots ever minted, not current palette length, after deletions', () => {
    let p = blank(1, 1);
    p = addSlot(p, '#111111', 'a'); // 1st minted -> symbol 0
    p = addSlot(p, '#222222', 'b'); // 2nd minted -> symbol 1
    p = addSlot(p, '#333333', 'c'); // 3rd minted -> symbol 2
    const bId = p.palette[1].id;
    const result = deleteSlot(p, bId);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected delete to succeed');
    p = result.pattern;
    expect(p.palette).toHaveLength(2);

    p = addSlot(p, '#444444', 'd'); // 4th ever minted -> symbol 3, NOT symbol 2 (current length)
    const d = p.palette.find((s) => s.label === 'd');
    expect(d?.symbolId).toBe(3);
  });
});

describe('overrideSlotSymbol', () => {
  it('sets a slot symbol to an arbitrary index, allowing duplicates across slots', () => {
    let p = blank(1, 1);
    p = addSlot(p, '#111111', 'a');
    p = addSlot(p, '#222222', 'b');
    const [a, b] = p.palette;
    p = overrideSlotSymbol(p, a.id, b.symbolId);
    expect(p.palette[0].symbolId).toBe(b.symbolId);
    expect(p.palette[0].symbolId).toBe(p.palette[1].symbolId);
  });

  it('override survives palette reordering', () => {
    let p = blank(1, 1);
    p = addSlot(p, '#111111', 'a');
    p = addSlot(p, '#222222', 'b');
    const aId = p.palette[0].id;
    p = overrideSlotSymbol(p, aId, 7);
    p = reorderSlot(p, 0, 1);
    const a = p.palette.find((s) => s.id === aId);
    expect(a?.symbolId).toBe(7);
  });

  it('rejects an out-of-range symbol index', () => {
    let p = blank(1, 1);
    p = addSlot(p, '#111111', 'a');
    expect(() => overrideSlotSymbol(p, p.palette[0].id, -1)).toThrow(RangeError);
    expect(() => overrideSlotSymbol(p, p.palette[0].id, SYMBOLS.length)).toThrow(RangeError);
  });
});

describe('renameSlot / recolorSlot', () => {
  it('propagates to a painted cell via a live getSlot lookup, not a copied value', () => {
    let p = blank(1, 1);
    p = addSlot(p, '#ff0000', 'Red');
    const slotId = p.palette[0].id;
    p.grid[0][0] = slotId;

    p = recolorSlot(p, slotId, '#00ff00');
    p = renameSlot(p, slotId, 'Green');

    const slotAtCell = getSlot(p, p.grid[0][0]);
    expect(slotAtCell?.hex).toBe('#00ff00');
    expect(slotAtCell?.label).toBe('Green');
  });
});

describe('reorderSlot', () => {
  it('changes only palette order, never any cell reference', () => {
    let p = blank(1, 2);
    p = addSlot(p, '#111111', 'a');
    p = addSlot(p, '#222222', 'b');
    const [aId, bId] = p.palette.map((s) => s.id);
    p.grid[0][0] = aId;
    p.grid[0][1] = bId;

    p = reorderSlot(p, 0, 1);

    expect(p.palette.map((s) => s.id)).toEqual([bId, aId]);
    expect(p.grid[0][0]).toBe(aId);
    expect(p.grid[0][1]).toBe(bId);
    expect(getSlot(p, p.grid[0][0])?.label).toBe('a');
    expect(getSlot(p, p.grid[0][1])?.label).toBe('b');
  });
});

describe('deleteSlot', () => {
  it('blocks deletion while a cell still references the slot, leaving state untouched', () => {
    let p = blank(1, 1);
    p = addSlot(p, '#ff0000', 'Red');
    const slotId = p.palette[0].id;
    p.grid[0][0] = slotId;
    const before = JSON.parse(JSON.stringify(p));

    const result = deleteSlot(p, slotId);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected delete to be blocked');
    expect(result.reason).toBe('in-use');
    expect(result.cellCount).toBe(1);
    expect(p).toEqual(before);
  });

  it('clears referencing cells and deletes the slot when clearCells is true', () => {
    let p = blank(1, 2);
    p = addSlot(p, '#ff0000', 'Red');
    const slotId = p.palette[0].id;
    p.grid[0][0] = slotId;
    p.grid[0][1] = slotId;

    const result = deleteSlot(p, slotId, { clearCells: true });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected delete to succeed');
    expect(result.pattern.palette).toHaveLength(0);
    expect(result.pattern.grid[0]).toEqual([null, null]);
  });

  it('succeeds immediately when the slot is unreferenced', () => {
    let p = blank(1, 1);
    p = addSlot(p, '#ff0000', 'Red');
    const slotId = p.palette[0].id;

    const result = deleteSlot(p, slotId);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected delete to succeed');
    expect(result.pattern.palette).toHaveLength(0);
  });
});
