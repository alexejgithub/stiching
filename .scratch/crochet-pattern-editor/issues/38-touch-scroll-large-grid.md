# 38 — Touch scrolling doesn't work when the grid is too big

**Requested by:** user, 2026-07-14

Type: task
Blocked by: None
Status: ready-for-agent

## Question

`.pattern-grid` sets `touch-action: none` unconditionally ([index.css:52](../../../app/src/index.css)), added in [ticket 21](21-paint-erase-tools.md) so a drag-to-paint stroke doesn't trigger the browser's own scroll/zoom gesture. That's correct for a grid that fits on screen, but once a pattern is larger than the viewport, `touch-action: none` also blocks the browser's native pan — there is no way to scroll to the rest of the grid with a finger at all. [Ticket 07](07-touch-stylus-parity.md) scoped bare-finger touch as "must not break," and an unscrollable oversized grid breaks that bar.

Decide and implement a way to reconcile "drag paints" with "I need to get to the rest of the grid": options include a two-finger pan gesture, a dedicated pan/scroll mode toggle in the toolbar, wrapping the grid in a scroll container and only suppressing `touch-action` on the active drawing surface, or something else. Whatever is chosen must not regress the drag-to-paint/select/move behavior established in tickets 21-23, and must keep stylus parity (per ticket 07) intact.

## Acceptance criteria

- [ ] A pattern larger than the viewport can be scrolled/panned via touch
- [ ] Drag-to-paint, marquee-select, and move-drag (tickets 21-23) still work via touch exactly as before
- [ ] Stylus input parity is unaffected
- [ ] Decision on the mechanism (gesture, mode toggle, scroll-container split, etc.) is recorded with rationale
