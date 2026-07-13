// Pure resize/crop-extend transform over a Pattern. No React/Zustand here —
// the store (src/store/editorStore.ts) is thin glue over these functions.
//
// Growing an edge (positive value) pads new Blank cells at that edge only;
// shrinking an edge (negative value) removes that many rows/cols from that
// edge. All four edges apply together: existing content keeps its absolute
// position relative to the top-left corner as it shifts (grown/shrunk edges
// just relocate the block, they never reflow it).

import { type Cell, type Pattern, isValidDimension } from './pattern';

export interface ResizeEdges {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

// Mirrors DeleteSlotResult's ok/reason shape (src/model/palette.ts) rather
// than a bare `{ rows, cols, lostStitchedCellCount } | { error }` union, for
// consistency with the rest of the pure model layer. `lostStitchedCellCount`
// is the number of non-Blank cells that would be discarded by shrinking; a
// caller can apply immediately when it's 0 and must confirm otherwise.
export type ResizePreview =
  | { ok: true; rows: number; cols: number; lostStitchedCellCount: number }
  | { ok: false; reason: 'out-of-bounds' };

function computeDimensions(pattern: Pattern, edges: ResizeEdges): { rows: number; cols: number } | null {
  const { top, bottom, left, right } = edges;
  if (![top, bottom, left, right].every(Number.isInteger)) return null;
  const rows = pattern.rows + top + bottom;
  const cols = pattern.cols + left + right;
  if (!isValidDimension(rows) || !isValidDimension(cols)) return null;
  return { rows, cols };
}

// Preview a resize without applying it: reports the resulting dimensions and
// how many stitched (non-Blank) cells would be lost, so a caller can decide
// whether to confirm before calling resizePattern. Never mutates the pattern.
export function previewResize(pattern: Pattern, edges: ResizeEdges): ResizePreview {
  const dims = computeDimensions(pattern, edges);
  if (!dims) return { ok: false, reason: 'out-of-bounds' };

  let lostStitchedCellCount = 0;
  for (let r = 0; r < pattern.rows; r++) {
    const nr = r + edges.top;
    const rowDropped = nr < 0 || nr >= dims.rows;
    for (let c = 0; c < pattern.cols; c++) {
      const nc = c + edges.left;
      const dropped = rowDropped || nc < 0 || nc >= dims.cols;
      if (dropped && pattern.grid[r][c] !== null) lostStitchedCellCount++;
    }
  }
  return { ok: true, rows: dims.rows, cols: dims.cols, lostStitchedCellCount };
}

// Applies a resize. Every old cell is relocated to (row + top, col + left) in
// the new grid; cells that land outside the new bounds (shrunk edges) are
// dropped, and everything else in the new grid starts Blank (grown edges).
// Throws if the result would be out of bounds — callers are expected to have
// already checked previewResize (the store action does), so this is a
// defensive backstop, not the primary validation path.
export function resizePattern(pattern: Pattern, edges: ResizeEdges): Pattern {
  const dims = computeDimensions(pattern, edges);
  if (!dims) {
    throw new RangeError('resize would produce non-integer edges or dimensions outside 1-500');
  }

  const grid: Cell[][] = Array.from({ length: dims.rows }, () => Array<Cell>(dims.cols).fill(null));
  for (let r = 0; r < pattern.rows; r++) {
    const nr = r + edges.top;
    if (nr < 0 || nr >= dims.rows) continue;
    for (let c = 0; c < pattern.cols; c++) {
      const nc = c + edges.left;
      if (nc < 0 || nc >= dims.cols) continue;
      grid[nr][nc] = pattern.grid[r][c];
    }
  }
  return { ...pattern, rows: dims.rows, cols: dims.cols, grid };
}
