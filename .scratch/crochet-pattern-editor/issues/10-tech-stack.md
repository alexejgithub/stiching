# Choose tech stack & rendering approach

Type: grilling
Status: resolved

## Question

What tech stack and grid-rendering approach (e.g. HTML5 Canvas + vanilla JS/TypeScript vs. a framework like React with an SVG/DOM-based grid) should the editor use, weighed against: client-side only, free-hostable as static files, must handle a rectangular pixel grid efficiently, and needs to eventually support per-cell color + symbol rendering plus SVG export?

## Answer

- **Framework**: React + TypeScript, built with Vite — mature ecosystem for the form/dialog/list-heavy chrome (palette editor, New Pattern dialog, legend, import/export controls), builds to static files for free hosting.
- **Grid rendering**: plain SVG, one element per cell, managed outside React's render cycle. Crochet pixel patterns (corner-to-corner/tapestry/mosaic) are bounded in size (tens to a few hundred stitches per side), so DOM node count isn't expected to be a real performance problem. Using SVG for the live grid lets the editor and the self-contained SVG export ([Export/print contents](06-export-contents.md)) share the same rendering code instead of maintaining two drawing systems that must stay visually in sync. It also gives native DOM hit-testing per cell, which simplifies marquee-select and touch/stylus parity ([Touch/stylus input parity](07-touch-stylus-parity.md)) versus manually mapping pixel coordinates on a Canvas.
- **State management**: Zustand as an external store. Keeps state outside the component tree (a good fit since the grid itself is plain SVG, not JSX), and its non-React-bound store fits a command-log-style undo/redo better than plain `useState`/Context or the heavier ceremony of Redux Toolkit.

Rejected: Canvas grid rendering (would require a separate, parallel SVG-generation path for export); vanilla JS/TS with no framework (too much hand-rolled UI wiring for the chrome); Svelte/SolidJS (smaller ecosystem than React); plain React state or Redux Toolkit for state management (former unwieldy for a large grid + undo/redo, latter more ceremony than needed).
