import { useEffect } from "react";
import { Grid } from "./Grid";
import { Toolbar } from "./Toolbar";
import { useEditorStore } from "./store";

// PROTOTYPE — wayfinder ticket 18-editor-prototype.
// Question: does draw + rectangle marquee-select + rotate/move/mirror feel
// right as one interaction loop, on both mouse and stylus/touch?
// Throwaway: no persistence, no undo, no palette editor, no export.
function App() {
  const tool = useEditorStore((s) => s.tool);
  const selection = useEditorStore((s) => s.selection);
  const nudgeSelection = useEditorStore((s) => s.nudgeSelection);
  const commitSelection = useEditorStore((s) => s.commitSelection);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      if (!selection) return;
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          nudgeSelection(-1, 0);
          break;
        case "ArrowDown":
          e.preventDefault();
          nudgeSelection(1, 0);
          break;
        case "ArrowLeft":
          e.preventDefault();
          nudgeSelection(0, -1);
          break;
        case "ArrowRight":
          e.preventDefault();
          nudgeSelection(0, 1);
          break;
        case "Escape":
          e.preventDefault();
          commitSelection();
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection, nudgeSelection, commitSelection]);

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 18 }}>Crochet editor — interaction prototype</h1>
      <p style={{ fontSize: 13, color: "#666" }}>
        Draw with a color, then switch to Select and drag a rectangle. Drag the orange-bordered
        selection to move it, use arrow keys to nudge, or rotate/mirror it from the toolbar. Escape
        or clicking elsewhere commits it back into the grid.
      </p>

      <Toolbar />

      <div style={{ overflow: "auto", border: "1px solid #ccc", display: "inline-block" }}>
        <Grid />
      </div>

      <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
        Tool: <strong>{tool}</strong>
        {selection && (
          <>
            {" "}
            — floating selection at ({selection.anchorRow}, {selection.anchorCol}), size{" "}
            {selection.block.length}×{selection.block[0]?.length ?? 0}
          </>
        )}
      </p>
    </div>
  );
}

export default App;
