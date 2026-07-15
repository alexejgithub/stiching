import { useEditorStore } from '../store/editorStore';

// Picks the active paint color (a palette Slot) or the eraser, and (ticket
// 23) switches into the select tool and drives its rotate/mirror actions.
// Only meaningful once a pattern is open — callers should gate on that.
export function Toolbar() {
  const pattern = useEditorStore((s) => s.pattern);
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const activeSlotId = useEditorStore((s) => s.activeSlotId);
  const setActiveSlot = useEditorStore((s) => s.setActiveSlot);
  const canUndo = useEditorStore((s) => s.canUndo);
  const canRedo = useEditorStore((s) => s.canRedo);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const selection = useEditorStore((s) => s.selection);
  const selectAll = useEditorStore((s) => s.selectAll);
  const rotateSelection = useEditorStore((s) => s.rotateSelection);
  const mirrorSelection = useEditorStore((s) => s.mirrorSelection);

  if (!pattern) return null;

  return (
    <div className="toolbar" role="toolbar" aria-label="Paint color">
      <button type="button" disabled={!canUndo} onClick={undo} aria-label="Undo">
        Undo
      </button>
      <button type="button" disabled={!canRedo} onClick={redo} aria-label="Redo">
        Redo
      </button>
      <button
        type="button"
        aria-pressed={tool === 'select'}
        aria-label="Select tool"
        onClick={() => setTool(tool === 'select' ? 'draw' : 'select')}
      >
        Select
      </button>
      {/* Ticket 38: lets touch scroll a pattern larger than the viewport —
          drag-to-paint/select/move all claim the same single-finger drag
          gesture the browser would otherwise use to pan, so panning needs an
          explicit mode rather than a gesture that could collide with them. */}
      <button
        type="button"
        aria-pressed={tool === 'pan'}
        aria-label="Pan tool"
        onClick={() => setTool(tool === 'pan' ? 'draw' : 'pan')}
      >
        Pan
      </button>
      <button type="button" disabled={tool !== 'select'} onClick={selectAll} aria-label="Select all">
        Select All
      </button>
      <button
        type="button"
        disabled={!selection}
        onClick={() => rotateSelection('cw')}
        aria-label="Rotate selection clockwise"
      >
        Rotate CW
      </button>
      <button
        type="button"
        disabled={!selection}
        onClick={() => rotateSelection('ccw')}
        aria-label="Rotate selection counter-clockwise"
      >
        Rotate CCW
      </button>
      <button type="button" disabled={!selection} onClick={() => mirrorSelection('h')} aria-label="Flip selection horizontally">
        Flip H
      </button>
      <button type="button" disabled={!selection} onClick={() => mirrorSelection('v')} aria-label="Flip selection vertically">
        Flip V
      </button>
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
