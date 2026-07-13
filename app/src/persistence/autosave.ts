// Debounced autosave: observes editorStore's `pattern` field from outside the
// store (read-only subscriber, no new store actions — see ticket 25) and
// persists it via db.ts. Debounces ~1-2s after the last mutation, restarting
// the timer on each new change, and flushes immediately (bypassing the
// debounce) on window blur/beforeunload/pagehide so an abrupt exit right
// after an edit still saves.

import { type Pattern } from '../model/pattern';
import { useEditorStore } from '../store/editorStore';
import { savePattern } from './db';

const DEBOUNCE_MS = 1500;

export interface Autosave {
  stop: () => void;
}

export function startAutosave(): Autosave {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: Pattern | null = null;

  function flush() {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
    const toSave = pending;
    pending = null;
    if (toSave) void savePattern(toSave);
  }

  const unsubscribe = useEditorStore.subscribe((state, prevState) => {
    if (state.pattern === prevState.pattern || !state.pattern) return;
    pending = state.pattern;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const toSave = pending;
      pending = null;
      if (toSave) void savePattern(toSave);
    }, DEBOUNCE_MS);
  });

  window.addEventListener('blur', flush);
  window.addEventListener('beforeunload', flush);
  window.addEventListener('pagehide', flush);

  return {
    stop: () => {
      flush();
      unsubscribe();
      window.removeEventListener('blur', flush);
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('pagehide', flush);
    },
  };
}
