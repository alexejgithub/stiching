# Design undo/redo architecture

Type: grilling
Blocked by: 11
Status: resolved

## Question

Given undo/redo is in scope ([Undo/redo scope](05-undo-redo-scope.md)) and the data model from [Design the pattern data model](11-data-model.md), what's the undo mechanism — a command/action log (each tool action recorded as an invertible command) vs. full-state snapshots per action? How deep does history go, and does it need to survive a page reload (see the map's Not yet specified note, which depends on this and on [persistence](15-persistence-layer.md))?

## Answer

- **Mechanism**: command log of invertible diffs. Each command records only the cells it touched (old value → new value), not a full-grid snapshot. Cost scales with edit size, not grid size.
- **Depth**: capped at a fixed depth (e.g. 100 steps); oldest entries drop off once the cap is hit.
- **Reload survival**: in-memory only, cleared on reload. Only current pattern state persists via autosave (see [persistence layer](15-persistence-layer.md)) — the undo log itself is never serialized to storage, so it needs no schema/versioning of its own. This resolves the map's "Not yet specified" note: undo history does not need to survive a reload.
- **Stroke granularity**: a continuous drag paint stroke (mouse/stylus down to up) coalesces into one undo step, not one per cell touched.
- **Selection on undo**: undo restores cell content only, never selection state. Selection stays ephemeral/untouched by undo, consistent with it being non-persisted UI state (per the data model).
- **Scope**: palette edits (add/rename/delete slot) go through the same unified undo log as grid/tool actions — one stack covers everything, no "undo doesn't apply here" edge cases.
