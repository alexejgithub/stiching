import type { PaletteSlot } from "./pattern";

// Hardcoded stand-in for the real palette editor — this prototype is about
// tool feel, not palette management.
export const PALETTE: PaletteSlot[] = [
  { id: 1, hex: "#2980b9", label: "Sky Blue", symbol: "●" },
  { id: 2, hex: "#c0392b", label: "Cherry Red", symbol: "▲" },
  { id: 3, hex: "#27ae60", label: "Meadow Green", symbol: "✕" },
];
