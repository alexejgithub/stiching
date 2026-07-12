import { create } from 'zustand';
import { type Pattern, type SlotId, createPattern } from '../model/pattern';
import * as palette from '../model/palette';
import { type DeleteSlotResult } from '../model/palette';

export interface EditorState {
  pattern: Pattern | null;
  newPattern: (name: string, rows: number, cols: number) => void;
  addSlot: (hex: string, label: string) => void;
  overrideSlotSymbol: (slotId: SlotId, symbolIndex: number) => void;
  renameSlot: (slotId: SlotId, label: string) => void;
  recolorSlot: (slotId: SlotId, hex: string) => void;
  reorderSlot: (fromIndex: number, toIndex: number) => void;
  deleteSlot: (slotId: SlotId, options?: { clearCells?: boolean }) => DeleteSlotResult | undefined;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  pattern: null,
  newPattern: (name, rows, cols) => set({ pattern: createPattern(name, rows, cols) }),
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
