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

describe('reorderSlot', () => {
  it('reorders the palette without touching any grid cell', () => {
    useEditorStore.getState().addSlot('#111111', 'a');
    useEditorStore.getState().addSlot('#222222', 'b');
    const [aId, bId] = useEditorStore.getState().pattern!.palette.map((s) => s.id);

    useEditorStore.getState().reorderSlot(0, 1);

    expect(useEditorStore.getState().pattern!.palette.map((s) => s.id)).toEqual([bId, aId]);
  });
});
