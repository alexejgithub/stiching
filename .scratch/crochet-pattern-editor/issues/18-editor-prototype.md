# Prototype the core editor interaction

Type: prototype
Blocked by: 10, 12
Status: resolved

## Question

Build a throwaway prototype of the core drawing/editing loop (draw, marquee-select, rotate, move, mirror) on the chosen stack ([Choose tech stack & rendering approach](10-tech-stack.md)) using the tool semantics from [Define tool semantics in detail](12-tool-semantics.md), tested with both mouse and stylus input, to validate the interaction feels right before it's locked into the full spec.

## Answer

Built as a React + TS + Vite app with a plain-SVG grid and a Zustand store, at [prototype-editor/](prototype-editor/) (throwaway — no persistence, no undo, no palette editor, no export; a hardcoded 3-color palette on a 20×20 grid). Pure grid/transform logic lives in `src/pattern.ts` (lift/stamp/rotate/mirror/clampAnchor), separate from the React shell, per the prototype skill's "keep the logic portable" guidance.

Interaction model validated, driven live in-browser (mouse-equivalent pointer events) plus one HITL check where the user directly confirmed drag-to-move felt right and waved off further automated poking at it:

- **Draw**: paints the active palette slot (or erases) by pointer-drag over cells. Feels immediate and correct.
- **Rectangle marquee-select**: drag lifts the rect's cells into a floating selection (blanked underneath, shown with an orange bounding box); starting a new marquee commits whatever was floating first — replace-only, as specified, and it reads clearly on screen.
- **Rotate CW/CCW**: verified geometrically correct (a hand-drawn T-shape rotates to the right orientation each time). Dimension-swap + edge case verified: a 1×5 strip anchored one row from the bottom, rotated to 5×1, had its anchor clamped from row 18 to row 15 so all 5 cells survived — confirms the "clamp, never truncate" bounds rule actually holds, not just on paper.
- **Mirror H/V**: flips content in place; never a bounds concern since dimensions don't change.
- **Move**: both drag and arrow-key nudge (clamped) work and feel right — confirmed with the user live.
- **Commit**: Escape (or starting a new marquee, or switching tools) stamps the floating selection back into the grid.

**Verdict: the interaction model holds up.** Selection-lift-transform-stamp is a coherent mental model, rotate/mirror/move bounds handling behaves exactly as [Define tool semantics in detail](12-tool-semantics.md) specifies, and nothing here surfaced a reason to revise that ticket or [Design the pattern data model](11-data-model.md).

One residual gap, worth flagging rather than re-opening: touch/stylus was validated structurally (unified Pointer Events API + `touch-action: none`, the standard approach for this kind of parity) but not against real stylus/touchscreen hardware — this session only had a mouse-driven browser. Recommend a quick real-device pass early in implementation, but it doesn't block writing this into the spec.

No git repo exists in this working directory, so the prototype couldn't be moved to a throwaway branch per the skill's usual capture step — it stays at [prototype-editor/](prototype-editor/) as the primary source instead.
