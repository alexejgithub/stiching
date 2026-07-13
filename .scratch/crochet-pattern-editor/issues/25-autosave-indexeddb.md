# 25 — Autosave to IndexedDB

**What to build:** Continuous autosave of the in-progress Pattern to a single current-pattern record in IndexedDB, so a refresh, crash, or accidental tab close never loses work, and reopening the app resumes exactly where the crafter left off.

**Blocked by:** 21

**Status:** resolved

- [x] Edits autosave to IndexedDB (not localStorage) a short debounce (~1-2s) after the last mutation, with the timer restarting on each new change rather than saving on every keystroke/cell
- [x] An immediate save also flushes on window blur/unload, so an abrupt exit right after an edit doesn't lose that edit
- [x] Reopening the app loads the single autosaved record and resumes with the same Pattern state (palette, grid content) the crafter left off with
- [x] Autosave writes to one single current-pattern slot/record — no multi-pattern library — later overwritten wholesale by the next autosave
- [x] Persistence module tests run against a fake/in-memory IndexedDB (e.g. `fake-indexeddb`) and assert: a saved-then-loaded Pattern round-trips correctly, the debounce coalesces rapid successive mutations into one write, and blur/unload triggers an immediate flush even mid-debounce

## Comments

Implemented in [app/](../../../app/) — `src/persistence/db.ts` (`savePattern`/`loadPattern`), `src/persistence/autosave.ts` (debounce + blur/beforeunload/pagehide flush), boot-load wired into `src/App.tsx`. Verified live in-browser (painted a pattern, reloaded the page, resumed with the exact same pattern instead of the landing screen) and via `src/persistence/db.test.ts` / `src/persistence/autosave.test.ts` against `fake-indexeddb`. Commit: `a80f587`.
