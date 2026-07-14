# 37 — Prototype a tablet-responsive layout

**Requested by:** user, 2026-07-14

Type: prototype
Blocked by: None
Status: ready-for-agent

## Question

The app has no responsive layout at all today — [index.css](../../../app/src/index.css) has an `@media (prefers-color-scheme: dark)` block and an `@media print` block, but nothing keyed to viewport width. The editor body is a fixed row of grid + palette editor (`App.tsx:176-179`, `.editor-body`), and the header packs a title plus four buttons in one line (`App.tsx:162-174`). On a tablet this reads as bad — cramped chrome, no layout adaptation, controls sized for a mouse pointer rather than a finger. This is a "how should it look/behave" question, not a bug fix, so it needs a prototype rather than a direct implementation.

Build a **throwaway prototype** (per the `/prototype` skill) of a tablet-sized layout (~768-1024px viewport, portrait and landscape) covering at minimum: the editor header/toolbar and the grid + palette editor body. Explore layout restructuring (stacking vs. side-by-side, collapsible/drawer palette, larger touch targets in the toolbar) rather than just shrinking the desktop layout. Present options to the user for a live decision, per the HITL pattern used in [ticket 18](18-editor-prototype.md) and [ticket 35](35-visual-style-prototype.md).

Note this ticket is about layout/chrome responsiveness specifically — the touch interaction bugs (scrolling, edge touch) are tracked separately in [ticket 38](38-touch-scroll-large-grid.md) and [ticket 39](39-touch-edge-input-breaks.md); a layout fix here shouldn't be expected to resolve those.

## Acceptance criteria

- [ ] At least one concrete tablet layout direction is built as a static or lightly-interactive mockup, viewable at real tablet viewport sizes
- [ ] Covers header/toolbar and grid+palette body, not just the grid
- [ ] Presented to the user for a live decision
- [ ] Chosen direction (or hybrid) recorded under an `## Answer` heading, with a pointer to the prototype artifact/commit
- [ ] A follow-up implementation ticket is filed to apply the chosen layout to the real app
