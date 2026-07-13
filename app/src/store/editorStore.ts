import { create } from 'zustand';
import { type Cell, type Pattern, type Slot, type SlotId, createPattern } from '../model/pattern';
import * as palette from '../model/palette';
import { type DeleteSlotResult } from '../model/palette';
import { paintCell } from '../model/paint';
import * as resize from '../model/resize';
import { type ResizeEdges, type ResizePreview } from '../model/resize';
import {
  type Rect,
  clampAnchor,
  liftRect,
  mirrorHorizontal,
  mirrorVertical,
  rectFromPoints,
  rotateCCW,
  rotateCW,
  stampBlock,
} from '../model/selection';

export type Tool = 'draw' | 'select';

// A rectangular block of cells lifted out of the grid and held in-session
// (never persisted, never touched by undo/redo — see the `commitFloatingSelection`
// helper below and ticket 22's undo/redo contract). `anchorRow`/`anchorCol` is
// the block's current top-left position in the full grid.
export interface FloatingSelection {
  block: Cell[][];
  anchorRow: number;
  anchorCol: number;
}

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

interface GridSnapshot {
  rows: number;
  cols: number;
  grid: Cell[][];
}

// Invertible per-cell diffs (cost scales with edit size) or a whole-palette /
// whole-grid before/after snapshot (the palette array is always small,
// bounded by the user's color count, not grid size; a resize's grid snapshot
// is acceptable for the same reason paint strokes use diffs instead — resize
// is a rare, deliberate, whole-grid-shape-changing action, not a
// high-frequency edit where snapshot cost would add up) — see ticket 22.
// `cellDiffs` on a palette command covers deleteSlot's clearCells option, the
// one palette action that also touches the grid; it's empty for every other
// palette op.
export type Command =
  | { kind: 'cells'; diffs: CellDiff[] }
  | { kind: 'palette'; before: PaletteSnapshot; after: PaletteSnapshot; cellDiffs: CellDiff[] }
  | { kind: 'resize'; before: GridSnapshot; after: GridSnapshot };

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
  // Ephemeral session/UI state (never persisted, cleared on newPattern) for
  // ticket 23's marquee-select-transform-move interaction. Undo/redo never
  // reads or writes these — see the `undo`/`redo` actions below.
  selection: FloatingSelection | null;
  marqueeStart: { row: number; col: number } | null;
  marqueeRect: Rect | null;
  selectionOrigin: Pattern | null; // pattern snapshot from just before the active selection's lift, used to diff on commit
  selectionGrab: { dr: number; dc: number } | null; // pointer-to-anchor offset captured at the start of a move-drag
  newPattern: (name: string, rows: number, cols: number) => void;
  replacePattern: (pattern: Pattern) => void;
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
  previewResize: (edges: ResizeEdges) => ResizePreview | undefined;
  applyResize: (edges: ResizeEdges) => void;
  undo: () => void;
  redo: () => void;
  beginMarqueeDrag: (row: number, col: number) => void;
  continueMarqueeDrag: (row: number, col: number) => void;
  endMarqueeDrag: () => void;
  selectAll: () => void;
  beginSelectionMove: (row: number, col: number) => void;
  continueSelectionMove: (row: number, col: number) => void;
  endSelectionMove: () => void;
  rotateSelection: (dir: 'cw' | 'ccw') => void;
  mirrorSelection: (axis: 'h' | 'v') => void;
  nudgeSelection: (dr: number, dc: number) => void;
  commitSelection: () => void;
}

function historyFlags(undoStack: Command[], redoStack: Command[]) {
  return { undoStack, redoStack, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 };
}

// The session state every "swap in a whole new pattern" entry point
// (newPattern, replacePattern) must reset: undo/redo history, tool, active
// slot, and any in-progress stroke or floating selection all belong to
// whatever pattern was open before and must never carry over.
function freshPatternState() {
  return {
    tool: 'draw' as const,
    activeSlotId: null,
    stroke: null,
    selection: null,
    marqueeStart: null,
    marqueeRect: null,
    selectionOrigin: null,
    selectionGrab: null,
    ...historyFlags([], []),
  };
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
  if (command.kind === 'resize') {
    const snapshot = command[direction];
    return { ...pattern, rows: snapshot.rows, cols: snapshot.cols, grid: snapshot.grid };
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

// Cells that changed between two grids. `before`/`after` are normally the
// same dimensions (deleteSlot's clearCells option; a selection commit with no
// intervening resize) — bounding the scan to the overlap is a no-op then. It
// also means a resize applied while a selection was floating (ticket 24)
// can't make this index outside either grid's actual bounds when the
// selection is later committed against a since-resized pattern.
function diffGrids(before: Pattern, after: Pattern): CellDiff[] {
  const diffs: CellDiff[] = [];
  const rows = Math.min(before.rows, after.rows);
  const cols = Math.min(before.cols, after.cols);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (before.grid[row][col] !== after.grid[row][col]) {
        diffs.push({ row, col, before: before.grid[row][col], after: after.grid[row][col] });
      }
    }
  }
  return diffs;
}

// Stamps the current floating selection (if any) back into the grid and
// records the whole lift-transform-stamp sequence as a single 'cells' Command
// — the same undo log paint strokes use, diffed against the pattern as it
// stood right before the selection was lifted. A no-op transform-then-stamp
// (e.g. select then immediately commit with no move/rotate/mirror) yields no
// diffs and pushes nothing, same as a no-op paint stroke. Always clears the
// floating-selection fields, whether or not anything was pushed. Reusing the
// existing 'cells' kind (rather than adding a new Command kind) is what keeps
// undo/redo entirely unaware of selection state: they only ever apply
// before/after cell values.
function commitFloatingSelection(get: () => EditorState, set: (partial: Partial<EditorState>) => void) {
  const { pattern, selection, selectionOrigin, undoStack } = get();
  const clearFields = { selection: null, marqueeRect: null, marqueeStart: null, selectionOrigin: null, selectionGrab: null };
  if (!pattern || !selection || !selectionOrigin) {
    set(clearFields);
    return;
  }
  // A resize applied while this selection was floating (ticket 24) can leave
  // anchorRow/anchorCol pointing outside the current pattern — resize
  // deliberately doesn't touch selection state. Re-clamp here with the same
  // policy rotate/nudge already use, rather than stamping at a stale anchor
  // that could index outside the grid. If the block no longer fits anywhere
  // (grid shrunk smaller than it), drop the stamp instead of crashing.
  const h = selection.block.length;
  const w = selection.block[0]?.length ?? 0;
  const clamped = clampAnchor(selection.anchorRow, selection.anchorCol, h, w, pattern.rows, pattern.cols);
  if (!clamped) {
    set({ pattern, ...clearFields });
    return;
  }
  const stamped = stampBlock(pattern, selection.block, clamped.row, clamped.col);
  const diffs = diffGrids(selectionOrigin, stamped);
  if (diffs.length === 0) {
    set({ pattern: stamped, ...clearFields });
    return;
  }
  const command: Command = { kind: 'cells', diffs };
  set({ pattern: stamped, ...clearFields, ...historyFlags(pushToUndoStack(undoStack, command), []) });
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
  selection: null,
  marqueeStart: null,
  marqueeRect: null,
  selectionOrigin: null,
  selectionGrab: null,
  newPattern: (name, rows, cols) =>
    set({ pattern: createPattern(name, rows, cols), ...freshPatternState() }),
  // Swaps in an already-built Pattern (import, ticket 26; boot-load from
  // autosave, ticket 25) with the exact same session-state reset newPattern
  // does — undo/redo history, selection, tool, and active slot all belong to
  // whatever pattern was open before, and stale undo diffs replayed against a
  // differently-shaped incoming grid can index out of bounds.
  replacePattern: (pattern) => set({ pattern, ...freshPatternState() }),
  // Switching tools commits whatever selection is currently floating (a
  // no-op when nothing is floating) before changing `tool`.
  setTool: (tool) => {
    commitFloatingSelection(get, set);
    set({ tool });
  },
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
  // Starting a new marquee always replaces the current selection (no
  // add/subtract modifiers): commit whatever was floating first.
  beginMarqueeDrag: (row, col) => {
    const { pattern } = get();
    if (!pattern) return;
    commitFloatingSelection(get, set);
    set({ marqueeStart: { row, col }, marqueeRect: { r0: row, c0: col, r1: row, c1: col } });
  },
  continueMarqueeDrag: (row, col) => {
    const { marqueeStart } = get();
    if (!marqueeStart) return;
    set({ marqueeRect: rectFromPoints(marqueeStart, { row, col }) });
  },
  endMarqueeDrag: () => {
    const { pattern, marqueeRect } = get();
    if (!pattern || !marqueeRect) return;
    const { pattern: lifted, block } = liftRect(pattern, marqueeRect);
    set({
      pattern: lifted,
      selection: { block, anchorRow: marqueeRect.r0, anchorCol: marqueeRect.c0 },
      selectionOrigin: pattern,
      marqueeRect: null,
      marqueeStart: null,
    });
  },
  // Select-all is the trivial whole-grid-rect case of the same marquee tool.
  selectAll: () => {
    const { pattern } = get();
    if (!pattern) return;
    commitFloatingSelection(get, set);
    const base = get().pattern;
    if (!base) return;
    const rect: Rect = { r0: 0, c0: 0, r1: base.rows - 1, c1: base.cols - 1 };
    const { pattern: lifted, block } = liftRect(base, rect);
    set({
      pattern: lifted,
      selection: { block, anchorRow: rect.r0, anchorCol: rect.c0 },
      selectionOrigin: base,
      marqueeRect: null,
      marqueeStart: null,
    });
  },
  beginSelectionMove: (row, col) => {
    const { selection } = get();
    if (!selection) return;
    set({ selectionGrab: { dr: row - selection.anchorRow, dc: col - selection.anchorCol } });
  },
  continueSelectionMove: (row, col) => {
    const { selection, selectionGrab, pattern } = get();
    if (!selection || !selectionGrab || !pattern) return;
    const h = selection.block.length;
    const w = selection.block[0]?.length ?? 0;
    const clamped = clampAnchor(row - selectionGrab.dr, col - selectionGrab.dc, h, w, pattern.rows, pattern.cols);
    if (!clamped) return;
    set({ selection: { ...selection, anchorRow: clamped.row, anchorCol: clamped.col } });
  },
  endSelectionMove: () => set({ selectionGrab: null }),
  rotateSelection: (dir) => {
    const { selection, pattern } = get();
    if (!selection || !pattern) return;
    const rotated = dir === 'cw' ? rotateCW(selection.block) : rotateCCW(selection.block);
    const h = rotated.length;
    const w = rotated[0]?.length ?? 0;
    // Anchor policy: keep the top-left corner fixed, clamping into bounds if
    // the swapped dimensions would overhang. Block the rotate entirely
    // (leave the selection untouched) if it can't fit anywhere in-bounds —
    // content is never truncated.
    const clamped = clampAnchor(selection.anchorRow, selection.anchorCol, h, w, pattern.rows, pattern.cols);
    if (!clamped) return;
    set({ selection: { block: rotated, anchorRow: clamped.row, anchorCol: clamped.col } });
  },
  mirrorSelection: (axis) => {
    const { selection } = get();
    if (!selection) return;
    // Mirroring never changes dimensions, so it can never go out of bounds.
    const mirrored = axis === 'h' ? mirrorHorizontal(selection.block) : mirrorVertical(selection.block);
    set({ selection: { ...selection, block: mirrored } });
  },
  nudgeSelection: (dr, dc) => {
    const { selection, pattern } = get();
    if (!selection || !pattern) return;
    const h = selection.block.length;
    const w = selection.block[0]?.length ?? 0;
    const clamped = clampAnchor(selection.anchorRow + dr, selection.anchorCol + dc, h, w, pattern.rows, pattern.cols);
    if (!clamped) return;
    set({ selection: { ...selection, anchorRow: clamped.row, anchorCol: clamped.col } });
  },
  commitSelection: () => commitFloatingSelection(get, set),
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
  // Read-only: reports the resulting dimensions and how many stitched cells
  // a shrink would discard, without applying anything, so the ResizeDialog
  // can decide whether to show a confirmation before calling applyResize.
  previewResize: (edges) => {
    const pattern = get().pattern;
    if (!pattern) return undefined;
    return resize.previewResize(pattern, edges);
  },
  // Applies a resize as a single 'resize' Command (whole before/after grid
  // snapshot, not per-cell diffs — see the Command union comment). A no-op if
  // the pattern is missing or the edges would land out of bounds; callers
  // that already ran previewResize get the same answer here for free.
  // Deliberately does not touch a floating selection (selection/marqueeRect/
  // etc.) even if its anchor now points outside the resized grid —
  // commitFloatingSelection re-clamps defensively when it's next committed.
  applyResize: (edges) => {
    const { pattern, undoStack } = get();
    if (!pattern) return;
    const preview = resize.previewResize(pattern, edges);
    if (!preview.ok) return;
    const after = resize.resizePattern(pattern, edges);
    const command: Command = {
      kind: 'resize',
      before: { rows: pattern.rows, cols: pattern.cols, grid: pattern.grid },
      after: { rows: after.rows, cols: after.cols, grid: after.grid },
    };
    set({ pattern: after, ...historyFlags(pushToUndoStack(undoStack, command), []) });
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
