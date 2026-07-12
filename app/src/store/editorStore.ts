import { create } from 'zustand';
import { type Pattern, createPattern } from '../model/pattern';

export interface EditorState {
  pattern: Pattern | null;
  newPattern: (name: string, rows: number, cols: number) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  pattern: null,
  newPattern: (name, rows, cols) => set({ pattern: createPattern(name, rows, cols) }),
}));
