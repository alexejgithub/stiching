// Pattern/Slot/Cell domain model.
// Cells reference Slots by stable id, never by array position (ADR-0001).

import { addSlot } from './palette';

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

// Starter palette seeded into every brand-new pattern (ticket 33) so a user
// can paint immediately instead of visiting the palette editor first. Evenly
// spaced, mutually distinguishable hues drawn from the Trubetskoy "24 distinct
// colors" set. Only createPattern uses this — replacePattern (import/autosave
// boot-load) restores an already-authored palette and must not seed on top.
const STARTER_PALETTE_SEED: ReadonlyArray<{ hex: string; label: string }> = [
  { hex: '#e6194B', label: 'Red' },
  { hex: '#f58231', label: 'Orange' },
  { hex: '#ffe119', label: 'Yellow' },
  { hex: '#3cb44b', label: 'Green' },
  { hex: '#42d4f4', label: 'Cyan' },
  { hex: '#4363d8', label: 'Blue' },
  { hex: '#911eb4', label: 'Purple' },
  { hex: '#f032e6', label: 'Magenta' },
];

export function isValidDimension(n: number): boolean {
  return Number.isInteger(n) && n >= MIN_DIMENSION && n <= MAX_DIMENSION;
}

// A blank, palette-less Pattern at the given size. Shared by createPattern
// (which seeds the starter palette on top) and createPatternFromImport in
// importPattern.ts (which seeds the photo's extracted colors instead).
export function blankPattern(name: string, rows: number, cols: number): Pattern {
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

export function createPattern(name: string, rows: number, cols: number): Pattern {
  if (!isValidDimension(rows) || !isValidDimension(cols)) {
    throw new RangeError(`rows and cols must be integers between ${MIN_DIMENSION} and ${MAX_DIMENSION}`);
  }
  // Minted through the same addSlot used by the manual "add color" flow, so
  // seeded slots get identical id/symbol assignment and are indistinguishable
  // from a hand-added slot (per ticket 33's scope).
  return STARTER_PALETTE_SEED.reduce((pattern, seed) => addSlot(pattern, seed.hex, seed.label), blankPattern(name, rows, cols));
}

export function getSlot(pattern: Pattern, id: SlotId | null): Slot | undefined {
  if (id === null) return undefined;
  return pattern.palette.find((s) => s.id === id);
}
