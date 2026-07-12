import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';
import { useEditorStore } from './store/editorStore';

afterEach(() => {
  useEditorStore.setState({ pattern: null });
});

describe('App', () => {
  it('creates a blank pattern and shows the grid after the New Pattern dialog is submitted', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'New Pattern' }));
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Blanket');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByRole('heading', { name: 'Blanket' })).toBeInTheDocument();
    expect(useEditorStore.getState().pattern?.rows).toBe(20);
    expect(useEditorStore.getState().pattern?.cols).toBe(20);
  });

  it('rejects an out-of-range dimension without creating a pattern', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'New Pattern' }));
    const rowsInput = screen.getByLabelText('Rows');
    await user.clear(rowsInput);
    await user.type(rowsInput, '501');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(useEditorStore.getState().pattern).toBeNull();
  });
});
