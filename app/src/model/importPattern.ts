// Pure Pattern construction for Import Image, mirroring createPattern in
// pattern.ts. Unlike createPattern, this does NOT seed the starter palette -
// the palette here is the photo's own extracted colors, minted through the
// same addSlot used everywhere else so id/symbol assignment is identical to
// a hand-added slot.

import { addSlot } from './palette';
import { blankPattern, type Cell, type Pattern } from './pattern';

export function createPatternFromImport(name: string, cells: Array<Array<number | null>>, palette: string[]): Pattern {
  const rows = cells.length;
  const cols = rows > 0 ? cells[0].length : 0;

  let pattern = blankPattern(name, rows, cols);
  const slotIds: number[] = palette.map((hex, i) => {
    pattern = addSlot(pattern, hex, `Color ${i + 1}`);
    // addSlot always assigns the newly minted slot id as the pre-call nextSlotId.
    return pattern.nextSlotId - 1;
  });

  const grid: Cell[][] = cells.map((row) => row.map((index) => (index === null ? null : slotIds[index])));

  return { ...pattern, grid };
}
