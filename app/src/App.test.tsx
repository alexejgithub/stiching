import { IDBFactory } from 'fake-indexeddb';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { useEditorStore } from './store/editorStore';

async function createInitialPattern(user: ReturnType<typeof userEvent.setup>, name = 'Blanket') {
  await user.click(await screen.findByRole('button', { name: 'New Pattern' }));
  await user.clear(screen.getByLabelText('Name'));
  await user.type(screen.getByLabelText('Name'), name);
  await user.click(screen.getByRole('button', { name: 'Create' }));
  await screen.findByRole('heading', { name });
}

// Fresh in-memory IndexedDB per test: autosave (ticket 25) can write for real
// during these tests (real timers, no mocking), so without this a write from
// one test could leak into the next test's boot-load.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

afterEach(() => {
  useEditorStore.setState({ pattern: null });
});

describe('App', () => {
  it('creates a blank pattern and shows the grid after the New Pattern dialog is submitted', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'New Pattern' }));
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

    await user.click(await screen.findByRole('button', { name: 'New Pattern' }));
    const rowsInput = screen.getByLabelText('Rows');
    await user.clear(rowsInput);
    await user.type(rowsInput, '501');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(useEditorStore.getState().pattern).toBeNull();
  });

  describe('restarting from the editor', () => {
    it('confirms, then replaces the current pattern via the header New Pattern control', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      render(<App />);
      await createInitialPattern(user, 'Blanket');

      await user.click(screen.getByRole('button', { name: 'New Pattern' }));
      expect(confirmSpy).toHaveBeenCalledOnce();
      await user.clear(screen.getByLabelText('Name'));
      await user.type(screen.getByLabelText('Name'), 'Scarf');
      await user.click(screen.getByRole('button', { name: 'Create' }));

      expect(screen.getByRole('heading', { name: 'Scarf' })).toBeInTheDocument();
      expect(useEditorStore.getState().pattern?.name).toBe('Scarf');
    });

    it('does not open the dialog when the discard confirm is declined', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(<App />);
      await createInitialPattern(user, 'Blanket');

      await user.click(screen.getByRole('button', { name: 'New Pattern' }));

      expect(screen.queryByRole('dialog', { name: 'New Pattern' })).not.toBeInTheDocument();
      expect(useEditorStore.getState().pattern?.name).toBe('Blanket');
    });

    it('leaves the current pattern untouched when the reopened dialog is canceled', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      render(<App />);
      await createInitialPattern(user, 'Blanket');

      await user.click(screen.getByRole('button', { name: 'New Pattern' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('dialog', { name: 'New Pattern' })).not.toBeInTheDocument();
      expect(useEditorStore.getState().pattern?.name).toBe('Blanket');
    });
  });
});
