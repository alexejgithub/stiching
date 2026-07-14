import { render } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PatternGrid } from './PatternGrid';
import { createPattern } from '../model/pattern';
import { useEditorStore } from '../store/editorStore';

// jsdom doesn't implement the Pointer Events capture API at all; PatternGrid
// calls setPointerCapture/hasPointerCapture/releasePointerCapture on every
// pointerdown/up regardless of what this suite is asserting, so without
// these no-op stubs every test throws before it can check preventDefault.
beforeAll(() => {
  Object.assign(HTMLElement.prototype, {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    hasPointerCapture: vi.fn(() => false),
  });
});

// Ticket 34: a paint stroke / marquee-select / selection-move drag is a
// mouse-down-and-drag motion — also the browser's native text-selection
// gesture. Without preventDefault() at pointerdown, dragging across the
// row/column number <text> nodes (gridRenderer.ts) highlights them as text.
// These tests assert handlePointerDown suppresses the native gesture for
// every tool branch that starts a drag, and leaves it alone otherwise.

// jsdom doesn't implement elementFromPoint at all (not even as a stub), so
// there's nothing to vi.spyOn — assign it directly for the duration of the
// dispatch. cellAtPoint (PatternGrid.tsx) hit-tests via this API rather than
// event.target once pointer capture is set, so it must resolve to a real
// cell element for handlePointerDown to reach the draw/select branches.
function firePointerDown(container: HTMLElement, cellEl: Element): PointerEvent {
  const original = document.elementFromPoint;
  document.elementFromPoint = vi.fn(() => cellEl as Element);
  const event = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    clientX: 0,
    clientY: 0,
  });
  container.dispatchEvent(event);
  document.elementFromPoint = original;
  return event;
}

describe('PatternGrid handlePointerDown', () => {
  beforeEach(() => {
    useEditorStore.setState({ pattern: createPattern('Test', 4, 4), tool: 'draw', selection: null });
  });

  afterEach(() => {
    useEditorStore.setState({ pattern: null });
  });

  it('prevents the default (native text-selection) gesture when starting a paint stroke', () => {
    useEditorStore.setState({ tool: 'draw' });
    const { container } = render(<PatternGrid pattern={useEditorStore.getState().pattern!} />);
    const cellEl = container.querySelector('[data-role="cell"][data-row="0"][data-col="0"]')!;
    expect(cellEl).not.toBeNull();

    const event = firePointerDown(container.firstElementChild as HTMLElement, cellEl);

    expect(event.defaultPrevented).toBe(true);
  });

  it('prevents the default gesture when starting a marquee selection', () => {
    useEditorStore.setState({ tool: 'select', selection: null });
    const { container } = render(<PatternGrid pattern={useEditorStore.getState().pattern!} />);
    const cellEl = container.querySelector('[data-role="cell"][data-row="1"][data-col="1"]')!;

    const event = firePointerDown(container.firstElementChild as HTMLElement, cellEl);

    expect(event.defaultPrevented).toBe(true);
  });

  it('prevents the default gesture when grabbing an existing selection to move it', () => {
    useEditorStore.setState({
      tool: 'select',
      selection: { anchorRow: 0, anchorCol: 0, block: [[null]] },
    });
    const { container } = render(<PatternGrid pattern={useEditorStore.getState().pattern!} />);
    const cellEl = container.querySelector('[data-role="cell"][data-row="0"][data-col="0"]')!;

    const event = firePointerDown(container.firstElementChild as HTMLElement, cellEl);

    expect(event.defaultPrevented).toBe(true);
  });

  it('does not prevent the default gesture for tools other than draw/select', () => {
    const { container } = render(<PatternGrid pattern={useEditorStore.getState().pattern!} />);
    const cellEl = container.querySelector('[data-role="cell"][data-row="0"][data-col="0"]')!;

    // `Tool` is currently only 'draw' | 'select', but the early-return guard
    // (`tool !== 'draw' && tool !== 'select'`) is defense-in-depth for any
    // future tool that shouldn't start a drag — it must leave the native
    // text-selection gesture alone rather than preventDefault unconditionally.
    useEditorStore.setState({ tool: 'pan' as unknown as 'draw' | 'select', selection: null });
    const event = firePointerDown(container.firstElementChild as HTMLElement, cellEl);

    expect(event.defaultPrevented).toBe(false);
  });
});
