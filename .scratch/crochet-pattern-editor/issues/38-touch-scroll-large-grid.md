# 38 — Touch scrolling doesn't work when the grid is too big

**Requested by:** user, 2026-07-14

Type: task
Blocked by: None
Status: resolved

## Question

`.pattern-grid` sets `touch-action: none` unconditionally ([index.css:52](../../../app/src/index.css)), added in [ticket 21](21-paint-erase-tools.md) so a drag-to-paint stroke doesn't trigger the browser's own scroll/zoom gesture. That's correct for a grid that fits on screen, but once a pattern is larger than the viewport, `touch-action: none` also blocks the browser's native pan — there is no way to scroll to the rest of the grid with a finger at all. [Ticket 07](07-touch-stylus-parity.md) scoped bare-finger touch as "must not break," and an unscrollable oversized grid breaks that bar.

Decide and implement a way to reconcile "drag paints" with "I need to get to the rest of the grid": options include a two-finger pan gesture, a dedicated pan/scroll mode toggle in the toolbar, wrapping the grid in a scroll container and only suppressing `touch-action` on the active drawing surface, or something else. Whatever is chosen must not regress the drag-to-paint/select/move behavior established in tickets 21-23, and must keep stylus parity (per ticket 07) intact.

## Acceptance criteria

- [x] A pattern larger than the viewport can be scrolled/panned via touch
- [x] Drag-to-paint, marquee-select, and move-drag (tickets 21-23) still work via touch exactly as before
- [x] Stylus input parity is unaffected
- [x] Decision on the mechanism (gesture, mode toggle, scroll-container split, etc.) is recorded with rationale

## Answer

Chose a **dedicated Pan tool toggle in the toolbar** — a third `Tool` value (`'draw' | 'select' | 'pan'`, [editorStore.ts](../../../app/src/store/editorStore.ts)) alongside a small CSS split, over the two-finger-gesture or scroll-container options:

- A two-finger pan/pinch gesture is the "graphics app" convention, but `touch-action: none` blocks *all* native touch handling on the element regardless of finger count, so it would need a hand-rolled multi-touch pointer-tracking implementation — real complexity for a "must not break" bar (ticket 07), not a "must be great" one.
- A scroll-container split (wrap the grid, suppress `touch-action` only on an inner "drawing surface") doesn't actually resolve the conflict: the drawing surface *is* the whole grid, so there's no separate region to leave scrollable. The page already scrolls the grid natively (no `overflow` constraints anywhere in the layout) — the only thing stopping it is `touch-action: none` being unconditional.
- A mode toggle sidesteps both problems and fits the codebase's existing shape: `PatternGrid.tsx`'s `handlePointerDown` already early-returns for any tool other than `draw`/`select` (a guard ticket 34 added as "defense-in-depth for any future tool that shouldn't start a drag" — this ticket is that future tool). Making Pan a real `Tool` means that guard, plus the existing `setTool` undo-commit-on-switch logic, apply for free.

Implementation: `.pattern-grid` gets a `data-tool` attribute mirroring the active tool ([PatternGrid.tsx](../../../app/src/components/PatternGrid.tsx)); `index.css` keeps `touch-action: none` as the default (draw/select) and adds `.pattern-grid[data-tool='pan'] { touch-action: auto; cursor: grab; }`. Selecting Pan hands single- and two-finger touch gestures back to the browser's native scroll/pinch-zoom; pointer-down inside Pan mode already no-ops via the existing guard, so nothing double-handles the gesture or accidentally paints/selects while panning. Switching tools is a single click/tap, so it doesn't collide with any existing drag gesture, and reverting to Draw or Select restores `touch-action: none` and prior drag behavior exactly as before — draw/select code paths are untouched by this change.

Stylus is unaffected: it only ever exercises the draw/select code paths (mouse-equivalent precision per ticket 07), which are unchanged.

Verified in the running app (Browser pane): toggling Pan flips `data-tool`/`touch-action`/cursor and stops pointer-down from painting or preventing default; toggling back to Draw restores painting (`fill` change confirmed on a real cell) and `defaultPrevented: true`. Full test suite (173 tests) and typecheck pass. Commit: see git log.
