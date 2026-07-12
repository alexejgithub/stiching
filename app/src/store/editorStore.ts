import { create } from 'zustand';
import { type Pattern, type SlotId, createPattern } from '../model/pattern';
import * as palette from '../model/palette';
import { type DeleteSlotResult } from '../model/palette';
import { paintCell } from '../model/paint';

// A single tool for now (ticket 21's scope); ticket 23 adds 'select' without
// needing to rework this field.
export type Tool = 'draw';

// Tracks an in-progress pointer-down-to-pointer-up drag as one coherent unit,
// so ticket 22's undo/redo can coalesce a whole stroke into a single command
// without reworking this action shape. `slotId` is captured at beginStroke so
// switching the active slot mid-drag can't change an already-started stroke.
interface Stroke {
  slotId: SlotId | null;
}

export interface EditorState {
  pattern: Pattern | null;
  tool: Tool;
  activeSlotId: SlotId | null; // null = eraser
  stroke: Stroke | null;
  newPattern: (name: string, rows: number, cols: number) => void;
  setTool: (tool: Tool) => void;
  setActiveSlot: (slotId: SlotId | null) => void;
  beginStroke: (row: number, col: number) => void;
  continueStroke: (row: number, col: number) => void;
  endStroke: () => void;
  addSlot: (hex: string, label: string) => void;
  overrideSlotSymbol: (slotId: SlotId, symbolIndex: number) => void;
  renameSlot: (slotId: SlotId, label: string) => void;
  recolorSlot: (slotId: SlotId, hex: string) => void;
  reorderSlot: (fromIndex: number, toIndex: number) => void;
  deleteSlot: (slotId: SlotId, options?: { clearCells?: boolean }) => DeleteSlotResult | undefined;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  pattern: null,
  tool: 'draw',
  activeSlotId: null,
  stroke: null,
  newPattern: (name, rows, cols) =>
    set({ pattern: createPattern(name, rows, cols), activeSlotId: null, stroke: null }),
  setTool: (tool) => set({ tool }),
  setActiveSlot: (slotId) => set({ activeSlotId: slotId }),
  beginStroke: (row, col) => {
    const { pattern, activeSlotId } = get();
    if (!pattern) return;
    set({ pattern: paintCell(pattern, row, col, activeSlotId), stroke: { slotId: activeSlotId } });
  },
  continueStroke: (row, col) => {
    const { pattern, stroke } = get();
    if (!pattern || !stroke) return;
    set({ pattern: paintCell(pattern, row, col, stroke.slotId) });
  },
  endStroke: () => set({ stroke: null }),
  addSlot: (hex, label) => {
    const pattern = get().pattern;
    if (!pattern) return;
    set({ pattern: palette.addSlot(pattern, hex, label) });
  },
  overrideSlotSymbol: (slotId, symbolIndex) => {
    const pattern = get().pattern;
    if (!pattern) return;
    set({ pattern: palette.overrideSlotSymbol(pattern, slotId, symbolIndex) });
  },
  renameSlot: (slotId, label) => {
    const pattern = get().pattern;
    if (!pattern) return;
    set({ pattern: palette.renameSlot(pattern, slotId, label) });
  },
  recolorSlot: (slotId, hex) => {
    const pattern = get().pattern;
    if (!pattern) return;
    set({ pattern: palette.recolorSlot(pattern, slotId, hex) });
  },
  reorderSlot: (fromIndex, toIndex) => {
    const pattern = get().pattern;
    if (!pattern) return;
    set({ pattern: palette.reorderSlot(pattern, fromIndex, toIndex) });
  },
  deleteSlot: (slotId, options) => {
    const pattern = get().pattern;
    if (!pattern) return undefined;
    const result = palette.deleteSlot(pattern, slotId, options);
    if (result.ok) set({ pattern: result.pattern });
    return result;
  },
}));
