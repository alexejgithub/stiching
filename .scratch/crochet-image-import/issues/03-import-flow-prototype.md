# Prototype the Import Image flow

Type: prototype
Blocked by: None
Status: resolved

## Question

This is a "how should it look/behave" question, not a bug fix, so it needs a prototype rather than a direct implementation — same HITL pattern used in [ticket 18](../../crochet-pattern-editor/issues/18-editor-prototype.md), [ticket 35](../../crochet-pattern-editor/issues/35-visual-style-prototype.md), and [ticket 37](../../crochet-pattern-editor/issues/37-tablet-responsiveness-prototype.md) on the v1 map.

Build a throwaway prototype (per the `/prototype` skill) of the end-to-end Import Image flow and present concrete directions for a live decision:

- **Entry point**: where does "Import Image" live relative to the existing "New Pattern" flow (landing screen, toolbar, menu)?
- **Crop step**: drag handles constrained to the target rows × cols aspect ratio (per the map's destination — crop, not stretch or letterbox).
- **Controls layout**: how are the target-size (rows × cols, reusing [ticket 17](../../crochet-pattern-editor/issues/17-new-pattern-resize-ux.md)'s New Pattern bounds) and color-count (1–8 slider) controls laid out alongside a live-updating pixelated preview and palette swatches?
- **Commit step**: what does "Create Pattern" do — does it prompt for a name (own step, or reusing New Pattern's naming convention), then navigate straight into the editor?

Note the data-model side of "how the commit actually becomes a `Pattern`" is tracked separately in [Design palette/pattern data-model integration](04-data-model-integration.md) — this ticket is about the UI/interaction feel, not the underlying wiring.

## Answer

Built and ran three structurally different prototype variants (throwaway branch `prototype/ticket-03-import-flow`, commit `8f9ed92`), switchable live via `?variant=A|B|C`:

- **A — Modal wizard**: three steps (Crop → Preview & Colors → Name & Create) in a dialog styled like the existing `NewPatternDialog`.
- **B — Split-screen, all-live**: one wider two-pane dialog, crop on the left, preview/colors/name on the right, everything editable at once, no steps.
- **C — Fullscreen immersive**: no dialog — a dark fullscreen crop stage with a persistent docked side panel, closer to a dedicated photo-editor screen than the rest of the app's chrome.

**Decision: Variant A, the modal wizard.**

- **Entry point**: a new "Import Image" button, placed next to "New Pattern" — reachable from both the landing screen and the editor header (mirroring the existing `ImportControl`'s "reachable both places" convention), not folded into the New Pattern dialog itself.
- **Crop step**: its own first step, with rows/cols inputs above a drag-to-move, drag-corner-to-resize crop box constrained to the target aspect ratio — confirmed working (crop box resizes correctly, stays locked to aspect, clamped to image bounds).
- **Controls layout**: sequenced rather than all-at-once — crop first, then preview + color-count slider + palette swatches on their own step, then name last, each a full step in a small `NewPatternDialog`-style modal rather than a wide split-screen or fullscreen takeover.
- **Commit step**: "Name & Create" is its own final step (own prompt, not reusing the New Pattern dialog directly) with a "Create Pattern" button.

All three variants exercised end-to-end (file select → crop → live-quantized preview and palette → name) with no runtime errors; B and C were viable but not chosen.
