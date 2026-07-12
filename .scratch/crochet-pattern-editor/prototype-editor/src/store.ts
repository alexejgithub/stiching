import { create } from "zustand";
import {
  type Cell,
  type Pattern,
  type Rect,
  clampAnchor,
  createPattern,
  liftRect,
  mirrorHorizontal,
  mirrorVertical,
  paintCell,
  rectFromPoints,
  rectHeight,
  rectWidth,
  rotateCCW,
  rotateCW,
  stampBlock,
} from "./pattern";
import { PALETTE } from "./paletteData";

export type Tool = "draw" | "select";

// A selection is "floating": its cells have been lifted out of the pattern
// grid (blanked underneath) and live here until committed back down.
interface FloatingSelection {
  block: Cell[][];
  anchorRow: number;
  anchorCol: number;
}

interface DragState {
  kind: "marquee" | "move" | "paint";
  startRow: number;
  startCol: number;
  // for move: offset from the pointer to the selection's anchor, so the drag
  // doesn't jump the block to re-center under the cursor
  grabDr?: number;
  grabDc?: number;
}

interface EditorState {
  pattern: Pattern;
  tool: Tool;
  activeSlot: number | null; // null = eraser
  selection: FloatingSelection | null;
  marqueeRect: Rect | null; // preview rect while dragging a new marquee
  drag: DragState | null;

  setTool: (tool: Tool) => void;
  setActiveSlot: (slot: number | null) => void;

  pointerDown: (row: number, col: number) => void;
  pointerMove: (row: number, col: number) => void;
  pointerUp: () => void;

  nudgeSelection: (dr: number, dc: number) => void;
  rotateSelection: (dir: "cw" | "ccw") => void;
  mirrorSelection: (axis: "h" | "v") => void;
  commitSelection: () => void;

  reset: () => void;
}

const GRID_ROWS = 20;
const GRID_COLS = 20;

function isInsideSelection(sel: FloatingSelection, row: number, col: number): boolean {
  const h = sel.block.length;
  const w = sel.block[0]?.length ?? 0;
  return row >= sel.anchorRow && row < sel.anchorRow + h && col >= sel.anchorCol && col < sel.anchorCol + w;
}

// Stamp any active floating selection back down, if present.
function commitFloating(pattern: Pattern, selection: FloatingSelection | null): Pattern {
  if (!selection) return pattern;
  return stampBlock(pattern, selection.block, selection.anchorRow, selection.anchorCol);
}

export const useEditorStore = create<EditorState>((set, get) => ({
  pattern: createPattern(GRID_ROWS, GRID_COLS),
  tool: "draw",
  activeSlot: PALETTE[0].id,
  selection: null,
  marqueeRect: null,
  drag: null,

  setTool: (tool) => {
    // Switching tools commits whatever selection is currently floating.
    const { pattern, selection } = get();
    set({
      tool,
      pattern: commitFloating(pattern, selection),
      selection: null,
      marqueeRect: null,
    });
  },

  setActiveSlot: (slot) => set({ activeSlot: slot }),

  pointerDown: (row, col) => {
    const { tool, pattern, selection, activeSlot } = get();

    if (tool === "draw") {
      set({
        pattern: paintCell(pattern, row, col, activeSlot),
        drag: { kind: "paint", startRow: row, startCol: col },
      });
      return;
    }

    // tool === "select"
    if (selection && isInsideSelection(selection, row, col)) {
      // Grab the existing floating selection to drag it.
      set({
        drag: {
          kind: "move",
          startRow: row,
          startCol: col,
          grabDr: row - selection.anchorRow,
          grabDc: col - selection.anchorCol,
        },
      });
      return;
    }

    // Starting a new marquee commits any previous floating selection first
    // (replace-only selection, per ticket 12-tool-semantics).
    const committed = commitFloating(pattern, selection);
    set({
      pattern: committed,
      selection: null,
      marqueeRect: { r0: row, c0: col, r1: row, c1: col },
      drag: { kind: "marquee", startRow: row, startCol: col },
    });
  },

  pointerMove: (row, col) => {
    const { drag, pattern, tool, activeSlot, selection } = get();
    if (!drag) return;

    if (drag.kind === "paint" && tool === "draw") {
      set({ pattern: paintCell(pattern, row, col, activeSlot) });
      return;
    }

    if (drag.kind === "marquee") {
      set({ marqueeRect: rectFromPoints({ row: drag.startRow, col: drag.startCol }, { row, col }) });
      return;
    }

    if (drag.kind === "move" && selection) {
      const h = selection.block.length;
      const w = selection.block[0]?.length ?? 0;
      const desiredRow = row - (drag.grabDr ?? 0);
      const desiredCol = col - (drag.grabDc ?? 0);
      const clamped = clampAnchor(desiredRow, desiredCol, h, w, pattern.rows, pattern.cols);
      if (clamped) {
        set({ selection: { ...selection, anchorRow: clamped.row, anchorCol: clamped.col } });
      }
      return;
    }
  },

  pointerUp: () => {
    const { drag, marqueeRect, pattern } = get();
    if (drag?.kind === "marquee" && marqueeRect) {
      const { pattern: lifted, block } = liftRect(pattern, marqueeRect);
      set({
        pattern: lifted,
        selection: { block, anchorRow: marqueeRect.r0, anchorCol: marqueeRect.c0 },
        marqueeRect: null,
        drag: null,
      });
      return;
    }
    set({ drag: null });
  },

  nudgeSelection: (dr, dc) => {
    const { selection, pattern } = get();
    if (!selection) return;
    const h = selection.block.length;
    const w = selection.block[0]?.length ?? 0;
    const clamped = clampAnchor(
      selection.anchorRow + dr,
      selection.anchorCol + dc,
      h,
      w,
      pattern.rows,
      pattern.cols
    );
    if (clamped) set({ selection: { ...selection, anchorRow: clamped.row, anchorCol: clamped.col } });
  },

  rotateSelection: (dir) => {
    const { selection, pattern } = get();
    if (!selection) return;
    const rotated = dir === "cw" ? rotateCW(selection.block) : rotateCCW(selection.block);
    const h = rotated.length;
    const w = rotated[0]?.length ?? 0;
    // Anchor policy: keep the selection's top-left corner fixed, clamping into
    // bounds if the swapped dimensions would overhang. If it can't fit at all,
    // block the rotate entirely rather than truncate content.
    const clamped = clampAnchor(selection.anchorRow, selection.anchorCol, h, w, pattern.rows, pattern.cols);
    if (!clamped) return; // blocked: rotated block can't fit anywhere in-bounds
    set({ selection: { block: rotated, anchorRow: clamped.row, anchorCol: clamped.col } });
  },

  mirrorSelection: (axis) => {
    const { selection } = get();
    if (!selection) return;
    const mirrored = axis === "h" ? mirrorHorizontal(selection.block) : mirrorVertical(selection.block);
    // Mirroring never changes dimensions, so it can never go out of bounds.
    set({ selection: { ...selection, block: mirrored } });
  },

  commitSelection: () => {
    const { pattern, selection } = get();
    if (!selection) return;
    set({ pattern: commitFloating(pattern, selection), selection: null });
  },

  reset: () => set({ pattern: createPattern(GRID_ROWS, GRID_COLS), selection: null, marqueeRect: null }),
}));

// Prototype debug hook — lets manual/automated interaction testing inspect
// state from the browser console. Never ships past this throwaway prototype.
if (typeof window !== "undefined") {
  (window as unknown as { __editorStore: typeof useEditorStore }).__editorStore = useEditorStore;
}

export { PALETTE };
export const gridSize = { rows: GRID_ROWS, cols: GRID_COLS };
export function rectDims(rect: Rect) {
  return { h: rectHeight(rect), w: rectWidth(rect) };
}
