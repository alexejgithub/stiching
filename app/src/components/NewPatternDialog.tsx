import { type FormEvent, useState } from 'react';
import { DEFAULT_DIMENSION, MAX_DIMENSION, MIN_DIMENSION, isValidDimension } from '../model/pattern';

interface NewPatternDialogProps {
  onCreate: (name: string, rows: number, cols: number) => void;
  onCancel: () => void;
}

export function NewPatternDialog({ onCreate, onCancel }: NewPatternDialogProps) {
  const [name, setName] = useState('Untitled Pattern');
  const [rows, setRows] = useState(DEFAULT_DIMENSION);
  const [cols, setCols] = useState(DEFAULT_DIMENSION);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidDimension(rows) || !isValidDimension(cols)) {
      setError(`Rows and columns must be whole numbers between ${MIN_DIMENSION} and ${MAX_DIMENSION}.`);
      return;
    }
    onCreate(name.trim() || 'Untitled Pattern', rows, cols);
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <form className="dialog" role="dialog" aria-modal="true" aria-label="New Pattern" onSubmit={handleSubmit}>
        <h2>New Pattern</h2>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Rows
          <input type="number" value={rows} onChange={(e) => setRows(e.target.valueAsNumber)} />
        </label>
        <label>
          Columns
          <input type="number" value={cols} onChange={(e) => setCols(e.target.valueAsNumber)} />
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit">Create</button>
        </div>
      </form>
    </div>
  );
}
