# 34 — Painting/dragging text-selects the row/column numbers

**Reported by:** user bug report, 2026-07-13

**Status:** resolved

## Symptom

While drawing (click-drag to paint/erase a stroke), the row/column number labels outside the grid get highlighted as if the browser is text-selecting them — the numbers stay visually "selected" throughout and after the drag.

## Root cause

Painting is a native pointer drag (`handlePointerDown`/`handlePointerMove` in [PatternGrid.tsx](../../../app/src/components/PatternGrid.tsx)) over an SVG that includes real `<text>` nodes for the row/column numbers ([gridRenderer.ts](../../../app/src/render/gridRenderer.ts)'s `buildColumnNumbers`/`buildRowNumbers`). Nothing suppresses the browser's default drag-to-select-text behavior on those nodes:

- `.pattern-grid` in [index.css](../../../app/src/index.css) only sets `touch-action: none` (for touch/stylus parity, [ticket 07](07-touch-stylus-parity.md)) — there's no `user-select: none` anywhere in the stylesheet.
- `handlePointerDown` in `PatternGrid.tsx` sets pointer capture for the paint/select/move-drag logic but never calls `e.preventDefault()`, so the browser's own text-selection drag gesture still starts alongside the app's own drag handling.

A paint stroke is exactly a mouse-down-and-drag motion, which is also the browser's native "select this text" gesture — since the gutter number text sits directly adjacent to (and the pointer often crosses over) the grid during a stroke, the browser selects it.

## Fix

Add `user-select: none` (and `-webkit-user-select: none` for Safari) to `.pattern-grid` so no descendant text is selectable during a drag, and/or call `e.preventDefault()` in `handlePointerDown` for the `draw`/`select` tool branches to stop the native selection gesture from starting at all. Prefer both — the CSS covers text selection broadly (including e.g. a stray drag that starts slightly outside the grid), the `preventDefault()` stops the gesture at the source.

## Acceptance criteria

- [x] Click-dragging a paint stroke across the grid (including drags that cross over the row/column number gutters) never highlights/selects any text
- [x] Marquee-select and selection-move drags are equally unaffected (same pointer-down path, same fix)
- [x] Normal text selection elsewhere in the app (palette labels, dialogs, etc.) is untouched — the `user-select: none` is scoped to `.pattern-grid` only

## Comments

Fixed with both `e.preventDefault()` in `handlePointerDown` (draw/select branches, PatternGrid.tsx) and `user-select: none` / `-webkit-user-select: none` scoped to `.pattern-grid` (index.css), per the "prefer both" recommendation. Added `PatternGrid.test.tsx` covering paint/marquee/move-drag branches and the non-drag-tool no-op case. Verified manually in the running app: a drag starting in a cell and crossing the column-number gutter produces no `window.getSelection()` text and no visible highlight. Full suite (168 tests) and typecheck pass.
