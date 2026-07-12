import { useEditorStore } from '../store/editorStore';

// Picks the active paint color (a palette Slot) or the eraser. Only
// meaningful once a pattern is open — callers should gate on that.
export function Toolbar() {
  const pattern = useEditorStore((s) => s.pattern);
  const activeSlotId = useEditorStore((s) => s.activeSlotId);
  const setActiveSlot = useEditorStore((s) => s.setActiveSlot);

  if (!pattern) return null;

  return (
    <div className="toolbar" role="toolbar" aria-label="Paint color">
      <button
        type="button"
        className={activeSlotId === null ? 'toolbar-option toolbar-eraser selected' : 'toolbar-option toolbar-eraser'}
        aria-pressed={activeSlotId === null}
        onClick={() => setActiveSlot(null)}
      >
        Eraser
      </button>
      {pattern.palette.map((slot) => (
        <button
          key={slot.id}
          type="button"
          className={activeSlotId === slot.id ? 'toolbar-option selected' : 'toolbar-option'}
          style={{ backgroundColor: slot.hex }}
          aria-pressed={activeSlotId === slot.id}
          aria-label={`Paint with ${slot.label}`}
          title={slot.label}
          onClick={() => setActiveSlot(slot.id)}
        />
      ))}
    </div>
  );
}
