import { type FormEvent, useState } from 'react';
import { type ResizeEdges } from '../model/resize';
import { useEditorStore } from '../store/editorStore';

interface ResizeDialogProps {
  onClose: () => void;
}

const EDGE_FIELDS: Array<{ key: keyof ResizeEdges; label: string }> = [
  { key: 'top', label: 'Top' },
  { key: 'bottom', label: 'Bottom' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
];

// Two-step flow: the edge form calls previewResize (read-only) on submit. An
// out-of-bounds result shows an inline error and stays on the form. A result
// that would discard stitched cells switches to a confirmation step naming
// the exact count before applyResize actually commits anything; a Blank-only
// shrink (or any grow) applies immediately with no extra step.
export function ResizeDialog({ onClose }: ResizeDialogProps) {
  const previewResize = useEditorStore((s) => s.previewResize);
  const applyResize = useEditorStore((s) => s.applyResize);
  const [edges, setEdges] = useState<ResizeEdges>({ top: 0, bottom: 0, left: 0, right: 0 });
  const [error, setError] = useState<string | null>(null);
  const [pendingLossCount, setPendingLossCount] = useState<number | null>(null);

  function setEdge(key: keyof ResizeEdges, value: number) {
    setEdges((prev) => ({ ...prev, [key]: Number.isNaN(value) ? 0 : value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const preview = previewResize(edges);
    if (!preview || !preview.ok) {
      setError('The resulting rows and columns must each be between 1 and 500.');
      return;
    }
    setError(null);
    if (preview.lostStitchedCellCount > 0) {
      setPendingLossCount(preview.lostStitchedCellCount);
      return;
    }
    applyResize(edges);
    onClose();
  }

  function handleConfirmLoss() {
    applyResize(edges);
    onClose();
  }

  if (pendingLossCount !== null) {
    return (
      <div className="dialog-backdrop" role="presentation">
        <div className="dialog" role="dialog" aria-modal="true" aria-label="Confirm Resize">
          <h2>Confirm Resize</h2>
          <p role="alert">
            This will discard {pendingLossCount} stitched {pendingLossCount === 1 ? 'cell' : 'cells'}. This can't be
            undone once you close the pattern, though undo will work right after.
          </p>
          <div className="dialog-actions">
            <button type="button" onClick={() => setPendingLossCount(null)}>
              Back
            </button>
            <button type="button" onClick={handleConfirmLoss}>
              Discard and Resize
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <form className="dialog" role="dialog" aria-modal="true" aria-label="Resize Pattern" onSubmit={handleSubmit}>
        <h2>Resize Pattern</h2>
        {EDGE_FIELDS.map(({ key, label }) => (
          <label key={key}>
            {label}
            <input type="number" value={edges[key]} onChange={(e) => setEdge(key, e.target.valueAsNumber)} />
          </label>
        ))}
        {error && <p role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">Resize</button>
        </div>
      </form>
    </div>
  );
}
