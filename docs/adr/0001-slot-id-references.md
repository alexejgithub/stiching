# Cells reference palette slots by stable id, not array position

Status: accepted

Cells store a palette slot's `id` (a small per-pattern incrementing integer) rather than its index in the palette array. The obvious-looking alternative — a raw array index — would silently repaint unrelated cells whenever a slot is reordered or deleted, since every cell's meaning depends on the palette's current order. A stable id keeps a cell's color pinned to one specific slot regardless of palette edits, at the cost of one extra layer of indirection (id → slot lookup) when rendering. Ids are minted from a per-pattern `nextSlotId` counter and never reused, so a deleted slot's id can't be silently reassigned to a new one.
