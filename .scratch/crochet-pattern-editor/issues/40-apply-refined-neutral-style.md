# 40 — Apply the Refined Neutral visual style to the real app

**Requested by:** user, 2026-07-14 (decided live during [ticket 35](35-visual-style-prototype.md))

**Status:** resolved

## What to build

[Ticket 35](35-visual-style-prototype.md) prototyped three visual style directions and the user picked **Direction A — Refined Neutral** live in the running app. Fold that direction into `index.css` for real: whites/grays, one deep-violet accent (`#5b2fd4` / dark-mode `#a67bff`-ish), tight density, small radius (~5px), subtle shadows on dialogs/palette rows, `-apple-system`/`Segoe UI` type. This is a genuine (small) styling change to `app/src/index.css` and the previously-unstyled `.dialog`/`.dialog-backdrop`/`.editor-header`/`.landing` classes — not a copy of the prototype's throwaway code, which stays on the `prototype/ticket-35-visual-style` branch and is not merged.

## Scope

- `.dialog`, `.dialog-backdrop`, `.editor-header`, `.landing` currently have **no CSS at all** (browser defaults only) — this ticket is what actually gives them real layout/styling, not just a recolor.
- Respect the existing light/dark `prefers-color-scheme` split in `index.css` — pick dark-mode equivalents for the refined-neutral palette, don't just keep the current dark values unchanged.
- Reuse the existing `--text`/`--bg`/--border`/`--panel-bg`/`--accent` custom properties rather than introducing a parallel set — same mechanism the prototype used, minus the `[data-style]` scoping (this is the only style now, not a switchable option).
- Do not touch `gridRenderer.ts`/`exportRenderer.ts` — the grid's cell stroke/fill stay exactly as they are today (Direction A didn't change grid line weight or color, only chrome around it).
- Reference for exact values: `visualStyleThemes.prototype.css`'s `:root[data-style='A']` block and its accompanying rules, on branch `prototype/ticket-35-visual-style` (commit `c6d07ab`) — a starting point to adapt, not to copy-paste wholesale (drop the `[data-style]` scoping, fold into `index.css` directly).

## Acceptance criteria

- [x] `index.css` reflects Direction A's palette/density/radius/shadow choices in both light and dark mode
- [x] `.dialog`/`.dialog-backdrop` (New Pattern, Resize, Export) render as a real centered modal with backdrop, not unstyled stacked content
- [x] `.editor-header`/`.landing` have real layout (the landing screen in particular currently has zero styling)
- [x] Existing `@media print` export/print behavior (index.css) is unaffected — verify a print preview still matches the exported SVG
- [x] Full test suite and typecheck pass; no visual regression in existing screenshots/tests that assert on class names or DOM structure

## Answer

Folded Direction A into `app/src/index.css` directly (no `[data-style]` scoping — this is now the only style): whites/grays (`--text: #1a1a1e`, `--bg: #ffffff`, `--border: #dcdce0`, `--panel-bg: #f6f6f8`), a single deep-violet `--accent: #5b2fd4`, a new `--radius: 5px` (plus a derived `--radius-sm` for small controls), and new `--shadow-dialog`/`--shadow-row`/`--shadow-focus`/`--accent-soft` tokens for the subtle dialog/palette-row shadows and selection rings — all reusing the existing custom-property mechanism rather than a parallel one. Dark mode got a genuine re-derivation, not the old baseline values left in place: `--text: #f0f0f3`, `--bg: #121214`, `--border: #38383f`, `--panel-bg: #1c1c20`, with `--accent: #a67bff` as specified.

`.landing`, `.editor`, `.editor-header`, `.dialog`, `.dialog-backdrop`, and `.dialog input`/`.dialog label`/`.dialog-actions` all went from zero CSS to real layout (adapted from the prototype's shared base-structure block, minus the `data-style` scoping). `.toolbar-option`/`.palette-row`/`.symbol-option`/`.export-preset` picked up the new radius/shadow tokens for consistency. `gridRenderer.ts`/`exportRenderer.ts` and the `@media print` block were not touched — verified via the Export/Print dialog's on-screen preview, which still renders the same white-page SVG output regardless of app theme.

Verified in the running app (light and dark, `prefers-color-scheme`) via the Browser pane: editor header, toolbar, palette rows, and the New Pattern/Export dialogs all render with the new palette, density, radius, and shadows. Full test suite (171 tests) and typecheck pass.
