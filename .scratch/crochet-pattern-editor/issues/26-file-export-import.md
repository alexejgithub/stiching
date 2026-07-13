# 26 — File export/import (.crochet) and replace-current semantics

**What to build:** Explicit file-based backup and device-to-device transfer: export the current Pattern to a `.crochet` file, and import a previously exported file back in. Both New Pattern and Import are understood as replacing whatever is currently in progress — the "one pattern open at a time" model — with the autosave slot from ticket 25 reflecting that replacement immediately.

**Blocked by:** 25

**Status:** resolved

- [x] Exporting writes the current Pattern to a `.crochet` file — the raw `Pattern` object serialized via `JSON.stringify`, no wrapper envelope
- [x] Importing a `.crochet` file loads it as the current Pattern
- [x] Starting a New Pattern replaces the current in-progress work
- [x] Importing a file replaces the current in-progress work
- [x] Both New Pattern and Import cause the single autosave slot to reflect the replacement (no stale prior pattern left behind in storage)
- [x] Persistence module tests (fake/in-memory IndexedDB) assert: export-then-import round-trips a Pattern byte-for-byte, importing overwrites the single autosave slot, and starting a New Pattern overwrites the single autosave slot

## Comments

Implemented in [app/](../../../app/) — `src/persistence/file.ts` (`exportPattern`/`importPattern`/`parsePattern`), Export/Import controls in `src/App.tsx` (reachable from both the landing screen and the open editor). Verified live in-browser (exported and inspected the raw JSON, imported a file and confirmed it replaced the current pattern, reload confirmed the autosave slot reflected the replacement immediately) and via `src/persistence/file.test.ts`. Commit: `9261fa0`, plus a post-review fix in `f7becf7` (import/boot-load now go through a `replacePattern` store action so undo/redo history and selection state are reset along with the swap, not just `pattern` itself).
