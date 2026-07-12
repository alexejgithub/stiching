import { PALETTE, useEditorStore } from "./store";

export function Toolbar() {
  const tool = useEditorStore((s) => s.tool);
  const activeSlot = useEditorStore((s) => s.activeSlot);
  const selection = useEditorStore((s) => s.selection);
  const setTool = useEditorStore((s) => s.setTool);
  const setActiveSlot = useEditorStore((s) => s.setActiveSlot);
  const rotateSelection = useEditorStore((s) => s.rotateSelection);
  const mirrorSelection = useEditorStore((s) => s.mirrorSelection);
  const commitSelection = useEditorStore((s) => s.commitSelection);
  const reset = useEditorStore((s) => s.reset);

  const hasSelection = selection !== null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={() => setTool("draw")} aria-pressed={tool === "draw"} style={btnStyle(tool === "draw")}>
          Draw
        </button>
        <button onClick={() => setTool("select")} aria-pressed={tool === "select"} style={btnStyle(tool === "select")}>
          Select
        </button>
      </div>

      {tool === "draw" && (
        <div style={{ display: "flex", gap: 4 }}>
          {PALETTE.map((slot) => (
            <button
              key={slot.id}
              onClick={() => setActiveSlot(slot.id)}
              title={slot.label}
              style={{
                ...btnStyle(activeSlot === slot.id),
                background: slot.hex,
                color: "#fff",
                width: 36,
              }}
            >
              {slot.symbol}
            </button>
          ))}
          <button onClick={() => setActiveSlot(null)} aria-pressed={activeSlot === null} style={btnStyle(activeSlot === null)}>
            Eraser
          </button>
        </div>
      )}

      {tool === "select" && (
        <div style={{ display: "flex", gap: 4 }}>
          <button disabled={!hasSelection} onClick={() => rotateSelection("ccw")} style={btnStyle(false)}>
            ⟲ Rotate CCW
          </button>
          <button disabled={!hasSelection} onClick={() => rotateSelection("cw")} style={btnStyle(false)}>
            ⟳ Rotate CW
          </button>
          <button disabled={!hasSelection} onClick={() => mirrorSelection("h")} style={btnStyle(false)}>
            ⇋ Mirror H
          </button>
          <button disabled={!hasSelection} onClick={() => mirrorSelection("v")} style={btnStyle(false)}>
            ⇵ Mirror V
          </button>
          <button disabled={!hasSelection} onClick={() => commitSelection()} style={btnStyle(false)}>
            Commit (Esc)
          </button>
        </div>
      )}

      <button onClick={reset} style={{ ...btnStyle(false), marginLeft: "auto" }}>
        Reset grid
      </button>
    </div>
  );
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "6px 10px",
    fontSize: 14,
    border: active ? "2px solid #2c3e50" : "1px solid #bbb",
    borderRadius: 4,
    background: active ? "#ecf0f1" : "#fff",
    cursor: "pointer",
  };
}
