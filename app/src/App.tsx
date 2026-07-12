import { useState } from 'react';
import { NewPatternDialog } from './components/NewPatternDialog';
import { PaletteEditor } from './components/PaletteEditor';
import { PatternGrid } from './components/PatternGrid';
import { useEditorStore } from './store/editorStore';

export default function App() {
  const pattern = useEditorStore((s) => s.pattern);
  const newPattern = useEditorStore((s) => s.newPattern);
  const [dialogOpen, setDialogOpen] = useState(false);

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
      <div className="editor-body">
        <PatternGrid pattern={pattern} />
        <PaletteEditor />
      </div>
    </div>
  );
}
