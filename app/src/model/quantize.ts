// Pure pixelation + color-quantization pipeline for Import Image.
//
// Array-in/array-out by design (see the Import Image spec's Testing
// Decisions): no HTMLImageElement/Canvas types here, so this is testable
// with plain synthetic pixel data. The DOM-facing glue that turns a photo
// into a pixel grid lives in imageSampling.ts and is not unit-tested.
//
// Quantize-first: the global palette is built once from the whole source
// buffer, before the target grid is known. Changing rows/cols only
// re-samples cells against that already-built palette (see ticket 02).

import { MmcqQuantizer } from 'colorthief/internals';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface QuantizeResult {
  grid: number[][]; // grid[row][col] = index into `palette`
  palette: string[]; // hex colors, in extraction order
}

// colorthief's own getColorSync special-cases a request for a single color
// by quantizing to its default 5-color palette and taking the most
// populous entry, rather than averaging every pixel. We mirror that here.
const DOMINANT_COLOR_PALETTE_SIZE = 5;

// Matches MmcqQuantizer's own internal histogram bucketing (5 significant
// bits/channel). The quantizer's box-splitting has no base case for
// splitting a single-bucket box that still holds >1 pixel (e.g. a solid-
// color photo) - asked to split further than the real color variety
// allows, it degenerates into near-duplicate palette entries instead of
// stopping. Clamping the requested count to the number of buckets actually
// present keeps every split real, which is what gives us "palette comes
// back shorter, never padded" for low-variety input.
const HISTOGRAM_SIGBITS = 5;
const HISTOGRAM_RSHIFT = 8 - HISTOGRAM_SIGBITS;

const quantizer = new MmcqQuantizer();

export function quantizeImage(
  pixels: RGB[][],
  targetRows: number,
  targetCols: number,
  colorCount: number
): QuantizeResult {
  if (!Number.isInteger(colorCount) || colorCount < 1) {
    throw new RangeError('colorCount must be a positive integer');
  }

  const flatPixels: Array<[number, number, number]> = [];
  for (const row of pixels) {
    for (const p of row) {
      flatPixels.push([p.r, p.g, p.b]);
    }
  }

  const palette: RGB[] = extractPalette(flatPixels, colorCount);
  const grid = sampleGridAgainstPalette(pixels, targetRows, targetCols, palette);

  return { grid, palette: palette.map(rgbToHex) };
}

function extractPalette(flatPixels: Array<[number, number, number]>, colorCount: number): RGB[] {
  if (flatPixels.length === 0) return [];

  if (colorCount === 1) {
    const boxes = quantizer.quantize(flatPixels, DOMINANT_COLOR_PALETTE_SIZE);
    const [r, g, b] = boxes[0].color;
    return [{ r, g, b }];
  }

  const distinctBuckets = countDistinctBuckets(flatPixels);
  if (distinctBuckets <= 1) {
    return [averageColor(flatPixels)];
  }

  const boxes = quantizer.quantize(flatPixels, Math.min(colorCount, distinctBuckets));
  return boxes.map(({ color: [r, g, b] }) => ({ r, g, b }));
}

function countDistinctBuckets(flatPixels: Array<[number, number, number]>): number {
  const seen = new Set<number>();
  for (const [r, g, b] of flatPixels) {
    const key =
      ((r >> HISTOGRAM_RSHIFT) << (2 * HISTOGRAM_SIGBITS)) +
      ((g >> HISTOGRAM_RSHIFT) << HISTOGRAM_SIGBITS) +
      (b >> HISTOGRAM_RSHIFT);
    seen.add(key);
  }
  return seen.size;
}

function averageColor(flatPixels: Array<[number, number, number]>): RGB {
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  for (const [r, g, b] of flatPixels) {
    rSum += r;
    gSum += g;
    bSum += b;
  }
  return { r: rSum / flatPixels.length, g: gSum / flatPixels.length, b: bSum / flatPixels.length };
}

function sampleGridAgainstPalette(
  pixels: RGB[][],
  targetRows: number,
  targetCols: number,
  palette: RGB[]
): number[][] {
  const srcRows = pixels.length;
  const srcCols = srcRows > 0 ? pixels[0].length : 0;

  const grid: number[][] = [];
  for (let tr = 0; tr < targetRows; tr++) {
    const rowStart = Math.floor((tr * srcRows) / targetRows);
    const rowEnd = Math.max(rowStart + 1, Math.floor(((tr + 1) * srcRows) / targetRows));
    const row: number[] = [];
    for (let tc = 0; tc < targetCols; tc++) {
      const colStart = Math.floor((tc * srcCols) / targetCols);
      const colEnd = Math.max(colStart + 1, Math.floor(((tc + 1) * srcCols) / targetCols));
      row.push(nearestPaletteIndex(meanColor(pixels, rowStart, rowEnd, colStart, colEnd), palette));
    }
    grid.push(row);
  }
  return grid;
}

function meanColor(pixels: RGB[][], rowStart: number, rowEnd: number, colStart: number, colEnd: number): RGB {
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  const srcRows = pixels.length;
  const srcCols = srcRows > 0 ? pixels[0].length : 0;
  for (let y = rowStart; y < rowEnd && y < srcRows; y++) {
    for (let x = colStart; x < colEnd && x < srcCols; x++) {
      const p = pixels[y][x];
      rSum += p.r;
      gSum += p.g;
      bSum += p.b;
      count++;
    }
  }
  if (count === 0) return { r: 0, g: 0, b: 0 };
  return { r: rSum / count, g: gSum / count, b: bSum / count };
}

function nearestPaletteIndex(color: RGB, palette: RGB[]): number {
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const c = palette[i];
    const dr = c.r - color.r;
    const dg = c.g - color.g;
    const db = c.b - color.b;
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
