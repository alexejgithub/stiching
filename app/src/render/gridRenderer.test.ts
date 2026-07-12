import { describe, expect, it } from 'vitest';
import { createPattern } from '../model/pattern';
import { buildGridSVG } from './gridRenderer';

describe('buildGridSVG', () => {
  it('renders one cell rect per grid cell', () => {
    const pattern = createPattern('T', 3, 4);
    const svg = buildGridSVG(pattern, { cellSize: 20 });
    expect(svg.querySelectorAll('[data-role="cell"]')).toHaveLength(12);
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
});
