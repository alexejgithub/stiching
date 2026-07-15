import { describe, expect, it } from 'vitest';
import { addSlot } from '../model/palette';
import { createPattern } from '../model/pattern';
import {
  exportOverviewFileName,
  exportPageFileName,
  exportPatternAsSVG,
  exportPatternOverviewAsSVG,
} from './exportSvg';

// Same Blob/object-URL/<a download> interception technique as
// file.test.ts's captureDownload, applied here to the SVG export pipeline.
function captureDownloads(): { blob: Blob; name: string }[] {
  const clicks: { blob: Blob; name: string }[] = [];
  const blobsByUrl = new Map<string, Blob>();
  const originalCreateObjectURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = ((blob: Blob) => {
    const url = originalCreateObjectURL(blob);
    blobsByUrl.set(url, blob);
    return url;
  }) as typeof URL.createObjectURL;

  const originalCreateElement = document.createElement.bind(document);
  document.createElement = ((tagName: string) => {
    const elNode = originalCreateElement(tagName);
    if (tagName === 'a') {
      const originalClick = elNode.click.bind(elNode);
      elNode.click = () => {
        const anchor = elNode as HTMLAnchorElement;
        const blob = blobsByUrl.get(anchor.href);
        if (blob) clicks.push({ blob, name: anchor.download });
        originalClick();
      };
    }
    return elNode;
  }) as typeof document.createElement;
  return clicks;
}

function patternWithPalette(rows: number, cols: number) {
  let p = createPattern('My Blanket', rows, cols);
  p = addSlot(p, '#ff0000', 'Red');
  return p;
}

describe('exportPageFileName', () => {
  it('names a single-page export as a plain .svg file, no page suffix', () => {
    const pattern = createPattern('My Blanket', 5, 5);
    expect(exportPageFileName(pattern, 0, 1)).toBe('My Blanket.svg');
  });

  it('names each file in a multi-page export with its page number and total', () => {
    const pattern = createPattern('My Blanket', 5, 5);
    expect(exportPageFileName(pattern, 0, 3)).toBe('My Blanket-page-1-of-3.svg');
    expect(exportPageFileName(pattern, 2, 3)).toBe('My Blanket-page-3-of-3.svg');
  });
});

describe('exportPatternAsSVG', () => {
  it('downloads exactly one plain .svg file for a pattern that fits on one page', async () => {
    const pattern = patternWithPalette(5, 5);
    const clicks = captureDownloads();

    exportPatternAsSVG(pattern, 10);

    expect(clicks).toHaveLength(1);
    expect(clicks[0].name).toBe('My Blanket.svg');
    const text = await clicks[0].blob.text();
    expect(text).toContain('<svg');
    expect(text).toContain('data-role="export-page"');
  });

  it('downloads one self-contained file per page for a pattern spanning multiple pages', async () => {
    const pattern = patternWithPalette(60, 60);
    const clicks = captureDownloads();

    exportPatternAsSVG(pattern, 10);

    expect(clicks.length).toBeGreaterThan(1);
    const total = clicks.length;
    clicks.forEach((click, i) => {
      expect(click.name).toBe(`My Blanket-page-${i + 1}-of-${total}.svg`);
    });

    // Each downloaded file is independently a full, valid SVG document (not
    // a fragment referencing something outside itself).
    for (const click of clicks) {
      const text = await click.blob.text();
      expect(text).toContain('<svg');
      expect(text).toContain('data-role="legend-item"');
      expect(text).toContain('data-role="page-header-title"');
    }
  });
});

describe('exportOverviewFileName', () => {
  it('suffixes the pattern name with "-overview", distinct from the paginated file names', () => {
    const pattern = createPattern('My Blanket', 5, 5);
    expect(exportOverviewFileName(pattern)).toBe('My Blanket-overview.svg');
  });
});

describe('exportPatternOverviewAsSVG', () => {
  it('downloads exactly one self-contained overview SVG, regardless of pattern size', () => {
    const pattern = patternWithPalette(200, 200);
    const clicks = captureDownloads();

    exportPatternOverviewAsSVG(pattern);

    expect(clicks).toHaveLength(1);
    expect(clicks[0].name).toBe('My Blanket-overview.svg');
  });

  it('produces a valid overview SVG document distinct from the paginated export', async () => {
    const pattern = patternWithPalette(5, 5);
    const clicks = captureDownloads();

    exportPatternOverviewAsSVG(pattern);

    const text = await clicks[0].blob.text();
    expect(text).toContain('<svg');
    expect(text).toContain('data-role="overview-page"');
    expect(text).toContain('data-role="legend-item"');
    expect(text).not.toContain('data-role="page-header-title"');
  });
});
