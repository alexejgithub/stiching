# Undo/redo scope

Type: grilling
Status: resolved

## Question

Is undo/redo in scope for v1, or an acceptable cut given the "working app ASAP" goal?

## Answer

In scope for v1. A standard undo/redo stack (Ctrl+Z/Ctrl+Y) covers drawing and tool actions (including rotate/move/mirror on a selection). It's cheaper to design into the data model from the start than to retrofit once tools are already built around direct mutation — see [Design undo/redo architecture](../issues/13-undo-redo-architecture.md).
