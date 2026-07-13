import { type PointerEvent, useEffect, useRef } from 'react';
import type { Pattern } from '../model/pattern';
import { isInsideBlock } from '../model/selection';
import { buildGridSVG } from '../render/gridRenderer';
import { useEditorStore } from '../store/editorStore';

export const DEFAULT_CELL_SIZE = 28;

interface PatternGridProps {
  pattern: Pattern;
  cellSize?: number;
}

type DragKind = 'paint' | 'marquee' | 'move';

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
  const dragRef = useRef<DragKind | null>(null);
  // Subscribed (not just read via getState()) so a marquee-drag preview or a
  // floating selection's move/transform re-renders the overlay even though
  // `pattern` itself doesn't change until the selection is lifted/committed.
  const marqueeRect = useEditorStore((s) => s.marqueeRect);
  const selection = useEditorStore((s) => s.selection);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const svg = buildGridSVG(pattern, { cellSize, marqueeRect, selection });
    container.replaceChildren(svg);
  }, [pattern, cellSize, marqueeRect, selection]);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    const tool = useEditorStore.getState().tool;
    if (tool !== 'draw' && tool !== 'select') return;
    const cell = cellAtPoint(e.clientX, e.clientY);
    if (!cell) return;
    // Capture on the (stable) container, not the SVG rect: the rect itself
    // gets torn down and rebuilt by the effect above on every painted cell,
    // which would silently drop capture set on it. Capturing here also means
    // pointerup/pointermove keep firing on this element even if the drag
    // continues or ends outside the grid, so no separate window listener for
    // "drag ended off-grid" is needed.
    containerRef.current?.setPointerCapture(e.pointerId);

    if (tool === 'draw') {
      dragRef.current = 'paint';
      useEditorStore.getState().beginStroke(cell.row, cell.col);
      return;
    }

    // tool === 'select': a pointer-down inside the current floating
    // selection's bounds grabs it for a move-drag; anywhere else starts a
    // fresh marquee (which replaces any current selection).
    const { selection: current } = useEditorStore.getState();
    if (current && isInsideBlock(cell.row, cell.col, current.anchorRow, current.anchorCol, current.block)) {
      dragRef.current = 'move';
      useEditorStore.getState().beginSelectionMove(cell.row, cell.col);
    } else {
      dragRef.current = 'marquee';
      useEditorStore.getState().beginMarqueeDrag(cell.row, cell.col);
    }
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const cell = cellAtPoint(e.clientX, e.clientY);
    if (!cell) return;
    if (dragRef.current === 'paint') {
      useEditorStore.getState().continueStroke(cell.row, cell.col);
    } else if (dragRef.current === 'marquee') {
      useEditorStore.getState().continueMarqueeDrag(cell.row, cell.col);
    } else {
      useEditorStore.getState().continueSelectionMove(cell.row, cell.col);
    }
  }

  function endDrag(e: PointerEvent<HTMLDivElement>) {
    const kind = dragRef.current;
    if (!kind) return;
    dragRef.current = null;
    if (kind === 'paint') useEditorStore.getState().endStroke();
    else if (kind === 'marquee') useEditorStore.getState().endMarqueeDrag();
    else useEditorStore.getState().endSelectionMove();
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
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    />
  );
}
