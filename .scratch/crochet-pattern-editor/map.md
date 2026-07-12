# Crochet Pattern Editor (v1 spec)

Label: wayfinder:map

## Destination

A full v1 feature spec for a client-side, browser-based crochet pattern editor — hand-drawn pixel grid, freeform color palette (each entry carrying an auto-assigned symbol), editing tools (marquee select, rotate, move, mirror), alternating row/column numbering, undo/redo, browser-storage autosave plus file export/import, and a self-contained SVG export/print (grid + numbers + color/symbol legend). No backend, no image-upload/auto-pixelation — that's an explicit v2. The spec is written and agreed, ready to hand to implementation; this map does not produce code.

## Notes

- Domain: grid/pixel-based crochet patterns (corner-to-corner, tapestry/mosaic style) — not garment shaping or construction patterns.
- User wants a working app ASAP: keep v1 scope lean, resist gold-plating, don't let v2 candidates below creep back into v1 tickets.
- Consult `/domain-modeling` for the data-model ticket, `/grilling` as the default resolution mode, `/prototype` for the editor-feel ticket.
- v2 candidates already identified (do not re-litigate scope in these tickets, just keep the door open): image upload + auto-pixelation; real yarn-catalog linking (target site: lieblingsgarn.de, Bobbiny cord products); backend/accounts for cross-device cloud sync.

## Decisions so far

- [Palette model: freeform now, structured for future yarn linking](issues/01-palette-model.md) — hex + label per entry now; modeled as a named slot so a real-yarn-SKU field can be added later without migrating saved patterns.
- [Grid dimensions: fixed at creation, resizable after](issues/02-grid-dimensions.md) — a New Pattern dialog sets rows x columns; an explicit resize/crop-extend operation can change it later.
- [Tool scope: select/rotate/move/mirror act on a selection](issues/03-tool-scope.md) — marquee-select a region first; whole-pattern is just the select-all case.
- [Numbering convention: alternating by row parity](issues/04-numbering-convention.md) — column numbers static along the top; row numbers alternate sides (odd right, even left) to hint at boustrophedon reading direction.
- [Undo/redo is in scope for v1](issues/05-undo-redo-scope.md) — standard undo/redo stack for drawing and tool actions.
- [Export/print contents: grid + numbers + legend](issues/06-export-contents.md) — the exported/printed sheet is self-contained: grid, row/column numbers, and a color+symbol+label legend.
- [Touch/stylus input parity requirement](issues/07-touch-stylus-parity.md) — stylus must have full parity with mouse for every tool; bare-finger touch only needs to not break, not be fully tuned.
- [Persistence model: autosave + file export/import](issues/08-persistence-model.md) — continuous autosave to browser storage (e.g. IndexedDB) plus an explicit export/import file for moving a pattern between devices.
- [Cell representation: color + auto-assigned symbol](issues/09-cell-representation.md) — every palette entry gets a distinct symbol alongside its color, for black-and-white printing and colorblind accessibility.
- [Choose tech stack & rendering approach](issues/10-tech-stack.md) — React + TypeScript + Vite for app chrome, plain SVG (one element per cell) for the grid so the editor and export share rendering code, Zustand for state outside React's render cycle.
- [Design the pattern data model](issues/11-data-model.md) — `Pattern` = dense `Cell[row][col]` grid (`SlotId | null`) + `PaletteSlot[]` (id, hex, label, symbolId, reserved yarnLink) + metadata; cells reference slots by stable id (see [ADR-0001](../../docs/adr/0001-slot-id-references.md)), slot deletion is blocked while in use, selection is ephemeral and not persisted.
- [Define tool semantics in detail](issues/12-tool-semantics.md) — rectangle-only, replace-only marquee selection; move by drag or arrow-key nudge; rotate 90° CW/CCW only; mirror flips horizontal/vertical as separate actions; out-of-bounds transforms are blocked/clamped, never truncated.
- [Design undo/redo architecture](issues/13-undo-redo-architecture.md) — command log of invertible per-cell diffs, capped at ~100 steps, in-memory only (cleared on reload, not persisted); paint strokes coalesce into one step; palette edits share the same undo stack.
- [Design symbol-assignment system](issues/14-symbol-assignment.md) — 14 fixed hand-picked glyphs, assigned strictly in add-order from a pre-ordered sequence; user can override to any symbol (duplicates allowed); past 14 colors symbols cycle with no warning.
- [Design persistence layer implementation](issues/15-persistence-layer.md) — IndexedDB single-slot current-pattern autosave, debounced ~1-2s on mutation; export is the raw `Pattern` object as `.crochet` JSON, no envelope.
- [Design SVG export & print layout](issues/16-svg-export-print.md) — user-controlled cell size drives page count with live preview; pages overlap by one row/col with a header, key-map thumbnail, and full legend on every page; export and print are the same paginated SVG artifact.
- [Design new-pattern creation & resize/crop-extend UX](issues/17-new-pattern-resize-ux.md) — New Pattern dialog asks name + rows/cols (default 20x20, bounds 1-500); resize is a 4-field signed edge dialog (grow pads blank, shrink confirms only if stitched cells are lost), applied as one undo step.
- [Prototype the core editor interaction](issues/18-editor-prototype.md) — validated: draw, rectangle marquee-select (lift/float/stamp), rotate CW/CCW, mirror H/V, and move (drag + arrow-nudge) all feel right; clamp-not-truncate bounds handling confirmed working on a real edge case. Touch/stylus done structurally (Pointer Events) but not yet checked on real hardware.

## Not yet specified

## Out of scope

- Image upload + automatic pixelation/scaling — meaty enough to be its own effort; v1 ships the hand-drawn editor first. Deferred to a future v2 effort, not rejected.
- Real yarn-catalog integration (linking palette entries to actual buyable yarn, e.g. lieblingsgarn.de) — no clean data source for v1; the palette model (ticket 01) keeps the door open by not hard-coding raw colors.
- Backend, accounts, cross-device cloud sync — v1 is client-side only (autosave + file export covers moving between devices manually); a real sync backend is a future effort if it turns out to be needed.
