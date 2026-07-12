import { create } from 'zustand';
import { type Cell, type Pattern, type Slot, type SlotId, createPattern } from '../model/pattern';
import * as palette from '../model/palette';
import { type DeleteSlotResult } from '../model/palette';
import { paintCell } from '../model/paint';

// A single tool for now (ticket 21's scope); ticket 23 adds 'select' without
// needing to rework this field.
export type Tool = 'draw';

interface CellDiff {
  row: number;
  col: number;
  before: Cell;
  after: Cell;
}

interface PaletteSnapshot {
  palette: Slot[];
  nextSlotId: number;
}

// Invertible per-cell diffs (cost scales with edit size) or a whole-palette
// before/after snapshot (the palette array is always small, bounded by the
// user's color count, not grid size) — see ticket 22. `cellDiffs` on a
// palette command covers deleteSlot's clearCells option, the one palette
// action that also touches the grid; it's empty for every other palette op.
export type Command =
  | { kind: 'cells'; diffs: CellDiff[] }
  | { kind: 'palette'; before: PaletteSnapshot; after: PaletteSnapshot; cellDiffs: CellDiff[] };

const MAX_HISTORY = 100;

// Tracks an in-progress pointer-down-to-pointer-up drag as one coherent unit.
// `slotId` is captured at beginStroke so switching the active slot mid-drag
// can't change an already-started stroke. `diffs` accumulates one entry per
// distinct cell touched (keyed by "row,col"), keeping the pre-stroke value as
// `before` and the latest paint as `after`, so the whole stroke becomes a
// single Command pushed onto the undo stack in endStroke.
interface Stroke {
  slotId: SlotId | null;
  diffs: Map<string, CellDiff>;
}

export interface EditorState {
  pattern: Pattern | null;
  tool: Tool;
  activeSlotId: SlotId | null; // null = eraser
  stroke: Stroke | null;
  undoStack: Command[];
  redoStack: Command[];
  canUndo: boolean;
  canRedo: boolean;
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
  undo: () => void;
  redo: () => void;
}

function historyFlags(undoStack: Command[], redoStack: Command[]) {
  return { undoStack, redoStack, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 };
}

function pushToUndoStack(undoStack: Command[], command: Command): Command[] {
  const next = [...undoStack, command];
  if (next.length > MAX_HISTORY) next.shift();
  return next;
}

// Applies a Command's `before` (undo) or `after` (redo) side to a pattern.
function applyCommand(pattern: Pattern, command: Command, direction: 'before' | 'after'): Pattern {
  if (command.kind === 'palette') {
    const snapshot = command[direction];
    const grid = command.cellDiffs.length > 0 ? applyCellDiffs(pattern.grid, command.cellDiffs, direction) : pattern.grid;
    return { ...pattern, grid, palette: snapshot.palette, nextSlotId: snapshot.nextSlotId };
  }
  return { ...pattern, grid: applyCellDiffs(pattern.grid, command.diffs, direction) };
}

function applyCellDiffs(grid: Cell[][], diffs: CellDiff[], direction: 'before' | 'after'): Cell[][] {
  const rowsTouched = new Set(diffs.map((d) => d.row));
  const nextGrid = grid.map((row, ri) => (rowsTouched.has(ri) ? [...row] : row));
  for (const diff of diffs) {
    nextGrid[diff.row][diff.col] = diff[direction];
  }
  return nextGrid;
}

// Cells that changed between two grids of the same dimensions (used for
// deleteSlot's clearCells option, where the pure model function clears every
// cell referencing the deleted slot in one pass).
function diffGrids(before: Pattern, after: Pattern): CellDiff[] {
  const diffs: CellDiff[] = [];
  for (let row = 0; row < before.rows; row++) {
    for (let col = 0; col < before.cols; col++) {
      if (before.grid[row][col] !== after.grid[row][col]) {
        diffs.push({ row, col, before: before.grid[row][col], after: after.grid[row][col] });
      }
    }
  }
  return diffs;
}

// Records a palette command and commits the resulting pattern in one go.
// `cellDiffs` defaults to empty; only deleteSlot's clearCells option touches
// the grid.
function pushPaletteCommand(
  get: () => EditorState,
  set: (partial: Partial<EditorState>) => void,
  before: Pattern,
  after: Pattern,
  cellDiffs: CellDiff[] = []
) {
  const command: Command = {
    kind: 'palette',
    before: { palette: before.palette, nextSlotId: before.nextSlotId },
    after: { palette: after.palette, nextSlotId: after.nextSlotId },
    cellDiffs,
  };
  set({ pattern: after, ...historyFlags(pushToUndoStack(get().undoStack, command), []) });
}

// Paints one cell and, if it actually changed, records it into a stroke's
// diff map (first touch of a cell keeps its pre-stroke `before`; later
// touches of the same cell only update `after`).
function recordAndPaint(
  pattern: Pattern,
  diffs: Map<string, CellDiff>,
  row: number,
  col: number,
  slotId: SlotId | null
): Pattern {
  const next = paintCell(pattern, row, col, slotId);
  if (next !== pattern) {
    const key = `${row},${col}`;
    const existing = diffs.get(key);
    if (existing) {
      existing.after = slotId;
    } else {
      diffs.set(key, { row, col, before: pattern.grid[row][col], after: slotId });
    }
  }
  return next;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  pattern: null,
  tool: 'draw',
  activeSlotId: null,
  stroke: null,
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,
  newPattern: (name, rows, cols) =>
    set({
      pattern: createPattern(name, rows, cols),
      activeSlotId: null,
      stroke: null,
      ...historyFlags([], []),
    }),
  setTool: (tool) => set({ tool }),
  setActiveSlot: (slotId) => set({ activeSlotId: slotId }),
  beginStroke: (row, col) => {
    const { pattern, activeSlotId } = get();
    if (!pattern) return;
    const diffs = new Map<string, CellDiff>();
    const nextPattern = recordAndPaint(pattern, diffs, row, col, activeSlotId);
    set({ pattern: nextPattern, stroke: { slotId: activeSlotId, diffs } });
  },
  continueStroke: (row, col) => {
    const { pattern, stroke } = get();
    if (!pattern || !stroke) return;
    const nextPattern = recordAndPaint(pattern, stroke.diffs, row, col, stroke.slotId);
    set({ pattern: nextPattern });
  },
  endStroke: () => {
    const { stroke, undoStack } = get();
    if (stroke && stroke.diffs.size > 0) {
      const command: Command = { kind: 'cells', diffs: [...stroke.diffs.values()] };
      set({ stroke: null, ...historyFlags(pushToUndoStack(undoStack, command), []) });
    } else {
      set({ stroke: null });
    }
  },
  addSlot: (hex, label) => {
    const pattern = get().pattern;
    if (!pattern) return;
    pushPaletteCommand(get, set, pattern, palette.addSlot(pattern, hex, label));
  },
  overrideSlotSymbol: (slotId, symbolIndex) => {
    const pattern = get().pattern;
    if (!pattern) return;
    pushPaletteCommand(get, set, pattern, palette.overrideSlotSymbol(pattern, slotId, symbolIndex));
  },
  renameSlot: (slotId, label) => {
    const pattern = get().pattern;
    if (!pattern) return;
    pushPaletteCommand(get, set, pattern, palette.renameSlot(pattern, slotId, label));
  },
  recolorSlot: (slotId, hex) => {
    const pattern = get().pattern;
    if (!pattern) return;
    pushPaletteCommand(get, set, pattern, palette.recolorSlot(pattern, slotId, hex));
  },
  reorderSlot: (fromIndex, toIndex) => {
    const pattern = get().pattern;
    if (!pattern) return;
    const next = palette.reorderSlot(pattern, fromIndex, toIndex);
    if (next === pattern) return; // out-of-range indices: no-op, nothing to record
    pushPaletteCommand(get, set, pattern, next);
  },
  deleteSlot: (slotId, options) => {
    const pattern = get().pattern;
    if (!pattern) return undefined;
    const result = palette.deleteSlot(pattern, slotId, options);
    if (result.ok) {
      pushPaletteCommand(get, set, pattern, result.pattern, diffGrids(pattern, result.pattern));
    }
    return result;
  },
  undo: () => {
    const { pattern, undoStack, redoStack } = get();
    if (!pattern || undoStack.length === 0) return;
    const command = undoStack[undoStack.length - 1];
    const restored = applyCommand(pattern, command, 'before');
    set({ pattern: restored, ...historyFlags(undoStack.slice(0, -1), [...redoStack, command]) });
  },
  redo: () => {
    const { pattern, undoStack, redoStack } = get();
    if (!pattern || redoStack.length === 0) return;
    const command = redoStack[redoStack.length - 1];
    const restored = applyCommand(pattern, command, 'after');
    set({ pattern: restored, ...historyFlags([...undoStack, command], redoStack.slice(0, -1)) });
  },
}));
