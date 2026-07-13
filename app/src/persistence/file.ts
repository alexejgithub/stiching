// Client-side .crochet file export/import (ticket 26). Per spec's
// "Persistence — file format" decision, the file contents are the raw
// `Pattern` object serialized as-is via `JSON.stringify` — no wrapper
// envelope, since `schemaVersion` already covers future migration.

import { type Cell, type Pattern, type Slot } from '../model/pattern';

// Shared with exportSvg.ts (SVG export/print file names) — one filesystem-
// safe-name rule for every downloadable artifact this app produces.
export function sanitizeFileName(name: string): string {
  const trimmed = name.trim().replace(/[\\/:*?"<>|]/g, '_');
  return trimmed.length > 0 ? trimmed : 'pattern';
}

export function patternFileName(pattern: Pattern): string {
  return `${sanitizeFileName(pattern.name)}.crochet`;
}

// Triggers a browser download of `pattern` as a `.crochet` file via a
// temporary object-URL anchor click — no server involved.
export function exportPattern(pattern: Pattern): void {
  const json = JSON.stringify(pattern);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = patternFileName(pattern);
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function isCell(value: unknown): value is Cell {
  return value === null || typeof value === 'number';
}

function isSlot(value: unknown): value is Slot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === 'number' &&
    typeof s.hex === 'string' &&
    typeof s.label === 'string' &&
    typeof s.symbolId === 'number' &&
    s.yarnLink === null
  );
}

// Shape-checks parsed JSON as a `Pattern` — enough to reject malformed or
// unrelated files, not a full deep schema validator.
function isPattern(value: unknown): value is Pattern {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return (
    p.schemaVersion === 1 &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.rows === 'number' &&
    typeof p.cols === 'number' &&
    Array.isArray(p.grid) &&
    p.grid.every((row) => Array.isArray(row) && row.every(isCell)) &&
    Array.isArray(p.palette) &&
    p.palette.every(isSlot) &&
    typeof p.nextSlotId === 'number'
  );
}

// Parses and validates a `.crochet` file's raw text as a `Pattern`. Throws
// with a message suitable for display on malformed JSON or JSON that isn't
// shaped like a Pattern.
export function parsePattern(text: string): Pattern {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!isPattern(data)) {
    throw new Error('That file does not contain a valid pattern.');
  }
  return data;
}

export async function importPattern(file: File): Promise<Pattern> {
  const text = await file.text();
  return parsePattern(text);
}
