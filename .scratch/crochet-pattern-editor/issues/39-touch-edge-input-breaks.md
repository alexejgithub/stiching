# 39 — Touch input near the grid edge sometimes breaks

**Requested by:** user, 2026-07-14

Type: task
Blocked by: None
Status: ready-for-agent

## Question

User report: touching near the edge of the grid "sometimes breaks for some reason I can't see" — intermittent, no known repro steps yet, cause not diagnosed. Candidate areas to check in [PatternGrid.tsx](../../../app/src/components/PatternGrid.tsx): `handlePointerDown`'s gutter-vs-cell target check (comment at line 56-57 references pointer-down landing directly on a gutter), pointer-capture setup (`containerRef.current?.setPointerCapture`, line 68) and whether coordinate math clamps correctly for pointer positions right at or just outside the grid's bounding box, and interaction with `touch-action: none` / `user-select: none` (added in [ticket 34](34-drag-paint-selects-gutter-numbers.md)) near the row/column number gutters.

This is a diagnose-and-fix ticket, not a design decision — first reproduce reliably (try edge cells, corner cells, drags that start on or cross the gutter, on an actual touch device or touch emulation), identify the root cause, then fix it. If a reliable repro can't be found, narrow down what "breaks" means as precisely as possible (dropped drag? wrong cell targeted? stuck pointer capture? something else) and record that as the answer even if a fix isn't yet possible, so this can be re-opened with a sharper question.

## Acceptance criteria

- [ ] A reliable repro is found (device or emulation) for touch input breaking near the grid edge, or the investigation's findings are recorded precisely enough to act on later
- [ ] Root cause identified
- [ ] Fix implemented and verified on the repro case
- [ ] Regression coverage added (test or documented manual check) for touch/pointer interaction at grid edges and corners
