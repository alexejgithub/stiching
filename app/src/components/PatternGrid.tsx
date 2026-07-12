import { useEffect, useRef } from 'react';
import type { Pattern } from '../model/pattern';
import { buildGridSVG } from '../render/gridRenderer';

export const DEFAULT_CELL_SIZE = 28;

interface PatternGridProps {
  pattern: Pattern;
  cellSize?: number;
}

// Mounts the shared SVG grid renderer imperatively, outside React's render
// cycle, per the tech-stack decision (spec.md) so this and the export/print
// pipeline (ticket 27) can never visually drift apart.
export function PatternGrid({ pattern, cellSize = DEFAULT_CELL_SIZE }: PatternGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const svg = buildGridSVG(pattern, { cellSize });
    container.replaceChildren(svg);
  }, [pattern, cellSize]);

  return <div className="pattern-grid" ref={containerRef} />;
}
