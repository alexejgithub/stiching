import { useRef } from "react";
import { PALETTE, gridSize, useEditorStore } from "./store";
import type { Cell } from "./pattern";

const CELL_SIZE = 28;

function slotFor(id: Cell) {
  if (id === null) return null;
  return PALETTE.find((s) => s.id === id) ?? null;
}

export function Grid() {
  const pattern = useEditorStore((s) => s.pattern);
  const tool = useEditorStore((s) => s.tool);
  const selection = useEditorStore((s) => s.selection);
  const marqueeRect = useEditorStore((s) => s.marqueeRect);
  const pointerDown = useEditorStore((s) => s.pointerDown);
  const pointerMove = useEditorStore((s) => s.pointerMove);
  const pointerUp = useEditorStore((s) => s.pointerUp);

  const svgRef = useRef<SVGSVGElement>(null);
  const isPointerActive = useRef(false);

  const width = gridSize.cols * CELL_SIZE;
  const height = gridSize.rows * CELL_SIZE;

  function cellFromEvent(e: React.PointerEvent<SVGSVGElement>): { row: number; col: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const bounds = svg.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    if (row < 0 || row >= gridSize.rows || col < 0 || col >= gridSize.cols) return null;
    return { row, col };
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const cell = cellFromEvent(e);
    if (!cell) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    isPointerActive.current = true;
    pointerDown(cell.row, cell.col);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!isPointerActive.current) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    pointerMove(cell.row, cell.col);
  }

  function handlePointerUp() {
    if (!isPointerActive.current) return;
    isPointerActive.current = false;
    pointerUp();
  }

  const cells: Cell[][] = pattern.grid;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ touchAction: "none", background: "#fff", cursor: tool === "draw" ? "crosshair" : "default" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {cells.map((rowCells, r) =>
        rowCells.map((cellValue, c) => {
          const slot = slotFor(cellValue);
          return (
            <g key={`${r}-${c}`}>
              <rect
                x={c * CELL_SIZE}
                y={r * CELL_SIZE}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill={slot ? slot.hex : "#ffffff"}
                stroke="#ddd"
                strokeWidth={1}
              />
              {slot && (
                <text
                  x={c * CELL_SIZE + CELL_SIZE / 2}
                  y={r * CELL_SIZE + CELL_SIZE / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={14}
                  fill="rgba(255,255,255,0.85)"
                  pointerEvents="none"
                >
                  {slot.symbol}
                </text>
              )}
            </g>
          );
        })
      )}

      {/* live marquee preview while dragging a new selection */}
      {marqueeRect && (
        <rect
          x={marqueeRect.c0 * CELL_SIZE}
          y={marqueeRect.r0 * CELL_SIZE}
          width={(marqueeRect.c1 - marqueeRect.c0 + 1) * CELL_SIZE}
          height={(marqueeRect.r1 - marqueeRect.r0 + 1) * CELL_SIZE}
          fill="rgba(52,152,219,0.15)"
          stroke="#3498db"
          strokeDasharray="4 3"
          strokeWidth={2}
          pointerEvents="none"
        />
      )}

      {/* floating selection: its own overlay of cells (drawn already-blanked in
          the base grid above) plus a bounding box so it reads as "lifted" */}
      {selection && (
        <g pointerEvents="none">
          {selection.block.map((rowCells, r) =>
            rowCells.map((cellValue, c) => {
              const slot = slotFor(cellValue);
              const x = (selection.anchorCol + c) * CELL_SIZE;
              const y = (selection.anchorRow + r) * CELL_SIZE;
              return (
                <g key={`sel-${r}-${c}`}>
                  <rect x={x} y={y} width={CELL_SIZE} height={CELL_SIZE} fill={slot ? slot.hex : "#ffffff"} />
                  {slot && (
                    <text
                      x={x + CELL_SIZE / 2}
                      y={y + CELL_SIZE / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={14}
                      fill="rgba(255,255,255,0.85)"
                    >
                      {slot.symbol}
                    </text>
                  )}
                </g>
              );
            })
          )}
          <rect
            x={selection.anchorCol * CELL_SIZE}
            y={selection.anchorRow * CELL_SIZE}
            width={(selection.block[0]?.length ?? 0) * CELL_SIZE}
            height={selection.block.length * CELL_SIZE}
            fill="none"
            stroke="#e67e22"
            strokeWidth={2}
          />
        </g>
      )}
    </svg>
  );
}
