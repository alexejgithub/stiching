import { useEffect, useState } from 'react';
import { NewPatternDialog } from './components/NewPatternDialog';
import { PaletteEditor } from './components/PaletteEditor';
import { PatternGrid } from './components/PatternGrid';
import { Toolbar } from './components/Toolbar';
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || isTextInput(e.target)) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().undo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        useEditorStore.getState().redo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
      </header>
      <Toolbar />
      <div className="editor-body">
        <PatternGrid pattern={pattern} />
        <PaletteEditor />
      </div>
    </div>
  );
}
