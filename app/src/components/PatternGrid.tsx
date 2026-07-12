import { type PointerEvent, useEffect, useRef } from 'react';
import type { Pattern } from '../model/pattern';
import { buildGridSVG } from '../render/gridRenderer';
import { useEditorStore } from '../store/editorStore';

export const DEFAULT_CELL_SIZE = 28;

interface PatternGridProps {
  pattern: Pattern;
  cellSize?: number;
}

// Hit-tests the cell under a client point via elementFromPoint rather than
// event.target: once pointer capture is set (see handlePointerDown), target
// stays pinned to the capturing element for the rest of the drag.
function cellAtPoint(clientX: number, clientY: number): { row: number; col: number } | null {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el || el.getAttribute('data-role') !== 'cell') return null;
  const row = Number(el.getAttribute('data-row'));
  const col = Number(el.getAttribute('data-col'));
  if (Number.isNaN(row) || Number.isNaN(col)) return null;
  return { row, col };
}

// Mounts the shared SVG grid renderer imperatively, outside React's render
// cycle, per the tech-stack decision (spec.md) so this and the export/print
// pipeline (ticket 27) can never visually drift apart.
export function PatternGrid({ pattern, cellSize = DEFAULT_CELL_SIZE }: PatternGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const strokingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const svg = buildGridSVG(pattern, { cellSize });
    container.replaceChildren(svg);
  }, [pattern, cellSize]);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (useEditorStore.getState().tool !== 'draw') return;
    const cell = cellAtPoint(e.clientX, e.clientY);
    if (!cell) return;
    // Capture on the (stable) container, not the SVG rect: the rect itself
    // gets torn down and rebuilt by the effect above on every painted cell,
    // which would silently drop capture set on it. Capturing here also means
    // pointerup/pointermove keep firing on this element even if the drag
    // continues or ends outside the grid, so no separate window listener for
    // "drag ended off-grid" is needed.
    containerRef.current?.setPointerCapture(e.pointerId);
    strokingRef.current = true;
    useEditorStore.getState().beginStroke(cell.row, cell.col);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!strokingRef.current) return;
    const cell = cellAtPoint(e.clientX, e.clientY);
    if (!cell) return;
    useEditorStore.getState().continueStroke(cell.row, cell.col);
  }

  function endStroke(e: PointerEvent<HTMLDivElement>) {
    if (!strokingRef.current) return;
    strokingRef.current = false;
    useEditorStore.getState().endStroke();
    if (containerRef.current?.hasPointerCapture(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  }

  return (
    <div
      className="pattern-grid"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
    />
  );
}
