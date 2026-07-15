// Pure crop-box geometry for the Import Image crop step (ticket 07). Kept
// separate from CropBox.tsx (the pointer-driven component) so this math -
// aspect-ratio locking, corner-anchored resize, stage-bounds clamping - is
// unit-testable without any DOM/pointer-event faking.

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CropCorner = 'nw' | 'ne' | 'sw' | 'se';

export const MIN_CROP_SIZE = 24;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

// The largest aspect-ratio-locked box centered on `previous`'s center,
// within a stageWidth x stageHeight area - used both for a freshly-loaded
// photo's initial crop and to re-fit the box whenever rows/cols change the
// target aspect ratio, without restarting the crop.
export function fitCropToAspectRatio(
  previous: CropRect,
  aspectRatio: number,
  stageWidth: number,
  stageHeight: number
): CropRect {
  const centerX = previous.x + previous.width / 2;
  const centerY = previous.y + previous.height / 2;

  let width = previous.width;
  let height = width / aspectRatio;
  if (height > stageHeight) {
    height = stageHeight;
    width = height * aspectRatio;
  }
  if (width > stageWidth) {
    width = stageWidth;
    height = width / aspectRatio;
  }

  const x = clamp(centerX - width / 2, 0, stageWidth - width);
  const y = clamp(centerY - height / 2, 0, stageHeight - height);
  return { x, y, width, height };
}

// Resizes `start` by dragging `corner` by (dx, dy), keeping the opposite
// corner fixed and the aspect ratio locked, clamped within the stage.
export function resizeFromCorner(
  corner: CropCorner,
  start: CropRect,
  dx: number,
  dy: number,
  aspectRatio: number,
  stageWidth: number,
  stageHeight: number
): CropRect {
  const anchorX = corner.includes('w') ? start.x + start.width : start.x;
  const anchorY = corner.includes('n') ? start.y + start.height : start.y;
  const cornerX = corner.includes('w') ? start.x + dx : start.x + start.width + dx;
  const cornerY = corner.includes('n') ? start.y + dy : start.y + start.height + dy;

  // Drive the resize off whichever axis the pointer moved further along, so
  // a diagonal drag still tracks the cursor naturally.
  const rawWidth = Math.abs(cornerX - anchorX);
  const rawHeight = Math.abs(cornerY - anchorY);
  let width = Math.max(MIN_CROP_SIZE, rawWidth > rawHeight * aspectRatio ? rawWidth : rawHeight * aspectRatio);
  let height = width / aspectRatio;

  const maxWidth = corner.includes('w') ? anchorX : stageWidth - anchorX;
  const maxHeight = corner.includes('n') ? anchorY : stageHeight - anchorY;
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  const x = corner.includes('w') ? anchorX - width : anchorX;
  const y = corner.includes('n') ? anchorY - height : anchorY;
  return { x, y, width, height };
}
