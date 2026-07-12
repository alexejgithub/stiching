# 25 — Autosave to IndexedDB

**What to build:** Continuous autosave of the in-progress Pattern to a single current-pattern record in IndexedDB, so a refresh, crash, or accidental tab close never loses work, and reopening the app resumes exactly where the crafter left off.

**Blocked by:** 21

**Status:** ready-for-agent

- [ ] Edits autosave to IndexedDB (not localStorage) a short debounce (~1-2s) after the last mutation, with the timer restarting on each new change rather than saving on every keystroke/cell
- [ ] An immediate save also flushes on window blur/unload, so an abrupt exit right after an edit doesn't lose that edit
- [ ] Reopening the app loads the single autosaved record and resumes with the same Pattern state (palette, grid content) the crafter left off with
- [ ] Autosave writes to one single current-pattern slot/record — no multi-pattern library — later overwritten wholesale by the next autosave
- [ ] Persistence module tests run against a fake/in-memory IndexedDB (e.g. `fake-indexeddb`) and assert: a saved-then-loaded Pattern round-trips correctly, the debounce coalesces rapid successive mutations into one write, and blur/unload triggers an immediate flush even mid-debounce
