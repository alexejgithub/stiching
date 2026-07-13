import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { createPattern } from '../model/pattern';
import { loadPattern, savePattern } from './db';
import { exportPattern, importPattern, parsePattern, patternFileName } from './file';

// Fresh in-memory IndexedDB per test, matching db.test.ts's convention.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

// exportPattern triggers a real browser download (Blob + object URL + <a
// download> click) with no return value, so these tests capture the Blob
// passed to createObjectURL and the anchor's filename instead of driving an
// actual download.
function captureDownload(): { blob: Blob; name: string }[] {
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
    const el = originalCreateElement(tagName);
    if (tagName === 'a') {
      const originalClick = el.click.bind(el);
      el.click = () => {
        const anchor = el as HTMLAnchorElement;
        const blob = blobsByUrl.get(anchor.href);
        if (blob) clicks.push({ blob, name: anchor.download });
        originalClick();
      };
    }
    return el;
  }) as typeof document.createElement;
  return clicks;
}

describe('exportPattern / importPattern round-trip', () => {
  it('round-trips a Pattern byte-for-byte through export then import', async () => {
    const pattern = createPattern('Round Trip', 3, 4);
    pattern.grid[0][0] = 1;
    pattern.palette.push({ id: 1, hex: '#00ff00', label: 'Green', symbolId: 2, yarnLink: null });
    pattern.nextSlotId = 2;

    const json = JSON.stringify(pattern);
    // JSON.parse(exportedBlobText) deep-equals the original Pattern.
    expect(JSON.parse(json)).toEqual(pattern);

    // Importing that same JSON reconstructs an equal Pattern.
    const reimported = parsePattern(json);
    expect(reimported).toEqual(pattern);
  });

  it('exportPattern downloads a .crochet file whose contents are JSON.stringify(pattern), no wrapper', async () => {
    const pattern = createPattern('My Blanket', 2, 2);
    const clicks = captureDownload();

    exportPattern(pattern);

    expect(clicks).toHaveLength(1);
    expect(clicks[0].name).toBe('My Blanket.crochet');
    const text = await clicks[0].blob.text();
    expect(text).toBe(JSON.stringify(pattern));
  });

  it('importPattern reads a File end-to-end and parses it as a Pattern', async () => {
    const pattern = createPattern('From File', 2, 3);
    const file = new File([JSON.stringify(pattern)], patternFileName(pattern), { type: 'application/json' });

    const imported = await importPattern(file);

    expect(imported).toEqual(pattern);
  });
});

describe('parsePattern validation', () => {
  it('rejects malformed JSON', () => {
    expect(() => parsePattern('{not valid json')).toThrow();
  });

  it('rejects well-formed JSON that is not shaped like a Pattern', () => {
    expect(() => parsePattern(JSON.stringify({ hello: 'world' }))).toThrow();
    expect(() => parsePattern(JSON.stringify({ schemaVersion: 1, name: 'Missing fields' }))).toThrow();
  });

  it('rejects a grid containing invalid cell values', () => {
    const pattern = createPattern('Bad Grid', 1, 1);
    const bad = { ...pattern, grid: [['not-a-slot-id']] };
    expect(() => parsePattern(JSON.stringify(bad))).toThrow();
  });
});

describe('replace-current semantics: single autosave slot', () => {
  it('importing a pattern and saving it overwrites the single autosave slot (no stale prior pattern)', async () => {
    const original = createPattern('Original', 2, 2);
    await savePattern(original);

    const incoming = createPattern('Imported', 5, 5);
    const file = new File([JSON.stringify(incoming)], patternFileName(incoming));
    const imported = await importPattern(file);
    await savePattern(imported);

    const loaded = await loadPattern();
    expect(loaded).toEqual(incoming);
    expect(loaded).not.toEqual(original);
  });

  it('starting a New Pattern and saving it overwrites the single autosave slot', async () => {
    const original = createPattern('Original', 2, 2);
    await savePattern(original);

    const fresh = createPattern('Fresh Start', 3, 3);
    await savePattern(fresh);

    const loaded = await loadPattern();
    expect(loaded).toEqual(fresh);
    expect(loaded).not.toEqual(original);
  });
});
