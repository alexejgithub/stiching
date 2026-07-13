import { useEffect, useRef, useState } from 'react';
import { NewPatternDialog } from './components/NewPatternDialog';
import { PaletteEditor } from './components/PaletteEditor';
import { PatternGrid } from './components/PatternGrid';
import { ResizeDialog } from './components/ResizeDialog';
import { Toolbar } from './components/Toolbar';
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

export default function App() {
  const pattern = useEditorStore((s) => s.pattern);
  const newPattern = useEditorStore((s) => s.newPattern);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resizeDialogOpen, setResizeDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // On boot, resume the single autosaved record if one exists (ticket 25)
  // instead of showing the New Pattern landing screen. `loading` avoids
  // flashing that landing screen while the async load is in flight.
  useEffect(() => {
    let cancelled = false;
    loadPattern().then((loaded) => {
      if (cancelled) return;
      if (loaded) useEditorStore.setState({ pattern: loaded });
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
      useEditorStore.setState({ pattern: imported });
      setImportError(null);
      await savePattern(imported);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import file.');
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
        {dialogOpen && (
          <NewPatternDialog
            onCreate={(name, rows, cols) => {
              newPattern(name, rows, cols);
              setDialogOpen(false);
              const created = useEditorStore.getState().pattern;
              if (created) void savePattern(created);
            }}
            onCancel={() => setDialogOpen(false)}
          />
        )}
      </main>
    );
  }

  return (
    <div className="editor">
      <header className="editor-header">
        <h1>{pattern.name}</h1>
        <button type="button" onClick={() => setResizeDialogOpen(true)}>
          Resize
        </button>
        <button type="button" onClick={() => exportPattern(pattern)}>
          Export
        </button>
        <button type="button" onClick={() => importInputRef.current?.click()}>
          Import
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".crochet"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void handleImportFile(file);
          }}
        />
        {importError && <p role="alert">{importError}</p>}
      </header>
      <Toolbar />
      <div className="editor-body">
        <PatternGrid pattern={pattern} />
        <PaletteEditor />
      </div>
      {resizeDialogOpen && <ResizeDialog onClose={() => setResizeDialogOpen(false)} />}
    </div>
  );
}
