import { describe, expect, it } from 'vitest';
import { createPattern } from '../model/pattern';
import { SYMBOLS } from '../model/symbols';
import { buildGridSVG, contrastGlyphColor } from './gridRenderer';

describe('buildGridSVG', () => {
  it('renders one cell rect per grid cell', () => {
    const pattern = createPattern('T', 3, 4);
    const svg = buildGridSVG(pattern, { cellSize: 20 });
    expect(svg.querySelectorAll('[data-role="cell"]')).toHaveLength(12);
  });

  it('renders a cell-symbol glyph for every stitched cell, matching the slot symbol', () => {
    const pattern = createPattern('T', 2, 2);
    pattern.palette.push({ id: 1, hex: '#ff0000', label: 'Red', symbolId: 2, yarnLink: null });
    pattern.grid[0][0] = 1;
    pattern.grid[1][1] = 1;

    const svg = buildGridSVG(pattern, { cellSize: 20 });
    const glyphs = svg.querySelectorAll('[data-role="cell-symbol"]');
    expect(glyphs).toHaveLength(2);
    glyphs.forEach((g) => expect(g.textContent).toBe(SYMBOLS[2]));
  });

  it('leaves blank cells glyph-free', () => {
    const pattern = createPattern('T', 2, 2);
    pattern.palette.push({ id: 1, hex: '#ff0000', label: 'Red', symbolId: 0, yarnLink: null });
    pattern.grid[0][0] = 1;
    // grid[0][1], grid[1][0], grid[1][1] stay null (blank).

    const svg = buildGridSVG(pattern, { cellSize: 20 });
    expect(svg.querySelectorAll('[data-role="cell-symbol"]')).toHaveLength(1);
  });

  it('picks a light glyph color for dark fills and a dark glyph color for light fills', () => {
    const pattern = createPattern('T', 1, 2);
    pattern.palette.push(
      { id: 1, hex: '#000000', label: 'Black', symbolId: 0, yarnLink: null },
      { id: 2, hex: '#ffff00', label: 'Yellow', symbolId: 1, yarnLink: null }
    );
    pattern.grid[0][0] = 1;
    pattern.grid[0][1] = 2;

    const svg = buildGridSVG(pattern, { cellSize: 20 });
    const glyphs = Array.from(svg.querySelectorAll('[data-role="cell-symbol"]'));
    const onBlack = glyphs.find((g) => g.getAttribute('data-col') === '0')!;
    const onYellow = glyphs.find((g) => g.getAttribute('data-col') === '1')!;

    expect(onBlack.getAttribute('fill')).toBe(contrastGlyphColor('#000000'));
    expect(onYellow.getAttribute('fill')).toBe(contrastGlyphColor('#ffff00'));
    expect(onBlack.getAttribute('fill')).not.toBe(onYellow.getAttribute('fill'));
  });

  it('renders static column numbers 1..cols along the top', () => {
    const pattern = createPattern('T', 3, 4);
    const svg = buildGridSVG(pattern, { cellSize: 20 });
    const labels = Array.from(svg.querySelectorAll('[data-role="column-number"]')).map((n) => n.textContent);
    expect(labels).toEqual(['1', '2', '3', '4']);
  });

  it('alternates row number side by parity: odd right, even left', () => {
    const pattern = createPattern('T', 4, 4);
    const svg = buildGridSVG(pattern, { cellSize: 20 });
    const sides = Array.from(svg.querySelectorAll('[data-role="row-number"]')).map((n) =>
      n.getAttribute('data-side')
    );
    expect(sides).toEqual(['right', 'left', 'right', 'left']);
  });

  // ticket 27: rowOffset/colOffset let a windowed sub-pattern (one export
  // page's slice) draw numbering that reflects its true absolute position in
  // the full Pattern, rather than restarting from 1.
  it('offsets column and row numbers by colOffset/rowOffset when given', () => {
    const pattern = createPattern('T', 3, 3);
    const svg = buildGridSVG(pattern, { cellSize: 20, rowOffset: 10, colOffset: 5 });

    const colLabels = Array.from(svg.querySelectorAll('[data-role="column-number"]')).map((n) => n.textContent);
    expect(colLabels).toEqual(['6', '7', '8']);

    const rowLabels = Array.from(svg.querySelectorAll('[data-role="row-number"]')).map((n) => n.textContent);
    expect(rowLabels).toEqual(['11', '12', '13']);
  });

  it('computes row-number parity from the absolute (offset) row, not the local index', () => {
    const pattern = createPattern('T', 2, 1);
    // rowOffset 1: local row 0 -> absolute row 1 -> display 2 (even) -> left.
    // local row 1 -> absolute row 2 -> display 3 (odd) -> right.
    const svg = buildGridSVG(pattern, { cellSize: 20, rowOffset: 1 });

    const sides = Array.from(svg.querySelectorAll('[data-role="row-number"]')).map((n) => n.getAttribute('data-side'));
    expect(sides).toEqual(['left', 'right']);
  });

  it('defaults rowOffset/colOffset to 0, matching prior unoffset behavior', () => {
    const pattern = createPattern('T', 2, 2);
    const withoutOffset = buildGridSVG(pattern, { cellSize: 20 });
    const withZeroOffset = buildGridSVG(pattern, { cellSize: 20, rowOffset: 0, colOffset: 0 });

    const labelsOf = (svg: SVGSVGElement, role: string) =>
      Array.from(svg.querySelectorAll(`[data-role="${role}"]`)).map((n) => n.textContent);

    expect(labelsOf(withoutOffset, 'column-number')).toEqual(labelsOf(withZeroOffset, 'column-number'));
    expect(labelsOf(withoutOffset, 'row-number')).toEqual(labelsOf(withZeroOffset, 'row-number'));
  });

  // ticket 31: liftRect blanks the lifted cells out of pattern.grid into
  // selection.block by design, so the floating block must render its own
  // content inside the overlay rather than reading as "the colors vanished".
  describe('selection overlay (ticket 31)', () => {
    function patternWithLiftedSelection() {
      const pattern = createPattern('T', 3, 3);
      pattern.palette.push(
        { id: 1, hex: '#ff0000', label: 'Red', symbolId: 0, yarnLink: null },
        { id: 2, hex: '#00ff00', label: 'Green', symbolId: 1, yarnLink: null }
      );
      // Grid itself has nothing at the selection's original site — mirrors
      // liftRect having already blanked it out.
      return pattern;
    }

    it('renders the floating block\'s actual cell colors at its anchored position, not the blanked grid', () => {
      const pattern = patternWithLiftedSelection();
      const svg = buildGridSVG(pattern, {
        cellSize: 20,
        selection: {
          anchorRow: 1,
          anchorCol: 1,
          block: [
            [1, 2],
            [null, 1],
          ],
        },
      });

      const cells = Array.from(svg.querySelectorAll('[data-role="selection-cell"]'));
      expect(cells).toHaveLength(3); // the one null entry stays cell-free

      const at = (row: number, col: number) =>
        cells.find((c) => c.getAttribute('data-row') === String(row) && c.getAttribute('data-col') === String(col));

      expect(at(1, 1)?.getAttribute('fill')).toBe('#ff0000');
      expect(at(1, 2)?.getAttribute('fill')).toBe('#00ff00');
      expect(at(2, 2)?.getAttribute('fill')).toBe('#ff0000');
      expect(at(2, 1)).toBeUndefined(); // the null cell in the block
    });

    it('renders the floating block\'s symbol glyphs alongside its colors', () => {
      const pattern = patternWithLiftedSelection();
      const svg = buildGridSVG(pattern, {
        cellSize: 20,
        selection: { anchorRow: 0, anchorCol: 0, block: [[1, 2]] },
      });

      const glyphs = Array.from(svg.querySelectorAll('[data-role="cell-symbol"]'));
      expect(glyphs).toHaveLength(2);
      const at = (col: number) => glyphs.find((g) => g.getAttribute('data-col') === String(col));
      expect(at(0)?.textContent).toBe(SYMBOLS[0]);
      expect(at(1)?.textContent).toBe(SYMBOLS[1]);
    });

    it('omits the selection overlay entirely when there is no floating selection', () => {
      const pattern = patternWithLiftedSelection();
      const svg = buildGridSVG(pattern, { cellSize: 20 });
      expect(svg.querySelectorAll('[data-role="selection-overlay"]')).toHaveLength(0);
      expect(svg.querySelectorAll('[data-role="selection-cell"]')).toHaveLength(0);
    });

    it('still draws a selection tint/border over the block\'s full bounds, including blank cells within it', () => {
      const pattern = patternWithLiftedSelection();
      const svg = buildGridSVG(pattern, {
        cellSize: 20,
        selection: {
          anchorRow: 0,
          anchorCol: 0,
          block: [
            [1, null],
            [null, null],
          ],
        },
      });

      expect(svg.querySelectorAll('[data-role="selection-overlay"]')).toHaveLength(1);
      const tint = svg.querySelector('[data-role="selection-tint"]');
      expect(tint).not.toBeNull();
      expect(tint?.getAttribute('width')).toBe('40'); // 2 cols * cellSize 20
      expect(tint?.getAttribute('height')).toBe('40'); // 2 rows * cellSize 20
      expect(svg.querySelectorAll('[data-role="selection-border"]')).toHaveLength(1);
    });

    it('follows the block to its current anchored position after a move (not the original lift site)', () => {
      const pattern = patternWithLiftedSelection();
      const svg = buildGridSVG(pattern, {
        cellSize: 20,
        selection: { anchorRow: 2, anchorCol: 2, block: [[1]] },
      });

      const cells = svg.querySelectorAll('[data-role="selection-cell"]');
      expect(cells).toHaveLength(1);
      expect(cells[0].getAttribute('data-row')).toBe('2');
      expect(cells[0].getAttribute('data-col')).toBe('2');
      expect(cells[0].getAttribute('x')).toBe(String(2 * 20 + 20)); // + leftGutter
      expect(cells[0].getAttribute('y')).toBe(String(2 * 20 + 20)); // + topGutter
    });
  });
});
