# 36 — Add a restart/new-pattern control to the editor

**Requested by:** user, 2026-07-14

Type: task
Blocked by: None
Status: resolved

## Question

Once a pattern is open, there is no way back to a blank slate: [App.tsx](../../../app/src/App.tsx)'s "New Pattern" button + [NewPatternDialog](../../../app/src/components/NewPatternDialog.tsx) only render on the `!pattern` landing screen (`App.tsx:139-158`); the editor header (`App.tsx:160-174`) offers Resize, Export, and Import (which replaces the pattern via a file), but nothing that opens a fresh, blank pattern from within an existing session. A crafter who wants to abandon the current pattern and start over currently has no in-app path to do that.

Add a control (e.g. a "New Pattern" / restart button in the editor header) that reopens `NewPatternDialog` from within the editor and, on create, calls `newPattern(...)` the same way the landing screen does (`App.tsx:146-152`). Decide:

- Where the control lives in the header, relative to Resize/Export/Import
- Whether it warns before discarding the current pattern (autosave means nothing is lost from IndexedDB, but any pattern not yet exported to a `.crochet` file is only reachable by reopening the app before the next autosave overwrites it — confirm whether that's an acceptable loss model or whether a confirm step is warranted)
- Whether it should feel the same as Import's "replace current pattern" behavior or be visually distinct

## Acceptance criteria

- [x] A visible control in the editor header opens the New Pattern dialog without leaving the editor
- [x] Creating a pattern from it replaces the current pattern and autosaves immediately, consistent with `handleImportFile`'s save-immediately behavior (`App.tsx:124-133`)
- [x] Canceling the dialog leaves the current pattern untouched
- [x] Decision on confirm-before-discard is recorded and implemented (or explicitly decided against)

## Answer

Added a "New Pattern" button to the editor header (leftmost, before Resize/Export/Import) that calls `window.confirm('Start a new pattern? This will replace the current pattern.')` before opening the same `NewPatternDialog` used on the landing screen. Confirming opens the dialog; declining does nothing. Submitting the dialog replaces the pattern via the same `handleCreatePattern` handler used by the landing screen (extracted from the previous inline `onCreate`), which calls `newPattern(...)` and saves immediately, matching the import-replace behavior. Canceling the dialog leaves the current pattern untouched.

Went with `window.confirm` over a custom modal — it's a single yes/no gate on a destructive action, and the editor already relies on native browser affordances elsewhere (native `<input type="color">`, native file picker), so a native confirm is consistent and needed no new component.

## Comments

Implemented in [app/src/App.tsx](../../../app/src/App.tsx): extracted `handleCreatePattern` (shared by both the landing and editor `NewPatternDialog` instances) and added `handleRestartClick` (the confirm gate) plus the header button. `NewPatternDialog` itself is unchanged.

Tests added in [app/src/App.test.tsx](../../../app/src/App.test.tsx) (`describe('restarting from the editor')`, `window.confirm` mocked via `vi.spyOn`): confirms then replaces the pattern; declining the confirm leaves the dialog closed and the pattern untouched; canceling the reopened dialog leaves the pattern untouched. Full suite: 171/171 passing. `tsc --noEmit` clean.

Verified live in the browser: created a pattern, clicked the new header button, accepted the native confirm, filled in a new name, submitted, and the editor header updated to the new pattern name with a fresh default grid/palette.

Aside: `.claude/launch.json`'s `crochet-app` config gained `"autoPort": true` so the preview tooling can pick a free port when another session already holds 5173 — needed to get a working preview during this session, unrelated to the ticket itself but left in since it's a harmless dev-tooling fix.
