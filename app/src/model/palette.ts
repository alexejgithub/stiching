// Pure palette-editing transforms over a Pattern. No React/Zustand here —
// the store (src/store/editorStore.ts) is thin glue over these functions.

import { type Pattern, type Slot, type SlotId } from './pattern';
import { SYMBOLS } from './symbols';

export function addSlot(pattern: Pattern, hex: string, label: string): Pattern {
  const symbolId = (pattern.nextSlotId - 1) % SYMBOLS.length;
  const slot: Slot = { id: pattern.nextSlotId, hex, label, symbolId, yarnLink: null };
  return {
    ...pattern,
    palette: [...pattern.palette, slot],
    nextSlotId: pattern.nextSlotId + 1,
  };
}

export function overrideSlotSymbol(pattern: Pattern, slotId: SlotId, symbolIndex: number): Pattern {
  if (!Number.isInteger(symbolIndex) || symbolIndex < 0 || symbolIndex >= SYMBOLS.length) {
    throw new RangeError(`symbolIndex must be an integer between 0 and ${SYMBOLS.length - 1}`);
  }
  return updateSlot(pattern, slotId, (slot) => ({ ...slot, symbolId: symbolIndex }));
}

export function renameSlot(pattern: Pattern, slotId: SlotId, label: string): Pattern {
  return updateSlot(pattern, slotId, (slot) => ({ ...slot, label }));
}

export function recolorSlot(pattern: Pattern, slotId: SlotId, hex: string): Pattern {
  return updateSlot(pattern, slotId, (slot) => ({ ...slot, hex }));
}

function updateSlot(pattern: Pattern, slotId: SlotId, update: (slot: Slot) => Slot): Pattern {
  return {
    ...pattern,
    palette: pattern.palette.map((s) => (s.id === slotId ? update(s) : s)),
  };
}

export function reorderSlot(pattern: Pattern, fromIndex: number, toIndex: number): Pattern {
  if (
    fromIndex < 0 ||
    fromIndex >= pattern.palette.length ||
    toIndex < 0 ||
    toIndex >= pattern.palette.length
  ) {
    return pattern;
  }
  const palette = [...pattern.palette];
  const [moved] = palette.splice(fromIndex, 1);
  palette.splice(toIndex, 0, moved);
  return { ...pattern, palette };
}

export type DeleteSlotResult =
  | { ok: true; pattern: Pattern }
  | { ok: false; reason: 'in-use'; cellCount: number };

export function deleteSlot(
  pattern: Pattern,
  slotId: SlotId,
  options?: { clearCells?: boolean }
): DeleteSlotResult {
  const cellCount = countCellsUsing(pattern, slotId);
  if (cellCount > 0 && !options?.clearCells) {
    return { ok: false, reason: 'in-use', cellCount };
  }

  const grid =
    cellCount > 0 ? pattern.grid.map((row) => row.map((cell) => (cell === slotId ? null : cell))) : pattern.grid;

  return {
    ok: true,
    pattern: {
      ...pattern,
      grid,
      palette: pattern.palette.filter((s) => s.id !== slotId),
    },
  };
}

function countCellsUsing(pattern: Pattern, slotId: SlotId): number {
  let count = 0;
  for (const row of pattern.grid) {
    for (const cell of row) {
      if (cell === slotId) count++;
    }
  }
  return count;
}
