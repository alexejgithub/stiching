import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { Toolbar } from './Toolbar';
import { createPattern } from '../model/pattern';
import { useEditorStore } from '../store/editorStore';

// Ticket 38: the Pan tool is the toolbar's escape hatch for scrolling a
// pattern larger than the viewport on touch, since drag-to-paint/select/move
// already claim the single-finger drag gesture the browser would otherwise
// use to pan (see index.css's `touch-action` split on `.pattern-grid`).
describe('Toolbar pan tool', () => {
  beforeEach(() => {
    useEditorStore.setState({ pattern: createPattern('Test', 4, 4), tool: 'draw', selection: null });
  });

  it('switches into the pan tool and back to draw on toggle', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    const panButton = screen.getByRole('button', { name: 'Pan tool' });

    expect(panButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(panButton);
    expect(useEditorStore.getState().tool).toBe('pan');
    expect(panButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(panButton);
    expect(useEditorStore.getState().tool).toBe('draw');
    expect(panButton).toHaveAttribute('aria-pressed', 'false');
  });
});
