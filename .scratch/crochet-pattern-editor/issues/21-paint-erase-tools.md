# 21 — Paint and erase tools on the grid

**What to build:** The core drawing interaction: with a palette Slot selected as the active color, a crafter clicks or drags across grid cells to paint them; switching to erase and dragging clears cells back to Blank. Built on the unified Pointer Events API (not separate mouse/touch handlers) with `touch-action: none` on the grid surface, so stylus input gets the same precision as a mouse from day one — this ticket is where that parity is established, not retrofitted later.

**Blocked by:** 19, 20

**Status:** ready-for-agent

- [ ] With an active Slot selected, click or drag across cells paints them with that Slot
- [ ] Selecting erase (or the equivalent) and dragging clears cells back to Blank rather than requiring a "background color" repaint
- [ ] Painting and erasing are driven entirely through Pointer Events (covers mouse, stylus, and touch through one code path)
- [ ] A single continuous drag (pointer down to pointer up) is tracked as one coherent stroke unit in the dispatched store action, even though undo/redo doesn't exist yet — this sets up ticket 22 to coalesce it into one undo step without reworking the paint action shape
- [ ] The grid surface sets `touch-action: none` so dragging to paint doesn't trigger page scroll/zoom gestures
- [ ] Store action API tests cover: paint a single cell, paint a dragged run of cells, erase a single cell, erase a dragged run, and painting/erasing at grid edges/corners
