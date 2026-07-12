// PROTOTYPE — pure grid/selection logic, no React/DOM.
// Answers: does draw + rectangle marquee-select + rotate/move/mirror feel right
// as one coherent interaction loop? (wayfinder ticket 18-editor-prototype)

export type SlotId = number;

export interface PaletteSlot {
  id: SlotId;
  hex: string;
  label: string;
  symbol: string; // a single glyph, stand-in for the real symbol-assignment system (ticket 14)
}

export type Cell = SlotId | null;

export interface Pattern {
  rows: number;
  cols: number;
  grid: Cell[][]; // grid[row][col]
}

export function createPattern(rows: number, cols: number): Pattern {
  return {
    rows,
    cols,
    grid: Array.from({ length: rows }, () => Array<Cell>(cols).fill(null)),
  };
}

export function paintCell(pattern: Pattern, row: number, col: number, value: Cell): Pattern {
  if (row < 0 || row >= pattern.rows || col < 0 || col >= pattern.cols) return pattern;
  if (pattern.grid[row][col] === value) return pattern;
  const grid = pattern.grid.map((r) => r.slice());
  grid[row][col] = value;
  return { ...pattern, grid };
}

// Inclusive cell-index bounds.
export interface Rect {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

export function rectFromPoints(a: { row: number; col: number }, b: { row: number; col: number }): Rect {
  return {
    r0: Math.min(a.row, b.row),
    c0: Math.min(a.col, b.col),
    r1: Math.max(a.row, b.row),
    c1: Math.max(a.col, b.col),
  };
}

export function rectHeight(rect: Rect): number {
  return rect.r1 - rect.r0 + 1;
}

export function rectWidth(rect: Rect): number {
  return rect.c1 - rect.c0 + 1;
}

// Lift: copy the rect's cells out as a standalone block and blank them in the pattern.
export function liftRect(pattern: Pattern, rect: Rect): { pattern: Pattern; block: Cell[][] } {
  const block: Cell[][] = [];
  const grid = pattern.grid.map((r) => r.slice());
  for (let r = rect.r0; r <= rect.r1; r++) {
    const row: Cell[] = [];
    for (let c = rect.c0; c <= rect.c1; c++) {
      row.push(grid[r][c]);
      grid[r][c] = null;
    }
    block.push(row);
  }
  return { pattern: { ...pattern, grid }, block };
}

// Stamp a block at a top-left anchor. Caller must ensure it fits (use clampAnchor first).
export function stampBlock(pattern: Pattern, block: Cell[][], atRow: number, atCol: number): Pattern {
  const grid = pattern.grid.map((r) => r.slice());
  for (let r = 0; r < block.length; r++) {
    for (let c = 0; c < block[r].length; c++) {
      const cell = block[r][c];
      if (cell !== null) grid[atRow + r][atCol + c] = cell;
    }
  }
  return { ...pattern, grid };
}

export function rotateCW(block: Cell[][]): Cell[][] {
  const h = block.length;
  const w = block[0]?.length ?? 0;
  const out: Cell[][] = Array.from({ length: w }, () => Array<Cell>(h).fill(null));
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      out[c][h - 1 - r] = block[r][c];
    }
  }
  return out;
}

export function rotateCCW(block: Cell[][]): Cell[][] {
  const h = block.length;
  const w = block[0]?.length ?? 0;
  const out: Cell[][] = Array.from({ length: w }, () => Array<Cell>(h).fill(null));
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      out[w - 1 - c][r] = block[r][c];
    }
  }
  return out;
}

export function mirrorHorizontal(block: Cell[][]): Cell[][] {
  return block.map((row) => row.slice().reverse());
}

export function mirrorVertical(block: Cell[][]): Cell[][] {
  return block.slice().reverse();
}

// Clamp a proposed top-left anchor so the block of the given size stays fully
// in-bounds. Returns null if the block can't fit in the grid at all (never truncate).
export function clampAnchor(
  atRow: number,
  atCol: number,
  blockRows: number,
  blockCols: number,
  gridRows: number,
  gridCols: number
): { row: number; col: number } | null {
  if (blockRows > gridRows || blockCols > gridCols) return null;
  const row = Math.min(Math.max(atRow, 0), gridRows - blockRows);
  const col = Math.min(Math.max(atCol, 0), gridCols - blockCols);
  return { row, col };
}
