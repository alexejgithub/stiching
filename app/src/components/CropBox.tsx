import { type PointerEvent, useRef } from 'react';
import { type CropCorner, type CropRect, clamp, resizeFromCorner } from '../model/crop';

interface CropBoxProps {
  stageWidth: number;
  stageHeight: number;
  aspectRatio: number; // cols / rows - the crop box is always locked to this
  crop: CropRect;
  onChange: (crop: CropRect) => void;
}

type DragMode = 'move' | CropCorner;

// Drag-to-move, drag-corner-to-resize crop overlay, always locked to
// `aspectRatio` and clamped within the stage bounds (ticket 07). Pointer
// capture is set on this component's own stable root element (never torn
// down mid-drag) so move/up keep firing even if the pointer leaves the
// element, matching the convention PatternGrid.tsx uses for paint/marquee
// drags. `touch-action: none` (index.css) gives stylus full parity and
// keeps bare-finger touch from scrolling the page mid-drag.
export function CropBox({ stageWidth, stageHeight, aspectRatio, crop, onChange }: CropBoxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; startCrop: CropRect } | null>(null);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    const handle = (e.target as HTMLElement).dataset.handle as CropCorner | undefined;
    e.preventDefault();
    rootRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { mode: handle ?? 'move', startX: e.clientX, startY: e.clientY, startCrop: crop };
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (drag.mode === 'move') {
      onChange({
        ...drag.startCrop,
        x: clamp(drag.startCrop.x + dx, 0, stageWidth - drag.startCrop.width),
        y: clamp(drag.startCrop.y + dy, 0, stageHeight - drag.startCrop.height),
      });
      return;
    }
    onChange(resizeFromCorner(drag.mode, drag.startCrop, dx, dy, aspectRatio, stageWidth, stageHeight));
  }

  function endDrag(e: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (rootRef.current?.hasPointerCapture(e.pointerId)) {
      rootRef.current.releasePointerCapture(e.pointerId);
    }
  }

  return (
    <div
      ref={rootRef}
      className="crop-box"
      style={{ left: crop.x, top: crop.y, width: crop.width, height: crop.height }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="crop-handle crop-handle-nw" data-handle="nw" />
      <div className="crop-handle crop-handle-ne" data-handle="ne" />
      <div className="crop-handle crop-handle-sw" data-handle="sw" />
      <div className="crop-handle crop-handle-se" data-handle="se" />
    </div>
  );
}
