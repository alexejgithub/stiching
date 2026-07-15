import { useEffect, useRef, useState } from 'react';
import { ExportDialog } from './components/ExportDialog';
import { ImportImageControl } from './components/ImportImageControl';
import { NewPatternDialog } from './components/NewPatternDialog';
import { PaletteEditor } from './components/PaletteEditor';
import { PatternGrid } from './components/PatternGrid';
import { ResizeDialog } from './components/ResizeDialog';
import { Toolbar } from './components/Toolbar';
import type { Pattern } from './model/pattern';
import { startAutosave } from './persistence/autosave';
import { loadPattern, savePattern } from './persistence/db';
import { exportPattern, importPattern } from './persistence/file';
import { useEditorStore } from './store/editorStore';

// Text inputs (palette label field, dialogs) should keep native undo, not
// have Ctrl+Z hijacked into the pattern's command log.
function isTextInput(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

// Reachable both from the landing screen (nothing open yet) and from the
// editor chrome (replacing the current in-progress pattern) — same control
// either way, per the "one pattern open at a time" replace-current model.
interface ImportControlProps {
  onFile: (file: File) => void;
  error: string | null;
}

function ImportControl({ onFile, error }: ImportControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()}>
        Import
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".crochet"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
      {error && <p role="alert">{error}</p>}
    </>
  );
}

export default function App() {
  const pattern = useEditorStore((s) => s.pattern);
  const newPattern = useEditorStore((s) => s.newPattern);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resizeDialogOpen, setResizeDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);

  // On boot, resume the single autosaved record if one exists (ticket 25)
  // instead of showing the New Pattern landing screen. `loading` avoids
  // flashing that landing screen while the async load is in flight.
  useEffect(() => {
    let cancelled = false;
    loadPattern().then((loaded) => {
      if (cancelled) return;
      if (loaded) useEditorStore.getState().replacePattern(loaded);
      setLoading(false);
    });
    const autosave = startAutosave();
    return () => {
      cancelled = true;
      autosave.stop();
    };
  }, []);

  useEffect(() => {
    const ARROW_DELTAS: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };

    function onKeyDown(e: KeyboardEvent) {
      if (isTextInput(e.target)) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          useEditorStore.getState().undo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          useEditorStore.getState().redo();
        }
        return;
      }

      // Escape commits whatever selection is currently floating (a no-op
      // otherwise). Arrow keys nudge it one cell at a time, only while the
      // select tool is active and a selection exists, so they never fight
      // with default scroll/navigation the rest of the time.
      if (e.key === 'Escape') {
        useEditorStore.getState().commitSelection();
        return;
      }
      const delta = ARROW_DELTAS[e.key];
      if (delta) {
        const { tool, selection, nudgeSelection } = useEditorStore.getState();
        if (tool === 'select' && selection) {
          e.preventDefault();
          nudgeSelection(delta[0], delta[1]);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Replacing the current in-progress pattern (New Pattern or a successful
  // import) saves immediately rather than waiting on autosave's ~1.5s
  // debounce, so the single IndexedDB slot never briefly holds a stale prior
  // pattern after a deliberate replacement.
  async function handleImportFile(file: File) {
    try {
      const imported = await importPattern(file);
      useEditorStore.getState().replacePattern(imported);
      setImportError(null);
      await savePattern(imported);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import file.');
    }
  }

  function handleCreatePattern(name: string, rows: number, cols: number) {
    newPattern(name, rows, cols);
    setDialogOpen(false);
    const created = useEditorStore.getState().pattern;
    if (created) void savePattern(created);
  }

  // Same immediate-save-not-waiting-for-debounce path as New Pattern and
  // .crochet import (see the comment above handleImportFile).
  function handleCreateFromImage(imported: Pattern) {
    useEditorStore.getState().replacePattern(imported);
    void savePattern(imported);
  }

  // Reopening from the editor discards the in-progress pattern (anything not
  // yet exported to a .crochet file is only reachable by reloading before the
  // next autosave overwrites the single IndexedDB slot), so confirm first —
  // unlike the landing screen, where there's nothing to lose yet.
  function handleRestartClick() {
    if (window.confirm('Start a new pattern? This will replace the current pattern.')) {
      setDialogOpen(true);
    }
  }

  if (loading) {
    return null;
  }

  if (!pattern) {
    return (
      <main className="landing">
        <h1>Crochet Pattern Editor</h1>
        <button onClick={() => setDialogOpen(true)}>New Pattern</button>
        <ImportImageControl onCreate={handleCreateFromImage} />
        <ImportControl onFile={(file) => void handleImportFile(file)} error={importError} />
        {dialogOpen && <NewPatternDialog onCreate={handleCreatePattern} onCancel={() => setDialogOpen(false)} />}
      </main>
    );
  }

  return (
    <div className="editor">
      <header className="editor-header">
        <h1>{pattern.name}</h1>
        <button type="button" onClick={handleRestartClick}>
          New Pattern
        </button>
        <button type="button" onClick={() => setResizeDialogOpen(true)}>
          Resize
        </button>
        <button type="button" onClick={() => exportPattern(pattern)}>
          Export
        </button>
        <ImportImageControl onCreate={handleCreateFromImage} />
        <ImportControl onFile={(file) => void handleImportFile(file)} error={importError} />
        <button type="button" onClick={() => setExportDialogOpen(true)}>
          Export / Print (SVG)
        </button>
      </header>
      <Toolbar />
      <div className="editor-body">
        <PatternGrid pattern={pattern} />
        <PaletteEditor />
      </div>
      {resizeDialogOpen && <ResizeDialog onClose={() => setResizeDialogOpen(false)} />}
      {exportDialogOpen && <ExportDialog pattern={pattern} onClose={() => setExportDialogOpen(false)} />}
      {dialogOpen && <NewPatternDialog onCreate={handleCreatePattern} onCancel={() => setDialogOpen(false)} />}
    </div>
  );
}
