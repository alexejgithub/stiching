import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from './editorStore';

afterEach(() => {
  useEditorStore.setState({ pattern: null });
});

beforeEach(() => {
  useEditorStore.getState().newPattern('T', 2, 2);
  // newPattern seeds an 8-slot starter palette (ticket 33, covered by the
  // 'newPattern' describe block below and by pattern.test.ts). The rest of
  // this file exercises addSlot/deleteSlot/paint/undo mechanics against a
  // blank starting palette, so reset it here to keep those tests focused on
  // the mechanics rather than the seed's exact contents.
  useEditorStore.setState((s) => ({ pattern: { ...s.pattern!, palette: [], nextSlotId: 1 } }));
});

describe('newPattern', () => {
  it('seeds an 8-slot starter palette ready to paint with immediately', () => {
    useEditorStore.getState().newPattern('T', 2, 2);
    const pattern = useEditorStore.getState().pattern!;
    expect(pattern.palette).toHaveLength(8);
    expect(pattern.nextSlotId).toBe(9);
    expect(pattern.palette.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('treats a seeded slot exactly like a manually-added one: renamable, recolorable, reorderable, and deletable', () => {
    useEditorStore.getState().newPattern('T', 2, 2);
    const [firstId, secondId] = useEditorStore.getState().pattern!.palette.map((s) => s.id);

    useEditorStore.getState().setActiveSlot(firstId);
    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().endStroke();
    expect(useEditorStore.getState().pattern!.grid[0][0]).toBe(firstId);

    useEditorStore.getState().renameSlot(firstId, 'My Red');
    useEditorStore.getState().recolorSlot(firstId, '#123456');
    let first = useEditorStore.getState().pattern!.palette.find((s) => s.id === firstId);
    expect(first).toMatchObject({ label: 'My Red', hex: '#123456' });

    useEditorStore.getState().reorderSlot(0, 1);
    expect(useEditorStore.getState().pattern!.palette.map((s) => s.id)[1]).toBe(firstId);

    // Deletion is blocked while the painted cell still references it, just
    // like any other slot's "in use" guard.
    const blocked = useEditorStore.getState().deleteSlot(firstId);
    expect(blocked).toEqual({ ok: false, reason: 'in-use', cellCount: 1 });

    const cleared = useEditorStore.getState().deleteSlot(firstId, { clearCells: true });
    expect(cleared?.ok).toBe(true);
    expect(useEditorStore.getState().pattern!.grid[0][0]).toBeNull();
    expect(useEditorStore.getState().pattern!.palette.find((s) => s.id === firstId)).toBeUndefined();
    // The other seeded slots are untouched.
    expect(useEditorStore.getState().pattern!.palette.some((s) => s.id === secondId)).toBe(true);
  });
});

describe('addSlot', () => {
  it('mints a slot with an auto-assigned symbol', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const palette = useEditorStore.getState().pattern?.palette;
    expect(palette).toHaveLength(1);
    expect(palette?.[0]).toMatchObject({ hex: '#ff0000', label: 'Red', symbolId: 0 });
  });
});

describe('deleteSlot', () => {
  it('blocks deletion while referenced and leaves grid/palette state untouched', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    // simulate a painted cell (no paint action exists yet in this ticket's scope)
    useEditorStore.setState((s) => {
      const grid = s.pattern!.grid.map((row) => [...row]);
      grid[0][0] = slotId;
      return { pattern: { ...s.pattern!, grid } };
    });
    const gridBefore = useEditorStore.getState().pattern!.grid;
    const paletteBefore = useEditorStore.getState().pattern!.palette;

    const result = useEditorStore.getState().deleteSlot(slotId);

    expect(result).toEqual({ ok: false, reason: 'in-use', cellCount: 1 });
    expect(useEditorStore.getState().pattern!.grid).toEqual(gridBefore);
    expect(useEditorStore.getState().pattern!.palette).toEqual(paletteBefore);
  });

  it('clears referencing cells and deletes the slot when clearCells is passed', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.setState((s) => {
      const grid = s.pattern!.grid.map((row) => [...row]);
      grid[0][0] = slotId;
      return { pattern: { ...s.pattern!, grid } };
    });

    const result = useEditorStore.getState().deleteSlot(slotId, { clearCells: true });

    expect(result?.ok).toBe(true);
    expect(useEditorStore.getState().pattern!.palette).toHaveLength(0);
    expect(useEditorStore.getState().pattern!.grid[0][0]).toBeNull();
  });

  it('succeeds immediately when the slot is unreferenced', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;

    const result = useEditorStore.getState().deleteSlot(slotId);

    expect(result?.ok).toBe(true);
    expect(useEditorStore.getState().pattern!.palette).toHaveLength(0);
  });
});

describe('renameSlot / recolorSlot', () => {
  it('updates the store pattern so a live getSlot lookup for a painted cell reflects the change', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;

    useEditorStore.getState().recolorSlot(slotId, '#00ff00');
    useEditorStore.getState().renameSlot(slotId, 'Green');

    const slot = useEditorStore.getState().pattern!.palette[0];
    expect(slot.hex).toBe('#00ff00');
    expect(slot.label).toBe('Green');
  });
});

describe('setActiveSlot', () => {
  it('defaults to null (eraser) on a fresh pattern', () => {
    expect(useEditorStore.getState().activeSlotId).toBeNull();
  });

  it('updates the active slot id', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;

    useEditorStore.getState().setActiveSlot(slotId);

    expect(useEditorStore.getState().activeSlotId).toBe(slotId);
  });
});

describe('paint/erase strokes', () => {
  it('paints a single cell via beginStroke + endStroke', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.getState().setActiveSlot(slotId);

    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().endStroke();

    expect(useEditorStore.getState().pattern!.grid[0][0]).toBe(slotId);
    expect(useEditorStore.getState().stroke).toBeNull();
  });

  it('paints a dragged run of cells across multiple continueStroke calls', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.getState().setActiveSlot(slotId);

    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().continueStroke(0, 1);
    useEditorStore.getState().continueStroke(1, 1);
    useEditorStore.getState().continueStroke(1, 0);
    useEditorStore.getState().endStroke();

    const grid = useEditorStore.getState().pattern!.grid;
    expect(grid[0][0]).toBe(slotId);
    expect(grid[0][1]).toBe(slotId);
    expect(grid[1][1]).toBe(slotId);
    expect(grid[1][0]).toBe(slotId);
  });

  it('erases a single cell when the active slot is the eraser (null)', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.getState().setActiveSlot(slotId);
    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().endStroke();

    useEditorStore.getState().setActiveSlot(null);
    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().endStroke();

    expect(useEditorStore.getState().pattern!.grid[0][0]).toBeNull();
  });

  it('erases a dragged run of cells back to Blank', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.getState().setActiveSlot(slotId);
    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().continueStroke(0, 1);
    useEditorStore.getState().continueStroke(1, 1);
    useEditorStore.getState().endStroke();

    useEditorStore.getState().setActiveSlot(null);
    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().continueStroke(0, 1);
    useEditorStore.getState().continueStroke(1, 1);
    useEditorStore.getState().endStroke();

    const grid = useEditorStore.getState().pattern!.grid;
    expect(grid[0][0]).toBeNull();
    expect(grid[0][1]).toBeNull();
    expect(grid[1][1]).toBeNull();
  });

  it('a mid-drag activeSlotId change does not affect the in-progress stroke', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    useEditorStore.getState().addSlot('#00ff00', 'Green');
    const [redId, greenId] = useEditorStore.getState().pattern!.palette.map((s) => s.id);
    useEditorStore.getState().setActiveSlot(redId);

    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().setActiveSlot(greenId); // should not retroactively affect this stroke
    useEditorStore.getState().continueStroke(0, 1);
    useEditorStore.getState().endStroke();

    const grid = useEditorStore.getState().pattern!.grid;
    expect(grid[0][0]).toBe(redId);
    expect(grid[0][1]).toBe(redId);
  });

  it('paints and erases safely at every corner of the grid (0,0 and rows-1,cols-1)', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.getState().setActiveSlot(slotId);

    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().continueStroke(1, 1);
    useEditorStore.getState().endStroke();

    let grid = useEditorStore.getState().pattern!.grid;
    expect(grid[0][0]).toBe(slotId);
    expect(grid[1][1]).toBe(slotId);

    useEditorStore.getState().setActiveSlot(null);
    useEditorStore.getState().beginStroke(1, 0);
    useEditorStore.getState().continueStroke(0, 1);
    useEditorStore.getState().endStroke();

    grid = useEditorStore.getState().pattern!.grid;
    expect(grid[1][0]).toBeNull();
    expect(grid[0][1]).toBeNull();
  });

  it('is a no-op for out-of-range strokes rather than throwing', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.getState().setActiveSlot(slotId);

    expect(() => {
      useEditorStore.getState().beginStroke(-1, 0);
      useEditorStore.getState().continueStroke(5, 5);
      useEditorStore.getState().endStroke();
    }).not.toThrow();

    const grid = useEditorStore.getState().pattern!.grid;
    expect(grid.flat().every((c) => c === null)).toBe(true);
  });

  it('continueStroke without an active stroke is a no-op', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.getState().setActiveSlot(slotId);

    useEditorStore.getState().continueStroke(0, 0);

    expect(useEditorStore.getState().pattern!.grid[0][0]).toBeNull();
  });
});

describe('reorderSlot', () => {
  it('reorders the palette without touching any grid cell', () => {
    useEditorStore.getState().addSlot('#111111', 'a');
    useEditorStore.getState().addSlot('#222222', 'b');
    const [aId, bId] = useEditorStore.getState().pattern!.palette.map((s) => s.id);

    useEditorStore.getState().reorderSlot(0, 1);

    expect(useEditorStore.getState().pattern!.palette.map((s) => s.id)).toEqual([bId, aId]);
  });
});

describe('undo/redo', () => {
  it('starts with nothing to undo or redo on a fresh pattern', () => {
    expect(useEditorStore.getState().canUndo).toBe(false);
    expect(useEditorStore.getState().canRedo).toBe(false);
  });

  it('undoes and redoes a single-cell paint', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.getState().setActiveSlot(slotId);

    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().endStroke();
    expect(useEditorStore.getState().pattern!.grid[0][0]).toBe(slotId);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().pattern!.grid[0][0]).toBeNull();

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().pattern!.grid[0][0]).toBe(slotId);
  });

  it('undoes a multi-cell drag as a single step', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.getState().setActiveSlot(slotId);

    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().continueStroke(0, 1);
    useEditorStore.getState().continueStroke(1, 1);
    useEditorStore.getState().continueStroke(1, 0);
    useEditorStore.getState().endStroke();

    let grid = useEditorStore.getState().pattern!.grid;
    expect(grid[0][0]).toBe(slotId);
    expect(grid[1][0]).toBe(slotId);

    useEditorStore.getState().undo();

    grid = useEditorStore.getState().pattern!.grid;
    expect(grid.flat().every((c) => c === null)).toBe(true);
    expect(useEditorStore.getState().canUndo).toBe(true); // the addSlot command is still on the stack

    useEditorStore.getState().redo();
    grid = useEditorStore.getState().pattern!.grid;
    expect(grid[0][0]).toBe(slotId);
    expect(grid[0][1]).toBe(slotId);
    expect(grid[1][1]).toBe(slotId);
    expect(grid[1][0]).toBe(slotId);
  });

  it('a stroke that repaints the same cell twice records the pre-stroke value as before', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    useEditorStore.getState().addSlot('#00ff00', 'Green');
    const [redId] = useEditorStore.getState().pattern!.palette.map((s) => s.id);
    useEditorStore.getState().setActiveSlot(redId);

    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().continueStroke(0, 1);
    useEditorStore.getState().continueStroke(0, 0); // revisit the same cell mid-drag
    useEditorStore.getState().endStroke();

    useEditorStore.getState().undo();
    const grid = useEditorStore.getState().pattern!.grid;
    expect(grid[0][0]).toBeNull();
    expect(grid[0][1]).toBeNull();
  });

  it('undoes and redoes addSlot', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    expect(useEditorStore.getState().pattern!.palette).toHaveLength(1);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().pattern!.palette).toHaveLength(0);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().pattern!.palette).toHaveLength(1);
    expect(useEditorStore.getState().pattern!.palette[0]).toMatchObject({ hex: '#ff0000', label: 'Red' });
  });

  it('undoes and redoes renameSlot', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;

    useEditorStore.getState().renameSlot(slotId, 'Crimson');
    expect(useEditorStore.getState().pattern!.palette[0].label).toBe('Crimson');

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().pattern!.palette[0].label).toBe('Red');

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().pattern!.palette[0].label).toBe('Crimson');
  });

  it('undoes and redoes recolorSlot', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;

    useEditorStore.getState().recolorSlot(slotId, '#00ff00');
    expect(useEditorStore.getState().pattern!.palette[0].hex).toBe('#00ff00');

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().pattern!.palette[0].hex).toBe('#ff0000');

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().pattern!.palette[0].hex).toBe('#00ff00');
  });

  it('undoes and redoes overrideSlotSymbol', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    const originalSymbolId = useEditorStore.getState().pattern!.palette[0].symbolId;

    useEditorStore.getState().overrideSlotSymbol(slotId, 5);
    expect(useEditorStore.getState().pattern!.palette[0].symbolId).toBe(5);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().pattern!.palette[0].symbolId).toBe(originalSymbolId);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().pattern!.palette[0].symbolId).toBe(5);
  });

  it('undoes and redoes reorderSlot', () => {
    useEditorStore.getState().addSlot('#111111', 'a');
    useEditorStore.getState().addSlot('#222222', 'b');
    const [aId, bId] = useEditorStore.getState().pattern!.palette.map((s) => s.id);

    useEditorStore.getState().reorderSlot(0, 1);
    expect(useEditorStore.getState().pattern!.palette.map((s) => s.id)).toEqual([bId, aId]);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().pattern!.palette.map((s) => s.id)).toEqual([aId, bId]);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().pattern!.palette.map((s) => s.id)).toEqual([bId, aId]);
  });

  it('does not record a no-op reorderSlot (out-of-range indices)', () => {
    useEditorStore.getState().addSlot('#111111', 'a');
    expect(useEditorStore.getState().undoStack).toHaveLength(1); // addSlot itself is undoable

    useEditorStore.getState().reorderSlot(5, 9);
    // no new command should have been pushed by the no-op reorder
    expect(useEditorStore.getState().undoStack).toHaveLength(1);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().pattern!.palette).toHaveLength(0);
    expect(useEditorStore.getState().canUndo).toBe(false);
  });

  it('undoes and redoes deleteSlot, including the clearCells case', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.setState((s) => {
      const grid = s.pattern!.grid.map((row) => [...row]);
      grid[0][0] = slotId;
      return { pattern: { ...s.pattern!, grid } };
    });

    useEditorStore.getState().deleteSlot(slotId, { clearCells: true });
    expect(useEditorStore.getState().pattern!.palette).toHaveLength(0);
    expect(useEditorStore.getState().pattern!.grid[0][0]).toBeNull();

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().pattern!.palette).toHaveLength(1);
    expect(useEditorStore.getState().pattern!.grid[0][0]).toBe(slotId);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().pattern!.palette).toHaveLength(0);
    expect(useEditorStore.getState().pattern!.grid[0][0]).toBeNull();
  });

  it('does not record a command for a blocked delete', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.setState((s) => {
      const grid = s.pattern!.grid.map((row) => [...row]);
      grid[0][0] = slotId;
      return { pattern: { ...s.pattern!, grid } };
    });

    expect(useEditorStore.getState().undoStack).toHaveLength(1); // just the addSlot so far

    useEditorStore.getState().deleteSlot(slotId); // blocked: cell still references it
    expect(useEditorStore.getState().undoStack).toHaveLength(1); // still just the addSlot
    useEditorStore.getState().undo();
    // only the addSlot should have been undone, not a phantom delete command
    expect(useEditorStore.getState().pattern!.palette).toHaveLength(0);
    expect(useEditorStore.getState().canUndo).toBe(false);
  });

  it('clears the redo stack once a new action is dispatched after an undo', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.getState().setActiveSlot(slotId);
    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().endStroke();

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().canRedo).toBe(true);

    useEditorStore.getState().beginStroke(1, 1);
    useEditorStore.getState().endStroke();

    expect(useEditorStore.getState().canRedo).toBe(false);
    useEditorStore.getState().redo(); // no-op, redo stack was cleared
    expect(useEditorStore.getState().pattern!.grid[0][0]).toBeNull();
    expect(useEditorStore.getState().pattern!.grid[1][1]).toBe(slotId);
  });

  it('undo/redo never touch selection-adjacent fields, only pattern', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.getState().setActiveSlot(slotId);
    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().endStroke();

    const toolBefore = useEditorStore.getState().tool;
    const activeSlotBefore = useEditorStore.getState().activeSlotId;

    useEditorStore.getState().undo();

    expect(useEditorStore.getState().tool).toBe(toolBefore);
    expect(useEditorStore.getState().activeSlotId).toBe(activeSlotBefore);
  });

  it('undo/redo never touch a floating selection (ticket 23, ticket 22 contract)', () => {
    useEditorStore.getState().newPattern('T', 4, 4);
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.getState().setActiveSlot(slotId);
    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().endStroke(); // one undoable paint at (0,0)

    // Lift a selection elsewhere and leave it floating (uncommitted).
    useEditorStore.getState().beginMarqueeDrag(2, 2);
    useEditorStore.getState().continueMarqueeDrag(3, 3);
    useEditorStore.getState().endMarqueeDrag();
    const selectionBefore = useEditorStore.getState().selection;
    expect(selectionBefore).not.toBeNull();

    useEditorStore.getState().undo(); // reverts only the paint stroke

    expect(useEditorStore.getState().pattern!.grid[0][0]).toBeNull();
    expect(useEditorStore.getState().selection).toEqual(selectionBefore);

    useEditorStore.getState().redo();

    expect(useEditorStore.getState().pattern!.grid[0][0]).toBe(slotId);
    expect(useEditorStore.getState().selection).toEqual(selectionBefore);
  });

  it('caps history at ~100 steps, dropping the oldest entry rather than the newest', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.getState().setActiveSlot(slotId);
    // one command from addSlot already on the stack; push 105 single-cell paint commands
    for (let i = 0; i < 105; i++) {
      useEditorStore.getState().beginStroke(0, 0);
      useEditorStore.getState().endStroke();
      useEditorStore.getState().setActiveSlot(useEditorStore.getState().activeSlotId === slotId ? null : slotId);
    }

    expect(useEditorStore.getState().undoStack.length).toBe(100);

    // undo all the way: the oldest surviving command must NOT be the addSlot
    // (which should have been evicted), so the palette must still have the slot
    for (let i = 0; i < 100; i++) {
      useEditorStore.getState().undo();
    }
    expect(useEditorStore.getState().canUndo).toBe(false);
    // the addSlot command was the oldest and got evicted by the cap, so it's
    // no longer reachable via undo — the Red slot survives even after
    // undoing every remaining step
    expect(useEditorStore.getState().pattern!.palette).toHaveLength(1);
  });
});

function setGrid(cells: Array<[number, number, number]>) {
  useEditorStore.setState((s) => {
    const grid = s.pattern!.grid.map((row) => [...row]);
    for (const [row, col, value] of cells) grid[row][col] = value;
    return { pattern: { ...s.pattern!, grid } };
  });
}

describe('marquee selection', () => {
  it('drags out a rectangular marquee and lifts the region into a floating selection, blanking it in place', () => {
    useEditorStore.getState().newPattern('T', 5, 5);
    setGrid([
      [1, 1, 7],
      [1, 2, 8],
      [2, 1, 9],
      [2, 2, 10],
    ]);

    useEditorStore.getState().beginMarqueeDrag(1, 1);
    useEditorStore.getState().continueMarqueeDrag(2, 2);
    useEditorStore.getState().endMarqueeDrag();

    const { selection, pattern } = useEditorStore.getState();
    expect(selection).not.toBeNull();
    expect(selection!.block).toEqual([
      [7, 8],
      [9, 10],
    ]);
    expect(selection!.anchorRow).toBe(1);
    expect(selection!.anchorCol).toBe(1);
    expect(pattern!.grid[1][1]).toBeNull();
    expect(pattern!.grid[2][2]).toBeNull();
  });

  it('select-all lifts the entire grid as the trivial whole-grid rect', () => {
    useEditorStore.getState().newPattern('T', 3, 4);
    setGrid([[0, 0, 1]]);

    useEditorStore.getState().selectAll();

    const { selection, pattern } = useEditorStore.getState();
    expect(selection!.block.length).toBe(3);
    expect(selection!.block[0].length).toBe(4);
    expect(selection!.anchorRow).toBe(0);
    expect(selection!.anchorCol).toBe(0);
    expect(pattern!.grid.flat().every((c) => c === null)).toBe(true);
  });

  it('starting a new marquee drag replaces (stamps down) the current selection first', () => {
    useEditorStore.getState().newPattern('T', 5, 5);
    setGrid([[0, 0, 3]]);

    useEditorStore.getState().beginMarqueeDrag(0, 0);
    useEditorStore.getState().endMarqueeDrag();
    useEditorStore.getState().nudgeSelection(1, 1); // move it so replacing has an observable effect

    useEditorStore.getState().beginMarqueeDrag(3, 3);
    useEditorStore.getState().endMarqueeDrag();

    const { pattern, selection } = useEditorStore.getState();
    expect(pattern!.grid[1][1]).toBe(3); // previous selection committed at its nudged position
    expect(selection).not.toBeNull();
    expect(selection!.anchorRow).toBe(3);
    expect(selection!.anchorCol).toBe(3);
  });
});

describe('rotateSelection / mirrorSelection', () => {
  it('rotates CW and swaps dimensions for a non-square selection', () => {
    useEditorStore.getState().newPattern('T', 5, 5);
    setGrid([
      [0, 0, 1],
      [0, 1, 2],
      [0, 2, 3],
    ]); // 1 row x 3 cols

    useEditorStore.getState().beginMarqueeDrag(0, 0);
    useEditorStore.getState().continueMarqueeDrag(0, 2);
    useEditorStore.getState().endMarqueeDrag();

    useEditorStore.getState().rotateSelection('cw');

    expect(useEditorStore.getState().selection!.block).toEqual([[1], [2], [3]]); // 3 rows x 1 col
  });

  it('rotates CCW as the inverse of CW', () => {
    useEditorStore.getState().newPattern('T', 5, 5);
    setGrid([
      [0, 0, 1],
      [0, 1, 2],
      [0, 2, 3],
    ]);

    useEditorStore.getState().beginMarqueeDrag(0, 0);
    useEditorStore.getState().continueMarqueeDrag(0, 2);
    useEditorStore.getState().endMarqueeDrag();

    useEditorStore.getState().rotateSelection('ccw');
    expect(useEditorStore.getState().selection!.block).toEqual([[3], [2], [1]]);

    useEditorStore.getState().rotateSelection('cw');
    expect(useEditorStore.getState().selection!.block).toEqual([[1, 2, 3]]); // back to the original
  });

  it('flips horizontally and vertically without changing dimensions', () => {
    useEditorStore.getState().newPattern('T', 5, 5);
    setGrid([
      [0, 0, 1],
      [0, 1, 2],
      [1, 0, 3],
      [1, 1, 4],
    ]);

    useEditorStore.getState().beginMarqueeDrag(0, 0);
    useEditorStore.getState().continueMarqueeDrag(1, 1);
    useEditorStore.getState().endMarqueeDrag();

    useEditorStore.getState().mirrorSelection('h');
    expect(useEditorStore.getState().selection!.block).toEqual([
      [2, 1],
      [4, 3],
    ]);

    useEditorStore.getState().mirrorSelection('v');
    expect(useEditorStore.getState().selection!.block).toEqual([
      [4, 3],
      [2, 1],
    ]);
  });
});

describe('move (drag and nudge)', () => {
  it('moves the floating selection via a drag, clamped in-bounds', () => {
    useEditorStore.getState().newPattern('T', 5, 5);
    setGrid([[0, 0, 9]]);

    useEditorStore.getState().beginMarqueeDrag(0, 0);
    useEditorStore.getState().endMarqueeDrag();

    useEditorStore.getState().beginSelectionMove(0, 0); // grab at the block's own top-left
    useEditorStore.getState().continueSelectionMove(2, 2);
    useEditorStore.getState().endSelectionMove();

    const { selection } = useEditorStore.getState();
    expect(selection!.anchorRow).toBe(2);
    expect(selection!.anchorCol).toBe(2);
  });

  it('a move-drag keeps the pointer-to-anchor offset steady rather than re-centering the block', () => {
    useEditorStore.getState().newPattern('T', 6, 6);
    useEditorStore.getState().beginMarqueeDrag(1, 1);
    useEditorStore.getState().continueMarqueeDrag(2, 2); // 2x2 block anchored at (1,1)
    useEditorStore.getState().endMarqueeDrag();

    useEditorStore.getState().beginSelectionMove(2, 2); // grab the block's bottom-right cell, offset (1,1) from anchor
    useEditorStore.getState().continueSelectionMove(4, 4);
    useEditorStore.getState().endSelectionMove();

    const { selection } = useEditorStore.getState();
    expect(selection!.anchorRow).toBe(3); // 4 - offset(1) = 3, not jumped to 4
    expect(selection!.anchorCol).toBe(3);
  });

  it('nudges the floating selection one step per call, clamped at the grid edges', () => {
    useEditorStore.getState().newPattern('T', 4, 4);
    useEditorStore.getState().beginMarqueeDrag(0, 0);
    useEditorStore.getState().continueMarqueeDrag(1, 1); // 2x2 block anchored at (0,0)
    useEditorStore.getState().endMarqueeDrag();

    useEditorStore.getState().nudgeSelection(1, 1);
    expect(useEditorStore.getState().selection).toMatchObject({ anchorRow: 1, anchorCol: 1 });

    // max anchor for a 2x2 block in a 4x4 grid is (2,2) — clamp, don't overshoot
    useEditorStore.getState().nudgeSelection(5, 5);
    expect(useEditorStore.getState().selection).toMatchObject({ anchorRow: 2, anchorCol: 2 });

    // clamp at 0 too, never negative
    useEditorStore.getState().nudgeSelection(-10, -10);
    expect(useEditorStore.getState().selection).toMatchObject({ anchorRow: 0, anchorCol: 0 });
  });
});

describe('clamp-not-truncate (the prototype-validated 1x5-strip-near-edge case)', () => {
  it('preserves all 5 cells when rotating a 1x5 strip flush against the grid edge', () => {
    useEditorStore.getState().newPattern('T', 5, 5);
    setGrid([
      [2, 0, 1],
      [2, 1, 2],
      [2, 2, 3],
      [2, 3, 4],
      [2, 4, 5],
    ]); // full-width 1x5 strip in a 5-wide grid

    useEditorStore.getState().beginMarqueeDrag(2, 0);
    useEditorStore.getState().continueMarqueeDrag(2, 4);
    useEditorStore.getState().endMarqueeDrag();

    useEditorStore.getState().rotateSelection('cw'); // becomes 5 rows x 1 col — must clamp position, not drop cells

    const { selection } = useEditorStore.getState();
    expect(selection!.block).toEqual([[1], [2], [3], [4], [5]]);
    expect(selection!.block.flat().filter((c) => c !== null)).toHaveLength(5); // nothing truncated
    expect(selection!.anchorRow).toBe(0); // clamped into bounds
    expect(selection!.anchorCol).toBe(0);
  });

  it('blocks a rotate outright (selection left untouched) when the rotated block cannot fit anywhere', () => {
    useEditorStore.getState().newPattern('T', 3, 5); // only 3 rows tall — a rotated 5x1 strip can never fit
    setGrid([
      [1, 0, 1],
      [1, 1, 2],
      [1, 2, 3],
      [1, 3, 4],
      [1, 4, 5],
    ]);

    useEditorStore.getState().beginMarqueeDrag(1, 0);
    useEditorStore.getState().continueMarqueeDrag(1, 4);
    useEditorStore.getState().endMarqueeDrag();

    const before = useEditorStore.getState().selection;
    useEditorStore.getState().rotateSelection('cw');
    const after = useEditorStore.getState().selection;

    expect(after).toEqual(before); // blocked entirely, not truncated
  });
});

describe('floating selection commit', () => {
  function setupMovedSelection() {
    useEditorStore.getState().newPattern('T', 5, 5);
    useEditorStore.getState().setTool('select');
    setGrid([[0, 0, 4]]);
    useEditorStore.getState().beginMarqueeDrag(0, 0);
    useEditorStore.getState().endMarqueeDrag();
    useEditorStore.getState().nudgeSelection(2, 2); // move it so the commit has an observable effect
  }

  it('commitSelection (Escape) stamps the selection down as exactly one undo step', () => {
    setupMovedSelection();
    const stackBefore = useEditorStore.getState().undoStack.length;

    useEditorStore.getState().commitSelection();

    expect(useEditorStore.getState().undoStack.length).toBe(stackBefore + 1);
    expect(useEditorStore.getState().pattern!.grid[2][2]).toBe(4);
    expect(useEditorStore.getState().selection).toBeNull();

    useEditorStore.getState().undo(); // one call fully reverts the stamped selection
    expect(useEditorStore.getState().pattern!.grid[2][2]).toBeNull();
    expect(useEditorStore.getState().pattern!.grid[0][0]).toBe(4);
  });

  it('starting a new marquee drag commits the previous selection as exactly one undo step', () => {
    setupMovedSelection();
    const stackBefore = useEditorStore.getState().undoStack.length;

    useEditorStore.getState().beginMarqueeDrag(4, 4);

    expect(useEditorStore.getState().undoStack.length).toBe(stackBefore + 1);
    expect(useEditorStore.getState().pattern!.grid[2][2]).toBe(4);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().pattern!.grid[2][2]).toBeNull();
    expect(useEditorStore.getState().pattern!.grid[0][0]).toBe(4);
  });

  it('switching tools commits the current selection as exactly one undo step', () => {
    setupMovedSelection();
    const stackBefore = useEditorStore.getState().undoStack.length;

    useEditorStore.getState().setTool('draw');

    expect(useEditorStore.getState().undoStack.length).toBe(stackBefore + 1);
    expect(useEditorStore.getState().pattern!.grid[2][2]).toBe(4);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().pattern!.grid[2][2]).toBeNull();
    expect(useEditorStore.getState().pattern!.grid[0][0]).toBe(4);
  });

  it('a no-op selection (lifted then committed with no transform/move) pushes no undo step', () => {
    useEditorStore.getState().newPattern('T', 5, 5);
    setGrid([[0, 0, 4]]);
    const stackBefore = useEditorStore.getState().undoStack.length;

    useEditorStore.getState().beginMarqueeDrag(0, 0);
    useEditorStore.getState().endMarqueeDrag();
    useEditorStore.getState().commitSelection(); // stamped right back where it was lifted from

    expect(useEditorStore.getState().undoStack.length).toBe(stackBefore);
    expect(useEditorStore.getState().pattern!.grid[0][0]).toBe(4);
  });
});

describe('previewResize / applyResize', () => {
  it('grows each edge independently, padding Blank cells and leaving content in its absolute position', () => {
    useEditorStore.getState().newPattern('T', 3, 3);
    setGrid([[0, 0, 5]]);

    useEditorStore.getState().applyResize({ top: 1, bottom: 0, left: 0, right: 0 });
    let pattern = useEditorStore.getState().pattern!;
    expect(pattern.rows).toBe(4);
    expect(pattern.cols).toBe(3);
    expect(pattern.grid[1][0]).toBe(5); // shifted down by the grown top edge

    useEditorStore.getState().applyResize({ top: 0, bottom: 2, left: 0, right: 0 });
    pattern = useEditorStore.getState().pattern!;
    expect(pattern.rows).toBe(6);
    expect(pattern.grid[1][0]).toBe(5); // bottom growth never shifts existing content

    useEditorStore.getState().applyResize({ top: 0, bottom: 0, left: 3, right: 1 });
    pattern = useEditorStore.getState().pattern!;
    expect(pattern.cols).toBe(7);
    expect(pattern.grid[1][3]).toBe(5); // shifted right by the grown left edge
  });

  it('grows all four edges together as one combined resize', () => {
    useEditorStore.getState().newPattern('T', 2, 2);
    setGrid([[0, 0, 9]]);

    useEditorStore.getState().applyResize({ top: 1, bottom: 1, left: 1, right: 1 });

    const pattern = useEditorStore.getState().pattern!;
    expect(pattern.rows).toBe(4);
    expect(pattern.cols).toBe(4);
    expect(pattern.grid[1][1]).toBe(9);
    expect(pattern.grid.flat().filter((c) => c !== null)).toEqual([9]);
  });

  it('shrinking Blank-only space applies immediately with no confirmation-required signal', () => {
    useEditorStore.getState().newPattern('T', 5, 5);
    setGrid([[2, 2, 3]]); // safely inside the shrunk-to region

    const preview = useEditorStore.getState().previewResize({ top: -1, bottom: -1, left: -1, right: -1 });
    expect(preview).toEqual({ ok: true, rows: 3, cols: 3, lostStitchedCellCount: 0 });

    useEditorStore.getState().applyResize({ top: -1, bottom: -1, left: -1, right: -1 });
    const pattern = useEditorStore.getState().pattern!;
    expect(pattern.rows).toBe(3);
    expect(pattern.cols).toBe(3);
    expect(pattern.grid[1][1]).toBe(3); // (2,2) shifted to (1,1) once top/left each shrank by 1
  });

  it('shrinking that would discard stitched cells reports the exact loss count and does not mutate until applied', () => {
    useEditorStore.getState().newPattern('T', 4, 4);
    setGrid([
      [0, 0, 1],
      [3, 3, 2],
    ]); // both in the region a -1/-1/-1/-1 shrink would drop

    const gridBefore = useEditorStore.getState().pattern!.grid;
    const preview = useEditorStore.getState().previewResize({ top: -1, bottom: -1, left: -1, right: -1 });

    expect(preview).toEqual({ ok: true, rows: 2, cols: 2, lostStitchedCellCount: 2 });
    // previewing must not have touched the pattern
    expect(useEditorStore.getState().pattern!.grid).toBe(gridBefore);
    expect(useEditorStore.getState().pattern!.rows).toBe(4);

    useEditorStore.getState().applyResize({ top: -1, bottom: -1, left: -1, right: -1 });
    const pattern = useEditorStore.getState().pattern!;
    expect(pattern.rows).toBe(2);
    expect(pattern.grid.flat().every((c) => c === null)).toBe(true); // both stitched cells were discarded
  });

  it('rejects a resize whose result would be out of bounds, and applyResize does not mutate state', () => {
    useEditorStore.getState().newPattern('T', 1, 1);
    const preview = useEditorStore.getState().previewResize({ top: -1, bottom: 0, left: 0, right: 0 });
    expect(preview).toEqual({ ok: false, reason: 'out-of-bounds' });

    const stackBefore = useEditorStore.getState().undoStack.length;
    useEditorStore.getState().applyResize({ top: -1, bottom: 0, left: 0, right: 0 });

    expect(useEditorStore.getState().pattern!.rows).toBe(1); // unchanged
    expect(useEditorStore.getState().undoStack.length).toBe(stackBefore);
  });

  it('accepts a resize landing exactly on the 1 and 500 bounds, in both directions', () => {
    useEditorStore.getState().newPattern('T', 5, 5);

    const shrinkPreview = useEditorStore.getState().previewResize({ top: -4, bottom: 0, left: -4, right: 0 });
    expect(shrinkPreview).toMatchObject({ ok: true, rows: 1, cols: 1 });
    useEditorStore.getState().applyResize({ top: -4, bottom: 0, left: -4, right: 0 });
    expect(useEditorStore.getState().pattern!.rows).toBe(1);
    expect(useEditorStore.getState().pattern!.cols).toBe(1);

    const growPreview = useEditorStore.getState().previewResize({ top: 499, bottom: 0, left: 499, right: 0 });
    expect(growPreview).toMatchObject({ ok: true, rows: 500, cols: 500 });
    useEditorStore.getState().applyResize({ top: 499, bottom: 0, left: 499, right: 0 });
    expect(useEditorStore.getState().pattern!.rows).toBe(500);
    expect(useEditorStore.getState().pattern!.cols).toBe(500);
  });

  it('applies a combined 4-edge resize as a single undo step that fully reverts rows/cols/grid content', () => {
    useEditorStore.getState().newPattern('T', 4, 4);
    setGrid([[1, 1, 6]]);
    const gridBefore = useEditorStore.getState().pattern!.grid;
    const stackBefore = useEditorStore.getState().undoStack.length;

    useEditorStore.getState().applyResize({ top: 2, bottom: -1, left: 3, right: -2 });

    expect(useEditorStore.getState().undoStack.length).toBe(stackBefore + 1);
    const resized = useEditorStore.getState().pattern!;
    expect(resized.rows).toBe(5);
    expect(resized.cols).toBe(5);

    useEditorStore.getState().undo();

    const reverted = useEditorStore.getState().pattern!;
    expect(reverted.rows).toBe(4);
    expect(reverted.cols).toBe(4);
    expect(reverted.grid).toEqual(gridBefore);
    expect(useEditorStore.getState().undoStack.length).toBe(stackBefore);

    useEditorStore.getState().redo();
    const redone = useEditorStore.getState().pattern!;
    expect(redone.rows).toBe(5);
    expect(redone.cols).toBe(5);
  });

  it('undo/redo of a resize command only ever touches pattern, never selection', () => {
    useEditorStore.getState().newPattern('T', 5, 5);
    setGrid([[0, 0, 4]]);

    useEditorStore.getState().beginMarqueeDrag(3, 3);
    useEditorStore.getState().continueMarqueeDrag(4, 4);
    useEditorStore.getState().endMarqueeDrag(); // leave a selection floating, uncommitted
    const selectionBefore = useEditorStore.getState().selection;
    expect(selectionBefore).not.toBeNull();

    useEditorStore.getState().applyResize({ top: 0, bottom: 0, left: 0, right: -3 }); // shrinks past the selection's anchor
    expect(useEditorStore.getState().selection).toEqual(selectionBefore); // resize itself never touches it

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().pattern!.cols).toBe(5);
    expect(useEditorStore.getState().selection).toEqual(selectionBefore);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().pattern!.cols).toBe(2);
    expect(useEditorStore.getState().selection).toEqual(selectionBefore);
  });

  it('does not crash committing a floating selection left dangling out-of-bounds by a resize shrink', () => {
    useEditorStore.getState().newPattern('T', 5, 5);
    setGrid([[0, 0, 4]]);

    useEditorStore.getState().beginMarqueeDrag(3, 3);
    useEditorStore.getState().continueMarqueeDrag(4, 4);
    useEditorStore.getState().endMarqueeDrag(); // 2x2 selection anchored at (3,3) in a 5x5 grid

    useEditorStore.getState().applyResize({ top: 0, bottom: -3, left: 0, right: -3 }); // grid shrinks to 2x2

    expect(() => useEditorStore.getState().commitSelection()).not.toThrow();
    expect(useEditorStore.getState().selection).toBeNull();
  });
});

describe('replacePattern', () => {
  it('resets undo/redo history, tool, active slot, and any floating selection to the incoming pattern', () => {
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.getState().setActiveSlot(slotId);
    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().endStroke();
    useEditorStore.getState().setTool('select');
    useEditorStore.getState().selectAll();
    expect(useEditorStore.getState().canUndo).toBe(true);
    expect(useEditorStore.getState().selection).not.toBeNull();

    const incoming = useEditorStore.getState().pattern!;
    const smaller = { ...incoming, rows: 1, cols: 1, grid: [[null]] };
    useEditorStore.getState().replacePattern(smaller);

    expect(useEditorStore.getState().pattern).toBe(smaller);
    expect(useEditorStore.getState().canUndo).toBe(false);
    expect(useEditorStore.getState().canRedo).toBe(false);
    expect(useEditorStore.getState().undoStack).toEqual([]);
    expect(useEditorStore.getState().tool).toBe('draw');
    expect(useEditorStore.getState().activeSlotId).toBeNull();
    expect(useEditorStore.getState().selection).toBeNull();

    // The old pattern's undo history is gone, so undo is a no-op rather than
    // replaying a stale diff against the new (smaller) grid and crashing.
    expect(() => useEditorStore.getState().undo()).not.toThrow();
    expect(useEditorStore.getState().pattern).toBe(smaller);
  });

  it('preserves an incoming pattern with a deliberately empty palette exactly, unlike newPattern', () => {
    // The current pattern (from beforeEach) has its palette reset to empty,
    // simulating a real newPattern seed (8 slots) already stripped away by
    // the user. replacePattern (the import/autosave-restore path, ticket 33)
    // must not seed anything on top of an incoming empty palette.
    const incoming = { ...useEditorStore.getState().pattern!, palette: [], nextSlotId: 1 };

    useEditorStore.getState().replacePattern(incoming);

    expect(useEditorStore.getState().pattern!.palette).toEqual([]);
    expect(useEditorStore.getState().pattern!.nextSlotId).toBe(1);
  });
});
