// Pure cell-painting transform over a Pattern. No React/Zustand here —
// the store (src/store/editorStore.ts) is thin glue over this function.

import { type Pattern, type SlotId } from './pattern';

/**
 * Sets a single cell to a Slot id (paint) or null (erase, back to Blank).
 * Out-of-range row/col is a no-op, not a throw — grid edges and corners are
 * always safe to target.
 */
export function paintCell(pattern: Pattern, row: number, col: number, slotId: SlotId | null): Pattern {
  if (row < 0 || row >= pattern.rows || col < 0 || col >= pattern.cols) return pattern;
  if (pattern.grid[row][col] === slotId) return pattern;
  const grid = pattern.grid.map((r, ri) => (ri === row ? r.map((c, ci) => (ci === col ? slotId : c)) : r));
  return { ...pattern, grid };
}
