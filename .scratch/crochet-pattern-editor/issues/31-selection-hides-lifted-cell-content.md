# 31 — Selecting a region blanks its colors instead of showing them floating

**Reported by:** user bug report, 2026-07-13

**Status:** ready-for-agent

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

- [ ] Marquee-selecting a region keeps every selected cell's color (and symbol) visible for the duration of the selection, not blanked
- [ ] The floating block's rendered content follows it through move/rotate/mirror/nudge before commit
- [ ] Committing the selection (tool switch, Enter, click-away, etc.) still stamps the block back into the grid correctly (no change to `commitFloatingSelection` logic — this is render-only)
- [ ] Select All exhibits the same fix (shares `liftRect`/overlay path)
