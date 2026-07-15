// DOM-facing glue between a picked photo and the pure quantization pipeline
// (quantize.ts). Deliberately not unit-tested (per the Import Image spec's
// Testing Decisions) - file loading and canvas drawImage sampling are thin,
// browser-only edges verified live rather than through jsdom canvas faking.

import type { RGB } from './quantize';

export const MAX_IMAGE_FILE_SIZE_BYTES = 25 * 1024 * 1024;

// Sized independently of source resolution and target grid size - only
// needs to comfortably exceed the largest supported grid dimension so grid
// resampling always has more source detail than it needs (ticket 01).
export const ANALYSIS_MAX_DIMENSION = 300;

export function isFileTooLarge(file: File): boolean {
  return file.size > MAX_IMAGE_FILE_SIZE_BYTES;
}

// The object URL is deliberately NOT revoked on success: the caller needs to
// keep displaying this same <img> in the crop step, and a browser that has
// already fired `load` keeps showing an already-decoded image's bitmap even
// after its object URL is revoked - callers should revoke it (via
// `revokeImage`) once they're done with the dialog (create or cancel).
export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file could not be opened as an image.'));
    };
    img.src = url;
  });
}

export function revokeImage(img: HTMLImageElement): void {
  URL.revokeObjectURL(img.src);
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Downscales the given region of the source image into an offscreen canvas
// capped at ANALYSIS_MAX_DIMENSION on its longest side, and returns it as a
// plain RGB pixel grid - the buffer that the pure quantization pipeline is
// re-run against on every color-count/grid-size tick, without ever
// re-reading the original photo (ticket 01/08).
export function sampleAnalysisBuffer(
  img: HTMLImageElement,
  crop: CropRegion,
  maxDimension: number = ANALYSIS_MAX_DIMENSION
): RGB[][] {
  const scale = Math.min(1, maxDimension / Math.max(crop.width, crop.height));
  const outWidth = Math.max(1, Math.round(crop.width * scale));
  const outHeight = Math.max(1, Math.round(crop.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get a 2D canvas context.');
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, outWidth, outHeight);

  const { data } = ctx.getImageData(0, 0, outWidth, outHeight);
  const pixels: RGB[][] = [];
  for (let y = 0; y < outHeight; y++) {
    const row: RGB[] = [];
    for (let x = 0; x < outWidth; x++) {
      const i = (y * outWidth + x) * 4;
      row.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
    pixels.push(row);
  }
  return pixels;
}
