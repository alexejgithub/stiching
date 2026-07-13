import { describe, expect, it } from 'vitest';
import { createPattern } from '../model/pattern';
import { A4_PORTRAIT_MM, HEADER_BLOCK_MM, PAGE_MARGIN_MM, computeExportLayout } from './exportLayout';

// At cellSize 10mm on A4 portrait (210 x 297mm), the usable column capacity
// works out to: (210 - 2*10 - 2*10) / 10 = 17 columns, and the usable row
// capacity to: (297 - 2*10 - 10 - 22) / 10 = 24 rows (see exportLayout.ts's
// axisCapacity for the exact reservation math). Tests below pick pattern
// sizes relative to these capacities rather than hardcoding them, so they
// stay correct if the constants change.
const CELL_SIZE_MM = 10;

function colCapacityFor(cellSizeMm: number, pageSizeMm = A4_PORTRAIT_MM) {
  return Math.max(1, Math.floor((pageSizeMm.width - 2 * PAGE_MARGIN_MM - 2 * cellSizeMm) / cellSizeMm));
}

function rowCapacityFor(cellSizeMm: number, pageSizeMm = A4_PORTRAIT_MM) {
  return Math.max(1, Math.floor((pageSizeMm.height - 2 * PAGE_MARGIN_MM - cellSizeMm - HEADER_BLOCK_MM) / cellSizeMm));
}

describe('computeExportLayout', () => {
  it('produces exactly one page covering the whole grid when the pattern fits within capacity', () => {
    const colCap = colCapacityFor(CELL_SIZE_MM);
    const rowCap = rowCapacityFor(CELL_SIZE_MM);
    const pattern = createPattern('Fits', rowCap, colCap);

    const layout = computeExportLayout(pattern, CELL_SIZE_MM);

    expect(layout.pages).toHaveLength(1);
    expect(layout.pageRows).toBe(1);
    expect(layout.pageCols).toBe(1);
    expect(layout.pages[0]).toEqual({ rowStart: 0, rowEnd: rowCap - 1, colStart: 0, colEnd: colCap - 1 });
  });

  it('splits into two column-pages, overlapping by exactly one shared column, one cell over capacity', () => {
    const colCap = colCapacityFor(CELL_SIZE_MM);
    const rowCap = rowCapacityFor(CELL_SIZE_MM);
    const pattern = createPattern('One Over', rowCap, colCap + 1);

    const layout = computeExportLayout(pattern, CELL_SIZE_MM);

    expect(layout.pageCols).toBe(2);
    expect(layout.pageRows).toBe(1);
    expect(layout.pages).toHaveLength(2);
    const [first, second] = layout.pages;
    expect(first.colStart).toBe(0);
    expect(second.colEnd).toBe(colCap); // 0-indexed last column
    // Exactly one shared column of physical overlap between adjacent pages.
    expect(first.colEnd).toBe(second.colStart);
  });

  it('splits into multiple row-pages, overlapping by exactly one shared row, for a tall pattern', () => {
    const colCap = colCapacityFor(CELL_SIZE_MM);
    const rowCap = rowCapacityFor(CELL_SIZE_MM);
    const pattern = createPattern('Tall', rowCap * 2, colCap);

    const layout = computeExportLayout(pattern, CELL_SIZE_MM);

    expect(layout.pageRows).toBeGreaterThan(1);
    expect(layout.pageCols).toBe(1);
    for (let i = 0; i < layout.pageRows - 1; i++) {
      const a = layout.pages[i];
      const b = layout.pages[i + 1];
      expect(a.rowEnd).toBe(b.rowStart);
    }
    // Full coverage: first page starts at row 0, last page ends at the last row.
    expect(layout.pages[0].rowStart).toBe(0);
    expect(layout.pages[layout.pages.length - 1].rowEnd).toBe(pattern.rows - 1);
  });

  it('splits into a full grid of pages, row-major, when both axes exceed capacity', () => {
    const colCap = colCapacityFor(CELL_SIZE_MM);
    const rowCap = rowCapacityFor(CELL_SIZE_MM);
    const pattern = createPattern('Big', rowCap + 5, colCap + 5);

    const layout = computeExportLayout(pattern, CELL_SIZE_MM);

    expect(layout.pages).toHaveLength(layout.pageRows * layout.pageCols);
    expect(layout.pageRows).toBeGreaterThan(1);
    expect(layout.pageCols).toBeGreaterThan(1);

    // Row-major order: the first pageCols entries all share the same rowStart.
    for (let i = 0; i < layout.pageCols; i++) {
      expect(layout.pages[i].rowStart).toBe(layout.pages[0].rowStart);
    }

    // Every column-adjacent pair of pages within a page-row overlaps by
    // exactly one column, and every row-adjacent pair of page-rows overlaps
    // by exactly one row.
    for (let pr = 0; pr < layout.pageRows; pr++) {
      for (let pc = 0; pc < layout.pageCols - 1; pc++) {
        const a = layout.pages[pr * layout.pageCols + pc];
        const b = layout.pages[pr * layout.pageCols + pc + 1];
        expect(a.colEnd).toBe(b.colStart);
      }
    }
    for (let pr = 0; pr < layout.pageRows - 1; pr++) {
      const a = layout.pages[pr * layout.pageCols];
      const b = layout.pages[(pr + 1) * layout.pageCols];
      expect(a.rowEnd).toBe(b.rowStart);
    }
  });

  it('covers a tiny 1x1 pattern with a single page with no splitting', () => {
    const pattern = createPattern('Tiny', 1, 1);
    const layout = computeExportLayout(pattern, CELL_SIZE_MM);
    expect(layout.pages).toEqual([{ rowStart: 0, rowEnd: 0, colStart: 0, colEnd: 0 }]);
  });
});
