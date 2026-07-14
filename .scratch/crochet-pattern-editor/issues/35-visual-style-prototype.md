# 35 — Prototype visual style directions for the editor

**Requested by:** user, 2026-07-13

Type: prototype
Blocked by: None
Status: resolved

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
- [x] The chosen direction (or hybrid) is recorded under an `## Answer` heading on this ticket, with a pointer to the prototype artifact/commit
- [x] A follow-up implementation ticket is filed to actually apply the chosen style to the real app (this ticket itself stays throwaway, per prototype convention)

## Answer

Built as a throwaway `?variant=A|B|C` CSS-only prototype layered over the existing app shell (per the `/prototype` skill's sub-shape A — same route, same components, only the rendering swaps), covering the toolbar, palette editor, live grid, and the Export/Print dialog (all three dialogs share the same `.dialog`/`.dialog-backdrop` classes, so New Pattern and Resize picked up the same treatment for free). A floating bottom-bar (`PrototypeStyleSwitcher`) let the user cycle A/B/C live via `?variant=` or arrow keys.

Unlike the skill's usual "variants must differ structurally" guidance, all three variants intentionally share the exact same DOM — the question here was specifically about *visual style* (color, shape, materiality, type), not layout, so a shared-structure/swapped-theme approach was the better fit and still produced three meaningfully distinct directions (pill/circular warm chrome vs. sharp brutalist mono vs. tightened neutral baseline).

**Chosen: Direction A — Refined Neutral**, picked live by the user after viewing all three side by side in the running app (whites/grays, single deep-violet accent, tight density, subtle shadows/radius — a polish pass on the existing baseline rather than a departure from it).

Full prototype (all 3 directions + switcher) captured on local throwaway branch `prototype/ticket-35-visual-style` (commit `c6d07ab`, not pushed) — built via `git worktree` so it never touched the main tree's in-progress work. Run it with `git checkout prototype/ticket-35-visual-style && npm run dev --prefix app`, then visit `/?variant=A` (or B/C), or use the floating switcher's arrows. Not merged to main; this ticket and that branch stay the throwaway record. Follow-up: [40 — Apply the Refined Neutral visual style to the real app](40-apply-refined-neutral-style.md).
