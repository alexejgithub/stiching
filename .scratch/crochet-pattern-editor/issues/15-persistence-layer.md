# Design persistence layer implementation

Type: grilling
Blocked by: 11
Status: resolved

## Question

Given the persistence model is autosave + file export/import ([Persistence model](08-persistence-model.md)) built on the schema from [Design the pattern data model](11-data-model.md), what's the concrete implementation: browser storage mechanism (IndexedDB vs localStorage) and autosave frequency/triggers, the exported file format (JSON structure, file extension, schema version field for forward compatibility), and how a "my patterns" list (if any) is presented for patterns sitting in browser storage?

## Answer

- **Storage mechanism**: IndexedDB, not localStorage. The `grid` is a dense 2D array that can reach a few hundred cells per side (tens to low-hundreds of KB–MB as JSON); localStorage's ~5-10MB per-origin cap and synchronous API make it a poor fit, while IndexedDB is async and quota-generous.
- **Autosave trigger**: Debounced on mutation (~1-2s after the last edit, timer restarts on each new change), plus an immediate flush on window blur/unload as a safety net. Ties saves to actual activity rather than a fixed interval, and matches the undo system's own stroke-coalescing (ticket 13).
- **Storage scope**: Single current-pattern slot in IndexedDB — one record, overwritten by every autosave. No in-app multi-pattern library for v1; starting a New Pattern or opening an imported file replaces the slot. Keeping/moving multiple patterns goes through file export/import, which is already in scope. A multi-pattern gallery is a clean v2 add later since it doesn't touch the `Pattern` schema.
- **Export file format**: The raw `Pattern` object (ticket 11's schema) serialized as-is via `JSON.stringify` — no wrapper envelope, since `schemaVersion` on `Pattern` already covers forward-compat migration. File extension: `.crochet`.
