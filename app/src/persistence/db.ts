// IndexedDB-backed persistence for a single current-pattern record (ticket 25).
// One fixed database, one object store, one fixed key — every save overwrites
// that record wholesale. No multi-pattern library; see spec's "Persistence —
// storage scope" decision.

import { type Pattern } from '../model/pattern';

const DB_NAME = 'crochet-pattern-editor';
const DB_VERSION = 1;
const STORE_NAME = 'currentPattern';
const CURRENT_KEY = 'current';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePattern(pattern: Pattern): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(pattern, CURRENT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadPattern(): Promise<Pattern | null> {
  const db = await openDb();
  try {
    return await new Promise<Pattern | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(CURRENT_KEY);
      request.onsuccess = () => resolve((request.result as Pattern | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
