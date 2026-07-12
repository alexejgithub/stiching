# Crochet Pattern Editor — v1 Spec

Status: ready-for-agent

## Problem Statement

People who design their own corner-to-corner (C2C) / tapestry / mosaic crochet patterns currently plan them on graph paper or in general-purpose pixel-art tools that know nothing about how crochet charts are actually read and stitched. Graph paper can't be edited without erasing and redrawing; generic pixel editors don't number rows and columns the way a crochet chart needs (alternating sides to match the back-and-forth, boustrophedon reading direction), don't distinguish colors by anything but color itself (a problem in black-and-white printouts or for colorblind crafters), and produce no printable, self-contained sheet a person can crochet from with yarn in hand, away from the screen.

## Solution

A free, client-side, browser-based pixel-grid pattern editor purpose-built for crochet charts. A crafter creates a fixed-size grid, builds a freeform color palette as they go (each color automatically getting a distinct symbol for non-color disambiguation), and draws directly onto the grid. Aseprite-style selection tools (marquee-select, then rotate/move/mirror the selection) let them design one motif or quadrant and reuse it elsewhere instead of hand-drawing repetition. The grid displays crochet-convention alternating row numbering and static column numbering. Work autosaves continuously to the browser so nothing is lost on a refresh or crash, with explicit file export/import for backup or moving a pattern to another device. When the design is done, the same grid-rendering code produces a self-contained, paginated SVG for on-screen export or printing — grid, numbers, and a full color/symbol/label legend on every page — so the finished pattern is usable standalone at the yarn basket.

No backend, no accounts, no image-upload/auto-pixelation, and no real yarn-catalog linking in v1 — all explicit v2 candidates the data model deliberately leaves room for without requiring a migration.

## User Stories

1. As a crafter, I want to start a New Pattern by naming it and choosing rows x columns, so that I begin with a grid sized for my planned finished piece.
2. As a crafter, I want the New Pattern dialog to default to 20x20, so that I have a sane starting point without having to think about dimensions for a quick sketch.
3. As a crafter, I want rows/columns bounded to 1-500 per side, so that a typo (e.g. an extra zero) can't silently create an unusable, enormous grid.
4. As a crafter, I want a newly created Pattern to start fully blank, so that I build up the palette and design from nothing rather than inheriting leftover state.
5. As a crafter, I want to add a new color to my palette by picking a hex value and giving it a label, so that I can name my colors meaningfully (e.g. "Sky Blue") instead of tracking raw hex codes.
6. As a crafter, I want each palette Slot I add to automatically get a distinct symbol, so that I don't have to manually assign one every time.
7. As a crafter, I want to override a Slot's auto-assigned symbol with any of the other available symbols, so that I can pick a glyph that feels more intuitive to me even if it duplicates another Slot's symbol.
8. As a crafter with more than 14 colors in one pattern, I want symbol assignment to keep working (cycling back through the sequence) rather than erroring out, so that an unusually large palette doesn't block me from continuing to work.
9. As a crafter, I want to rename or recolor an existing palette Slot, so that I can correct or refine a color choice after I've already used it on the grid.
10. As a crafter, I want every Cell already painted with a Slot's color to update automatically when I recolor or rename that Slot, so that I only have to make the change in one place.
11. As a crafter, I want to be blocked from deleting a palette Slot that's still used by any Cell (with a clear reason and an option to clear those cells first), so that I never end up with a Cell pointing at a color that no longer exists.
12. As a crafter, I want to reorder my palette, so that the legend and color picker list my colors in whatever order makes sense to me (e.g. matching how I'll buy or wind the yarn).
13. As a crafter, I want reordering the palette to never change what color any existing Cell shows, so that palette housekeeping is safe to do at any time.
14. As a crafter, I want to click or drag across grid cells with an active color selected to paint them, so that drawing feels immediate, like coloring in graph paper.
15. As a crafter, I want to select "erase" (or the equivalent) and drag across cells to clear them back to blank, so that I can remove stitches I no longer want without repainting them a "background" color.
16. As a crafter, I want a single continuous paint drag (pointer down to pointer up) to become one undo step, so that undoing a stroke I just drew doesn't take dozens of presses to fully remove.
17. As a crafter, I want to drag out a rectangular marquee to select a region of cells, so that I can operate on a specific area of my design rather than the whole grid.
18. As a crafter, I want starting a new marquee drag to replace my current selection, so that the selection model stays simple and I never have to think about add/subtract modifiers.
19. As a crafter, I want "select all" to be available as the trivial case of the same marquee tool, so that whole-pattern transforms don't require a separate mode.
20. As a crafter, I want to rotate my current selection 90° clockwise or counter-clockwise, so that I can reuse a hand-drawn motif in a different orientation without redrawing it.
21. As a crafter, I want to flip my current selection horizontally or vertically as separate actions, so that I can mirror a motif to build a symmetric design (e.g. finishing a heart from one drawn half).
22. As a crafter, I want to reposition my current selection by dragging it, so that coarse repositioning feels natural, especially on a stylus or touchscreen.
23. As a crafter, I want to nudge my current selection by one cell at a time using the arrow keys, so that I can fine-tune its position precisely.
24. As a crafter, I want a rotate, mirror, or move that would push part of my selection outside the grid to be blocked or clamped rather than silently truncating cells, so that I never lose part of a hand-drawn motif without noticing.
25. As a crafter, I want my floating selection to commit back into the grid when I press Escape, start a new marquee, or switch tools, so that I don't have to remember an explicit "confirm" action every time.
26. As a crafter, I want column numbers to run consistently along the top of the grid, so that I always know which column I'm looking at regardless of row.
27. As a crafter, I want row numbers to alternate sides by parity (odd rows on the right, even rows on the left), so that the chart matches the traditional back-and-forth (boustrophedon) crochet reading convention I already know from other patterns.
28. As a crafter, I want to undo my last action with Ctrl+Z, so that I can recover quickly from a mistake.
29. As a crafter, I want to redo an undone action with Ctrl+Y (or equivalent), so that I can restore work I undid by accident.
30. As a crafter, I want undo/redo to cover palette edits (add/rename/recolor/delete) as well as grid and tool actions, so that I never hit a case where "undo doesn't apply here."
31. As a crafter, I want at least ~100 steps of undo history available, so that a long editing session gives me a meaningfully deep safety net.
32. As a crafter, I want undo/redo to only affect cell content and never restore or clear my current selection, so that undoing a paint stroke doesn't unexpectedly disturb what I have selected.
33. As a crafter, I want my in-progress pattern to save automatically to the browser as I work, so that an accidental tab close, refresh, or crash doesn't lose my progress.
34. As a crafter, I want autosave to happen shortly after I pause editing (not on every keystroke/cell), so that it doesn't interrupt or slow down active drawing.
35. As a crafter, I want an immediate save to also happen if I switch tabs or close the window mid-edit, so that even an abrupt exit right after an edit doesn't lose that edit.
36. As a crafter, I want reopening the app to resume exactly where I left off, so that the browser effectively acts as my ongoing workspace.
37. As a crafter, I want to export my current pattern to a file, so that I can back it up or move it to another device.
38. As a crafter, I want to import a previously exported pattern file, so that I can resume work on a different device or restore from a backup.
39. As a crafter, I want importing a file or starting a New Pattern to be understood as replacing my current in-progress work (with autosave reflecting that), so that the mental model of "one pattern open at a time" stays simple and predictable.
40. As a crafter, I want to resize my pattern after creation by specifying how many rows/columns to add or remove on each edge, so that I can extend or trim a design ("3 more rows") without starting over.
41. As a crafter, I want growing the grid to pad new space with blank cells at the edges only, so that my existing design is never reflowed or repositioned unexpectedly.
42. As a crafter, I want shrinking that only removes already-blank cells to apply immediately with no extra confirmation, so that trimming unused edge space doesn't get in my way.
43. As a crafter, I want shrinking that would discard stitched cells to show me a clear warning (e.g. how many stitched cells will be lost) before it happens, so that I can't lose real design work by mistake.
44. As a crafter, I want a resize to apply as a single undo step, so that undoing it doesn't require untangling multiple intermediate states.
45. As a crafter, I want to preview my pattern's paginated SVG export before finalizing it, so that I can see how many sheets it'll take and adjust before printing.
46. As a crafter, I want to control the physical cell size used for export/print, so that I can trade off pattern legibility against how many pages it spans.
47. As a crafter, I want each exported page to overlap its neighbors by one row/column, so that I can physically align and tape adjacent sheets together correctly.
48. As a crafter, I want every exported page to show which row/column range (in absolute pattern coordinates) it covers, so that I can figure out where each sheet belongs without guesswork.
49. As a crafter, I want every exported page to include a small thumbnail of the whole pattern with that page's region highlighted, so that I can quickly see where a given sheet fits into the overall design.
50. As a crafter, I want every exported page to carry the full color/symbol/label legend, so that any single sheet is usable on its own even away from the rest of the set.
51. As a crafter, I want the exported/printed grid to keep the same alternating row numbering and static column numbering as the on-screen editor, so that reading a printed chart works exactly like reading it on screen.
52. As a crafter working from a black-and-white printout, I want each color to be visually distinguishable by its symbol alone, so that I can still tell colors apart without relying on ink color.
53. As a crafter who is colorblind, I want the same per-color symbols to let me distinguish colors on screen, so that the editor is usable without relying on color perception.
54. As a crafter printing a pattern that fits on one page, I want that export to be a single plain SVG (not an unnecessary multi-file "set" of one), so that small patterns stay simple to handle.
55. As a crafter using a drawing tablet/stylus, I want every tool (draw, select, rotate, move, mirror) to work with full precision parity to a mouse, so that I can use my preferred input device without a degraded experience.
56. As a crafter briefly using a touchscreen with a bare finger, I want the app to remain usable and not break (no horizontal-scroll traps, no unusable layout), even if the interactions aren't finely tuned for finger input.

## Implementation Decisions

- **Domain model** (already recorded in `CONTEXT.md` and this effort's decisions): a **Pattern** is the top-level saved artifact — fixed `rows` x `cols`, a dense row-major `grid` of **Cell**s, and an ordered `palette` of **Slot**s. A Cell is either **Blank** (`null`) or a reference to a Slot. A Slot carries `id`, `hex`, `label`, `symbolId`, and a reserved `yarnLink` field (always `null` in v1, room for future real-yarn-catalog linking per the map's out-of-scope note).
- **Cells reference Slots by stable id, never by array position** (ADR-0001) — reordering, recoloring, or renaming a Slot never touches the grid; only deleting a still-referenced Slot is blocked.
- Slot ids are minted from a per-Pattern monotonically increasing `nextSlotId` counter, never reused and never decremented. The Pattern's own top-level `id` is a `crypto.randomUUID()`, since it doubles as the browser-storage key.
- Deleting a Slot that's still referenced by any Cell is blocked at the editor level; the user must recolor/clear those cells first (or accept an explicit "clear cells using this color" confirmation offered as part of delete).
- Selection is ephemeral UI/session state, never part of the persisted `Pattern` and never serialized — a reload or reopen always starts with nothing selected.
- **Tech stack**: React + TypeScript, built with Vite, for all UI chrome (New Pattern / resize dialogs, palette editor, legend, import/export controls, export preview). Builds to static files, no backend needed.
- **Grid rendering**: plain SVG, one element per cell, managed outside React's render cycle, shared between the live editor and the SVG export/print pipeline so the two can never visually drift apart. Given typical C2C/mosaic grid sizes (tens to a few hundred stitches per side), per-cell DOM nodes are not expected to be a performance concern.
- **State management**: Zustand as an external store, decoupled from React's component tree — a fit for both the non-JSX SVG grid and a command-log-style undo/redo.
- **Tool semantics**: rectangle-only marquee selection, replace-only (no add/subtract modifiers — a new drag always replaces the current selection). Move supports both drag and one-cell arrow-key nudging. Rotate is 90°-only, offered as two distinct actions (CW, CCW). Mirror is flip-horizontal and flip-vertical as two separate actions (no diagonal/transpose). Any rotate/mirror/move that would push part of the selection out of grid bounds is blocked or clamped to the nearest in-bounds position — cell content is never truncated/discarded silently. A selection-lift-transform-stamp interaction model (lift cells into a floating selection, transform it in place, stamp it back down) was validated in a throwaway prototype (`.scratch/crochet-pattern-editor/prototype-editor/`, pure logic in its `src/pattern.ts`) and holds for the full spec, including the clamp-not-truncate edge case with a 1×5 strip rotated near a grid edge.
- Floating selections commit back into the grid on Escape, on starting a new marquee, or on switching tools.
- **Numbering**: column numbers static along the top; row numbers alternate sides by parity (odd rows right, even rows left), on both the live editor grid and every exported/printed page, reflecting each page's absolute position in the full Pattern (not renumbered per page).
- **Undo/redo**: a single unified command log of invertible per-cell diffs (old value → new value per touched cell), not full-grid snapshots — cost scales with edit size, not grid size. Capped at a fixed depth (~100 steps); oldest entries drop once the cap is hit. In-memory only, cleared on reload — it is never persisted, and needs no schema/versioning of its own. A continuous paint drag (pointer down to up) coalesces into one command. Palette edits (add/rename/recolor/delete) share the same log as grid/tool actions — one stack, no exceptions. Undo/redo restores cell content only; it never touches selection state.
- **Symbol assignment**: a fixed, hand-picked, pre-ordered library of 14 distinct symbols (e.g. dot, cross, triangle, square, diamond, plus, asterisk, wave, ...). The Nth Slot ever minted in a Pattern gets the Nth symbol in the sequence — no runtime distinctiveness scoring. `symbolId` is persisted per-Slot state (not derived at render time), so a user override survives palette reordering. Overrides are unrestricted, including intentional duplicates across Slots. Past 14 colors, assignment cycles back to the start of the sequence with no warning; color remains the primary disambiguator once symbols repeat.
- **Persistence — storage mechanism**: IndexedDB (not localStorage), given grid JSON can reach the tens-to-low-hundreds of KB/MB range and IndexedDB is async with a generous quota versus localStorage's ~5-10MB synchronous cap.
- **Persistence — autosave trigger**: debounced ~1-2s after the last mutation (timer restarts per new change), plus an immediate flush on window blur/unload as a safety net.
- **Persistence — storage scope**: a single current-pattern slot/record in IndexedDB, overwritten by every autosave. No in-app multi-pattern library in v1 — starting a New Pattern or importing a file replaces the slot. Multi-pattern management is deferred to file export/import (already in scope) or a future v2 gallery, since it wouldn't require changing the `Pattern` schema.
- **Persistence — file format**: the raw `Pattern` object serialized as-is via `JSON.stringify`, no wrapper envelope (the Pattern's own `schemaVersion` field covers future forward-compat migration). File extension: `.crochet`.
- **New Pattern dialog**: asks for name + rows + columns only (no starting palette — palette is built in-editor after creation). Defaults to 20x20; enforces 1-500 bounds per side. New Pattern grids start fully blank.
- **Resize/crop-extend**: one dialog with a signed number field per edge (top/bottom/left/right); positive grows, negative shrinks; all four edges are applied together as a single committed action (one undo step). Growth only ever pads blank cells at the four edges — no mid-grid insertion, no reflow of existing content. The same 1-500-per-side bounds apply to the resulting dimensions. Shrinking that only removes already-blank cells applies immediately with no confirmation; shrinking that would discard any stitched cell requires a confirmation dialog naming the count of cells that will be lost. No live drag-handle resize preview in v1.
- **SVG export/print**: user picks a physical cell size (input or presets) at export/print time; the app computes and live-previews the resulting page count — a single-page result is just the case where everything fits, not a separate mode. Adjacent pages overlap by one shared row/column of cells so printed sheets can be physically aligned. Every page carries a header ("Page X of Y" plus its absolute row/column range), a small key-map thumbnail of the whole pattern with that page's region highlighted, and the complete color/symbol/label legend (a fixed strip below the grid, entries flowing left-to-right and wrapping as needed — the grid's cell size is never shrunk to fit the legend). A multi-page pattern exports as a set of individually self-contained page SVG files; a single-page pattern exports as one plain SVG. Export and print use the same generated artifact. The export/print renderer reuses the same per-cell SVG rendering code as the live editor grid (per the tech-stack decision) rather than a second parallel drawing path.
- **Touch/stylus**: implemented via the unified Pointer Events API (covers mouse, stylus, and touch through one code path) with `touch-action: none` on the grid surface, giving stylus input the same precision handling as mouse for every tool. Bare-finger touch is only required to not actively break (no horizontal-scroll traps, layout remains usable) — it is not tuned as a first-class input mode in v1.

## Testing Decisions

A good test here exercises observable behavior through one of the seams below — the resulting `Pattern`/store state, the bytes persisted or exported, or the structure of generated SVG — never internal call sequences, private store fields, or DOM structure of chrome components.

- **Seam 1 — store action API** (primary seam, covers the most behavior): all editing logic — draw/erase, marquee-select, rotate, mirror, move (drag and nudge), palette add/rename/recolor/delete/reorder, resize/crop-extend, undo/redo — is tested by dispatching actions against the Zustand store (or the pure pattern-transform functions it wraps, following the prototype's `src/pattern.ts` split of portable logic from the React shell) and asserting on the resulting `Pattern` state. No DOM, no React rendering required for this layer. This is the highest-value seam since nearly every user story above is, at its core, a state transition. Bounds-clamping, blocked deletes, undo-log coalescing/capping, and symbol-assignment/override/cycling are all naturally covered here.
- **Seam 2 — persistence module**: the save/load/export/import functions are tested against a fake/in-memory IndexedDB (e.g. `fake-indexeddb`) rather than mocking internal calls or driving the real browser UI — asserting that a saved-then-loaded or exported-then-imported `Pattern` round-trips byte-for-byte, that autosave debouncing/flush-on-blur triggers correctly, and that a single-slot store is correctly overwritten by New Pattern/import.
- **Seam 3 — SVG render/export module**: the shared cell-renderer and pagination logic are tested by asserting on the structure of generated SVG output (page count for a given cell size and grid size, presence/content of numbering text elements reflecting alternating parity and absolute position, one-row/col overlap between adjacent pages, presence of every palette Slot in the legend on every page) rather than pixel-level/visual output.
- **Prior art**: none yet in this repo — this is a new, currently-empty codebase (only the throwaway prototype exists so far). The prototype's separation of pure grid/transform logic (`src/pattern.ts`) from the React shell is the pattern to carry forward for Seam 1's testability.
- Touch/stylus parity (user stories 55-56) is deliberately **not** covered by these seams — Pointer Events unification is structural and was only prototype-validated, not hardware-tested. Recommend a manual real-device smoke pass early in implementation, as flagged in [ticket 18](issues/18-editor-prototype.md).

## Out of Scope

- Image upload + automatic pixelation/scaling of a photo into a pattern — its own future effort (v2 candidate), not part of this spec.
- Real yarn-catalog integration (e.g. linking a palette Slot to an actual buyable yarn SKU on lieblingsgarn.de or similar) — the palette Slot's reserved `yarnLink` field keeps this possible later without a data migration, but no catalog integration ships in v1.
- Backend, user accounts, or cross-device cloud sync — v1 is entirely client-side; moving a pattern between devices goes through manual file export/import.
- In-app multi-pattern library/gallery (browsing/managing several saved patterns from within the app) — v1 keeps a single current-pattern autosave slot; multiple patterns are managed as separate exported files.
- Freeform/lasso selection — marquee selection is rectangle-only in v1.
- Live drag-handle visual preview during resize/crop-extend.
- Finger-first touch optimization (gesture tuning, larger touch targets, mobile-specific layout) — v1 only requires bare-finger touch not to break.
- Diagonal/transpose mirroring.
- Sub-90°-increment rotation.

## Further Notes

- All prior open questions this effort identified have been resolved; the map's "Not yet specified" section is empty. Nothing here is deferred to spec-writing time — every ticket referenced above is `Status: resolved`.
- The throwaway prototype at [`prototype-editor/`](prototype-editor/) validated the core interaction model (draw, marquee lift/transform/stamp, rotate CW/CCW, mirror H/V, move by drag and nudge, bounds clamping) live in-browser, including the specific edge case of a 1×5 strip rotating near a grid boundary. It has no persistence, undo, palette editor, or export — those are new build, not adaptation of prototype code — but its `src/pattern.ts` split (portable transform logic separate from the React shell) is worth carrying forward directly into the real implementation's architecture, and is the basis for Seam 1 above.
- One residual gap carried forward rather than re-litigated: touch/stylus parity was only structurally validated (Pointer Events + `touch-action: none`), not checked against real stylus/touchscreen hardware. A real-device pass is recommended early in implementation.
- No git repository exists yet in this working directory. The prototype notes this as the reason it couldn't be moved to a throwaway branch per the `/prototype` skill's usual capture step.
