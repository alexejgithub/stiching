// Fixed, hand-picked, pre-ordered library of 14 visually distinct symbol
// glyphs. The Nth Slot ever minted in a Pattern gets SYMBOLS[(N-1) % SYMBOLS.length]
// (spec.md, "Symbol assignment").
export const SYMBOLS: readonly string[] = [
  '●',
  '✕',
  '▲',
  '■',
  '◆',
  '✚',
  '✳',
  '≈',
  '★',
  '▼',
  '◐',
  '☰',
  '✦',
  '◎',
];
