// Pattern/Slot/Cell domain model.
// Cells reference Slots by stable id, never by array position (ADR-0001).

export type SlotId = number;

export interface Slot {
  id: SlotId;
  hex: string;
  label: string;
  symbolId: number;
  yarnLink: null; // reserved for a future real-yarn-catalog link; always null in v1
}

export type Cell = SlotId | null; // null = Blank

export interface Pattern {
  schemaVersion: 1;
  id: string;
  name: string;
  rows: number;
  cols: number;
  grid: Cell[][]; // grid[row][col]
  palette: Slot[];
  nextSlotId: number;
}

export const MIN_DIMENSION = 1;
export const MAX_DIMENSION = 500;
export const DEFAULT_DIMENSION = 20;

export function isValidDimension(n: number): boolean {
  return Number.isInteger(n) && n >= MIN_DIMENSION && n <= MAX_DIMENSION;
}

export function createPattern(name: string, rows: number, cols: number): Pattern {
  if (!isValidDimension(rows) || !isValidDimension(cols)) {
    throw new RangeError(`rows and cols must be integers between ${MIN_DIMENSION} and ${MAX_DIMENSION}`);
  }
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name,
    rows,
    cols,
    grid: Array.from({ length: rows }, () => Array<Cell>(cols).fill(null)),
    palette: [],
    nextSlotId: 1,
  };
}

export function getSlot(pattern: Pattern, id: SlotId | null): Slot | undefined {
  if (id === null) return undefined;
  return pattern.palette.find((s) => s.id === id);
}
