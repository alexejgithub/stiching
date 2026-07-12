# 28 — Touch/stylus real-device smoke pass

**What to build:** A manual verification pass on real touchscreen and stylus hardware confirming that the Pointer Events unification built into painting (ticket 21) and selection/transform (ticket 23) actually delivers stylus precision parity with a mouse, and that bare-finger touch remains usable (no horizontal-scroll traps, no broken layout) even though it isn't tuned as a first-class input mode in v1. This is a deliberately manual check, not an automated one — the spec's testing decisions explicitly exclude stylus/touch parity from the store/persistence/SVG seams since Pointer Events unification is structural and was only prototype-validated, not hardware-tested.

**Blocked by:** 21, 23

**Status:** ready-for-agent

- [ ] On a real stylus device: draw (paint/erase), marquee-select, rotate, flip, and move/nudge a selection all work with precision matching mouse behavior — no missed strokes, no pressure/hover artifacts breaking a drag
- [ ] On a real touchscreen with a bare finger: the app loads and is operable — no trapped horizontal scroll on the grid, no layout that becomes unusable
- [ ] Any parity or breakage issue found is filed as a follow-up ticket rather than silently accepted
- [ ] Findings (pass/fail per device/tool combination tested) are recorded back on this ticket before it's marked resolved
