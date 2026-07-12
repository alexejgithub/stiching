# Design the pattern data model

Type: grilling
Status: resolved

## Question

What's the concrete schema for a pattern — grid (rows x columns of cell references), palette (hex + label + symbol + reserved yarn-link field per [Palette model](01-palette-model.md)), and pattern metadata (name, dimensions, created/modified timestamps, schema version for future migration)? Needs to support the selection-based tool model ([Tool scope](03-tool-scope.md)), be serializable for [persistence](15-persistence-layer.md) and export, and be a stable-enough foundation that undo/redo, symbols, and export can build on it without redesign.

## Answer

```typescript
type SlotId = number; // minted from Pattern.nextSlotId, unique within the pattern, never reused

interface PaletteSlot {
  id: SlotId;
  hex: string;      // "#RRGGBB"
  label: string;     // user-given name, e.g. "Sky Blue"
  symbolId: string;  // key into the symbol library; assignment algorithm + override rules are ticket 14
  yarnLink: null;    // reserved per ticket 01 — always null in v1; future shape e.g. { catalog, sku }
}

type Cell = SlotId | null; // null = blank (unstitched)

interface Pattern {
  schemaVersion: 1;
  id: string;          // crypto.randomUUID() — storage key in browser storage, stable across renames
  name: string;
  rows: number;
  cols: number;
  grid: Cell[][];       // grid[row][col], row-major; grid.length === rows, grid[r].length === cols for all r
  palette: PaletteSlot[]; // array order is display/legend order
  nextSlotId: SlotId;   // counter for minting new slot ids; monotonically increasing, never decremented
  createdAt: string;    // ISO 8601
  modifiedAt: string;   // ISO 8601, bumped on every mutating action — feeds autosave staleness checks
}
```

Key decisions, made with the user:

- **Blank cells are representable.** A cell is either a slot reference or `null`. Required for non-rectangular motifs (e.g. a diamond) drawn inside the rectangular grid — common in corner-to-corner/mosaic crochet.
- **Cells reference slots by stable id, not array position.** See [ADR-0001](../../../docs/adr/0001-slot-id-references.md) — reordering or recoloring a palette slot never touches the grid.
- **Grid is a dense 2D array**, not a sparse map. Grids are bounded (tens to a few hundred stitches per side), so dense storage costs nothing real and keeps rendering, resize, and bounds-checking straightforward.
- **Deleting a slot while cells reference it is blocked** by the editor (recolor/clear first, or an explicit "clear cells using this color" confirmation as part of delete). Keeps the grid always consistent with the palette — no consumer (renderer, export, undo, persistence) needs to handle a dangling slot id.
- **Symbol assignment is persisted state** (`symbolId` on the slot), not derived from slot order at render time. Ticket 14 still designs the library and assignment algorithm, but this keeps a user override representable and keeps a slot's symbol stable across reordering/inserting other slots.
- **Selection is ephemeral**, not part of `Pattern` — it lives only in session/UI state (e.g. the Zustand store), never serialized. Reload or reopen starts with no selection.
- **Slot ids are a per-pattern incrementing counter** (`nextSlotId`), not UUIDs — small, human-readable in exported JSON, and sufficient since v1 never merges two patterns' palettes. The pattern's own top-level `id` *is* a UUID, since it must be globally unique as a browser-storage key.

New domain terms (**Pattern**, **Slot**, **Cell**, **Blank**) recorded in [CONTEXT.md](../../../CONTEXT.md).
