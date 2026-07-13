import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { createPattern } from '../model/pattern';
import { loadPattern, savePattern } from './db';

// Fresh in-memory IndexedDB per test so writes from one test never leak into
// the next (fake-indexeddb keeps its data on the factory instance itself).
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('savePattern / loadPattern', () => {
  it('round-trips a saved pattern', async () => {
    const pattern = createPattern('Test', 3, 4);
    pattern.grid[0][0] = 1;
    pattern.palette.push({ id: 1, hex: '#ff0000', label: 'Red', symbolId: 0, yarnLink: null });
    pattern.nextSlotId = 2;

    await savePattern(pattern);
    const loaded = await loadPattern();

    expect(loaded).toEqual(pattern);
  });

  it('returns null when nothing has been saved', async () => {
    const loaded = await loadPattern();
    expect(loaded).toBeNull();
  });

  it('overwrites the single record wholesale on the next save', async () => {
    const first = createPattern('First', 2, 2);
    const second = createPattern('Second', 5, 5);

    await savePattern(first);
    await savePattern(second);
    const loaded = await loadPattern();

    expect(loaded).toEqual(second);
  });
});
