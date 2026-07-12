import { type FormEvent, useState } from 'react';
import { SYMBOLS } from '../model/symbols';
import { useEditorStore } from '../store/editorStore';

export function PaletteEditor() {
  const pattern = useEditorStore((s) => s.pattern);
  const addSlot = useEditorStore((s) => s.addSlot);
  const renameSlot = useEditorStore((s) => s.renameSlot);
  const recolorSlot = useEditorStore((s) => s.recolorSlot);
  const overrideSlotSymbol = useEditorStore((s) => s.overrideSlotSymbol);
  const reorderSlot = useEditorStore((s) => s.reorderSlot);
  const deleteSlot = useEditorStore((s) => s.deleteSlot);

  const [newHex, setNewHex] = useState('#ff0000');
  const [newLabel, setNewLabel] = useState('');
  const [blocked, setBlocked] = useState<{ slotId: number; cellCount: number } | null>(null);

  if (!pattern) return null;

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    addSlot(newHex, newLabel.trim() || 'Untitled');
    setNewLabel('');
  }

  function handleDelete(slotId: number) {
    const result = deleteSlot(slotId);
    if (result && !result.ok) {
      setBlocked({ slotId, cellCount: result.cellCount });
    } else {
      setBlocked(null);
    }
  }

  function handleClearAndDelete(slotId: number) {
    deleteSlot(slotId, { clearCells: true });
    setBlocked(null);
  }

  return (
    <section className="palette-editor">
      <h2>Palette</h2>
      <ul className="palette-list">
        {pattern.palette.map((slot, index) => (
          <li key={slot.id} className="palette-row">
            <div className="palette-row-fields">
              <input
                type="color"
                value={slot.hex}
                onChange={(e) => recolorSlot(slot.id, e.target.value)}
                aria-label={`Color for ${slot.label}`}
              />
              <input
                type="text"
                value={slot.label}
                onChange={(e) => renameSlot(slot.id, e.target.value)}
                aria-label={`Label for ${slot.label}`}
              />
              <span className="palette-symbol" aria-hidden="true">
                {SYMBOLS[slot.symbolId]}
              </span>
              <div className="reorder-buttons">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => reorderSlot(index, index - 1)}
                  aria-label={`Move ${slot.label} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === pattern.palette.length - 1}
                  onClick={() => reorderSlot(index, index + 1)}
                  aria-label={`Move ${slot.label} down`}
                >
                  ↓
                </button>
              </div>
              <button type="button" onClick={() => handleDelete(slot.id)}>
                Delete
              </button>
            </div>
            <div className="symbol-picker">
              {SYMBOLS.map((glyph, i) => (
                <button
                  key={i}
                  type="button"
                  className={i === slot.symbolId ? 'symbol-option selected' : 'symbol-option'}
                  onClick={() => overrideSlotSymbol(slot.id, i)}
                  aria-label={`Use symbol ${glyph} for ${slot.label}`}
                  aria-pressed={i === slot.symbolId}
                >
                  {glyph}
                </button>
              ))}
            </div>
            {blocked?.slotId === slot.id && (
              <p role="alert" className="palette-delete-blocked">
                {blocked.cellCount} cell{blocked.cellCount === 1 ? '' : 's'} still use this color.{' '}
                <button type="button" onClick={() => handleClearAndDelete(slot.id)}>
                  Clear cells and delete
                </button>
              </p>
            )}
          </li>
        ))}
      </ul>
      <form className="palette-add-form" onSubmit={handleAdd}>
        <input type="color" value={newHex} onChange={(e) => setNewHex(e.target.value)} aria-label="New slot color" />
        <input
          type="text"
          placeholder="Label"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          aria-label="New slot label"
        />
        <button type="submit">Add Color</button>
      </form>
    </section>
  );
}
