# 31 — Selecting a region blanks its colors instead of showing them floating

**Reported by:** user bug report, 2026-07-13

**Status:** resolved

**Blocked by:** 30 (fix that one first, or the floating block will also render without symbols)

## Symptom

Marquee-selecting a region (or Select All) makes every cell in the selection go blank/white — the stitched colors disappear — instead of staying visible while the selection floats/moves/transforms.

## Root cause

`endMarqueeDrag` (and `selectAll`) in [editorStore.ts](../../../app/src/store/editorStore.ts) call `liftRect` ([selection.ts](../../../app/src/model/selection.ts)), which — by design, so the block can be moved/rotated/mirrored independently — copies the rect's cells into `selection.block` and sets the corresponding `pattern.grid` cells to `null`:

```ts
// selection.ts liftRect
row.push(grid[r][c]);
grid[r][c] = null;
```

That part is correct and intentional (see `FloatingSelection`'s doc comment in `editorStore.ts`). The bug is downstream: `PatternGrid.tsx` passes only `selectionRect` (the bounding box) into `buildGridSVG`, and `gridRenderer.ts`'s `buildOverlayRect` draws nothing but a semi-transparent blue tint + stroke over that box — it never draws the actual lifted `block` cell contents (`selection.block`, from the store) on top of the overlay. So the now-blanked-in-`pattern.grid` cells render as plain white, and nothing replaces them visually — the selection overlay reads as "the colors vanished" rather than "the colors are now floating and can be moved."

## Fix

Render the floating selection's actual cell contents (color + symbol, once [ticket 30](30-cell-symbol-glyphs-missing.md) exists) inside the selection overlay, positioned at the selection's current `anchorRow`/`anchorCol`, instead of (or in addition to) the plain tint rect. `buildGridSVG`/`buildOverlayRect` will need the `block: Cell[][]` and a way to resolve each cell to its slot (pattern's palette), not just the bounding `Rect`, to draw this.

## Acceptance criteria

- [x] Marquee-selecting a region keeps every selected cell's color (and symbol) visible for the duration of the selection, not blanked
- [x] The floating block's rendered content follows it through move/rotate/mirror/nudge before commit
- [x] Committing the selection (tool switch, Enter, click-away, etc.) still stamps the block back into the grid correctly (no change to `commitFloatingSelection` logic — this is render-only)
- [x] Select All exhibits the same fix (shares `liftRect`/overlay path)

## Comments

Implemented in [app/src/render/gridRenderer.ts](../../../app/src/render/gridRenderer.ts): `GridRenderOptions.selectionRect: Rect | null` is replaced with `selection?: FloatingSelectionBlock | null` (`{ anchorRow, anchorCol, block: Cell[][] }`), and a new `buildSelectionOverlay` draws — in z-order — a background tint over the full selection bounds (so blank cells within the block still read as "selected"), then each block cell's actual lifted color plus its ticket-30 symbol glyph (via the existing `buildCellSymbol` helper) at its current anchored position, then a border stroke on top. [app/src/components/PatternGrid.tsx](../../../app/src/components/PatternGrid.tsx) now passes the store's `selection` object straight into `buildGridSVG` instead of first collapsing it to a bounding `Rect` via `blockRect`.

No changes to `commitFloatingSelection`, `liftRect`, `stampBlock`, or any transform logic in `editorStore.ts`/`selection.ts` — confirmed via `git diff` showing those files untouched. `selectAll` and `endMarqueeDrag` both set the same `selection` store field, so they share this one render path with no divergence. Since `buildSelectionOverlay` recomputes `blockRect(anchorRow, anchorCol, block)` fresh from current state on every render, move/rotate/mirror/nudge all flow through correctly before commit.

Verified live in-browser (worktree's own dev server, not the shared one — see below): painted a 2x2 red block, marquee-selected it, confirmed the underlying `pattern.grid` cells were blanked (as `liftRect` intends) while the selection overlay showed the actual red cells + `●` glyphs floating at the correct position; rotated the selection and confirmed it kept rendering; switched tools to commit and confirmed the grid was correctly re-stamped with the original colors and the overlay disappeared. (Note: this repo's shared dev-server launch config resolves to the main worktree's `app/` rather than this worktree's, so verification used a manually started `vite --port 5199` inside this worktree's `app/` directory.)

Added 5 new cases to `gridRenderer.test.ts` under a `selection overlay (ticket 31)` block: floating block colors render at the anchored position (not the blanked grid), symbol glyphs render alongside, the overlay is fully omitted with no selection, tint/border cover the full bounds including blank cells within the block, and the block follows a moved anchor. Also extracted a small `rectPixels`/`setRectPixels` helper pair (post-code-review) so the tint/border/marquee-preview rects share one bounds-to-pixels conversion instead of three copies of the same arithmetic.

`npm run typecheck` and `npm test` (152 tests) pass. Commit: `5e6ddc3`.
