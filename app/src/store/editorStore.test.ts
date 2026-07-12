import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from './editorStore';

afterEach(() => {
  useEditorStore.setState({ pattern: null });
});

beforeEach(() => {
  useEditorStore.getState().newPattern('T', 2, 2);
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
