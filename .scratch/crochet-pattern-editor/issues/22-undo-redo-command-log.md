# 22 — Undo/redo command log for paint and palette edits

**What to build:** A single unified undo/redo stack — a command log of invertible per-cell diffs, not full-grid snapshots — wired into both the paint/erase actions from ticket 21 and the palette actions from ticket 20, so Ctrl+Z/Ctrl+Y works uniformly across "grid stuff" and "palette stuff" with no carve-outs. In-memory only, capped at roughly 100 steps, cleared on reload.

**Blocked by:** 20, 21

**Status:** resolved

- [x] Ctrl+Z undoes the last action; Ctrl+Y (or equivalent) redoes an undone action
- [x] A full paint or erase drag (pointer down to up) undoes as a single step, not one press per cell touched
- [x] Palette add/rename/recolor/delete each undo/redo through the same stack as grid actions — no action type is exempt (reorder and symbol-override included too)
- [x] At least ~100 steps of history are retained; once the cap is hit, the oldest entries drop rather than growing unbounded
- [x] Undo/redo affects Cell content and palette state only — it never restores or clears whatever is currently selected (selection doesn't exist as a tool yet, but the log's scope is established here so ticket 23 doesn't have to touch this contract)
- [x] The log is not persisted anywhere and starts empty on every load
- [x] Store action API tests cover: undo/redo of a single-cell paint, undo/redo of a multi-cell drag as one step, undo/redo of each palette action type, exceeding the cap and confirming the oldest entry is dropped, and redo being cleared once a new action is dispatched after an undo

## Comments

Implemented in [app/](../../../app/) — `Command` union, `undo`/`redo`/`canUndo`/`canRedo` in `src/store/editorStore.ts`, global Ctrl+Z/Ctrl+Y in `src/App.tsx`, Undo/Redo buttons in `src/components/Toolbar.tsx`. Verified live in-browser and via `src/store/editorStore.test.ts`. Commit: `a3a0a66`.
