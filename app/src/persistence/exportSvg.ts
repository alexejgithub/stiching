// Triggers the actual browser download(s) for ticket 27's SVG export. Pure
// SVG construction lives in `render/exportRenderer.ts`; this module only
// serializes and downloads, mirroring ticket 26's `exportPattern` technique
// in `file.ts` (Blob + object URL + temporary `<a download>` click).

import { type Pattern } from '../model/pattern';
import { A4_PORTRAIT_MM, DEFAULT_CELL_SIZE_MM, type PageSizeMm } from '../render/exportLayout';
import { buildExportPages } from '../render/exportRenderer';
import { buildOverviewSVG } from '../render/overviewRenderer';
import { sanitizeFileName } from './file';

function serializeSVG(svg: SVGSVGElement): string {
  return new XMLSerializer().serializeToString(svg);
}

function downloadSVG(svg: SVGSVGElement, fileName: string): void {
  const text = serializeSVG(svg);
  const blob = new Blob([text], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function exportPageFileName(pattern: Pattern, pageIndex: number, pageCount: number): string {
  const base = sanitizeFileName(pattern.name);
  return pageCount === 1 ? `${base}.svg` : `${base}-page-${pageIndex + 1}-of-${pageCount}.svg`;
}

/**
 * Builds every export page and triggers one browser download per page: a
 * single plain `.svg` file when the pattern fits on one page, or a set of
 * individually self-contained `-page-N-of-M.svg` files when it spans
 * several — per spec, never a wrapper/container for the single-page case.
 *
 * Multiple files download as sequential `<a download>` clicks, same as
 * ticket 26. Known v1 limitation: some browsers throttle or block several
 * rapid downloads triggered from one user gesture; there's no zip-bundling
 * fallback since that's explicitly out of spec's scope.
 */
export function exportPatternAsSVG(
  pattern: Pattern,
  cellSizeMm: number = DEFAULT_CELL_SIZE_MM,
  pageSizeMm: PageSizeMm = A4_PORTRAIT_MM
): void {
  const pages = buildExportPages(pattern, cellSizeMm, pageSizeMm);
  pages.forEach((svg, i) => {
    downloadSVG(svg, exportPageFileName(pattern, i, pages.length));
  });
}

export function exportOverviewFileName(pattern: Pattern): string {
  return `${sanitizeFileName(pattern.name)}-overview.svg`;
}

/**
 * Downloads ticket 41's single-page overview: one self-contained SVG file,
 * always exactly one page, distinct from the (possibly multi-file)
 * to-scale paginated export above.
 */
export function exportPatternOverviewAsSVG(
  pattern: Pattern,
  pageSizeMm: PageSizeMm = A4_PORTRAIT_MM
): void {
  const svg = buildOverviewSVG(pattern, pageSizeMm);
  downloadSVG(svg, exportOverviewFileName(pattern));
}
