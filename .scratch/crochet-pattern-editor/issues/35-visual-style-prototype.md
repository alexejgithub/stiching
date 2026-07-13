# 35 — Prototype visual style directions for the editor

**Requested by:** user, 2026-07-13

Type: prototype
Blocked by: None
Status: ready-for-agent

## Question

The app currently uses one plain, unstyled-feeling look (`index.css`'s single `--accent: #7b3bff` on neutral grays, per [ticket 10](10-tech-stack.md)'s tech choices) — functional, but never a deliberate visual-design pass. Now that the full v1 feature set is built (New Pattern dialog, toolbar, palette editor, pattern grid w/ alternating numbering, marquee selection, resize dialog, export/print preview — tickets 19–28, plus the bug/polish work in 29–34), which visual style should the app actually ship with?

Build a **throwaway prototype** (per the `/prototype` skill — not a real implementation, no need to wire up all interaction logic) exploring **3 distinct style directions** applied to the current feature set, so the user can compare them side by side and pick one (or call out pieces of each to combine) before any real styling work is committed. Cover at minimum: the main editor screen (toolbar + palette editor + pattern grid with numbers), and one dialog (New Pattern or Export) so each direction is judged on more than just the grid.

Proposed 3 directions (starting point — the prototype can adjust these, but they should stay meaningfully distinct from each other, not 3 minor accent-color swaps):

1. **Refined neutral/utilitarian** — polish of the current baseline: clean grays/whites, a single accent color, tight information density, minimal chrome. Optimizes for long focused editing sessions over personality.
2. **Warm craft-inspired** — leans into the fact this is a *yarn craft* tool: warmer/cream tones, softer rounded shapes, a yarn/fiber-inspired accent palette (e.g. terracotta, sage, mustard), touches that feel hand-made rather than generic-SaaS.
3. **High-contrast graph-paper/print-aligned** — leans into the fact this is fundamentally a chart-reading tool: bold grid lines, strong black/white contrast with one functional accent, styled to visually resemble the printed/exported chart as closely as possible so switching between screen and printout feels seamless.

## Acceptance criteria (to close this ticket)

- [ ] All 3 directions are built as static or lightly-interactive mockups covering the same screens, viewable side by side
- [ ] Each direction is applied consistently (not just the grid — toolbar, palette editor, and at least one dialog too)
- [ ] Presented to the user for a live decision (per the `/prototype` skill's HITL-check pattern used in [ticket 18](18-editor-prototype.md))
- [ ] The chosen direction (or hybrid) is recorded under an `## Answer` heading on this ticket, with a pointer to the prototype artifact/commit
- [ ] A follow-up implementation ticket is filed to actually apply the chosen style to the real app (this ticket itself stays throwaway, per prototype convention)
