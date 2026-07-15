import { type ChangeEvent, useRef, useState } from 'react';
import { isFileTooLarge } from '../model/imageSampling';
import type { Pattern } from '../model/pattern';
import { ImportImageDialog } from './ImportImageDialog';

// Reachable from both the landing screen and the editor header, next to
// "New Pattern" and the existing .crochet ImportControl (App.tsx) - same
// "replace whatever's currently open" model as those.
interface ImportImageControlProps {
  onCreate: (pattern: Pattern) => void;
}

export function ImportImageControl({ onCreate }: ImportImageControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    if (isFileTooLarge(picked)) {
      setError('Images must be smaller than 25 MB.');
      return;
    }
    setError(null);
    setFile(picked);
  }

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()}>
        Import Image
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
      {error && <p role="alert">{error}</p>}
      {file && (
        <ImportImageDialog
          key={`${file.name}-${file.size}-${file.lastModified}`}
          file={file}
          onCreate={(pattern) => {
            setFile(null);
            onCreate(pattern);
          }}
          onCancel={() => setFile(null)}
          onError={(message) => {
            setFile(null);
            setError(message);
          }}
        />
      )}
    </>
  );
}
