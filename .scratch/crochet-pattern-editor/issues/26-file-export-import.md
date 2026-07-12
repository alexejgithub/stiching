# 26 — File export/import (.crochet) and replace-current semantics

**What to build:** Explicit file-based backup and device-to-device transfer: export the current Pattern to a `.crochet` file, and import a previously exported file back in. Both New Pattern and Import are understood as replacing whatever is currently in progress — the "one pattern open at a time" model — with the autosave slot from ticket 25 reflecting that replacement immediately.

**Blocked by:** 25

**Status:** ready-for-agent

- [ ] Exporting writes the current Pattern to a `.crochet` file — the raw `Pattern` object serialized via `JSON.stringify`, no wrapper envelope
- [ ] Importing a `.crochet` file loads it as the current Pattern
- [ ] Starting a New Pattern replaces the current in-progress work
- [ ] Importing a file replaces the current in-progress work
- [ ] Both New Pattern and Import cause the single autosave slot to reflect the replacement (no stale prior pattern left behind in storage)
- [ ] Persistence module tests (fake/in-memory IndexedDB) assert: export-then-import round-trips a Pattern byte-for-byte, importing overwrites the single autosave slot, and starting a New Pattern overwrites the single autosave slot
