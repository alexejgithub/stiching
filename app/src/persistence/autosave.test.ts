import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { startAutosave } from './autosave';
import * as db from './db';

// The debounce/flush wrapper is tested by spying on db.savePattern (the
// round-trip behavior of savePattern/loadPattern itself is covered against
// fake-indexeddb in db.test.ts) so we can count writes and control timing
// with vitest's fake timers.
beforeEach(() => {
  useEditorStore.setState({ pattern: null });
  vi.useFakeTimers();
});

afterEach(() => {
  useEditorStore.setState({ pattern: null });
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('startAutosave', () => {
  it('coalesces rapid successive mutations into a single debounced write', () => {
    const saveSpy = vi.spyOn(db, 'savePattern').mockResolvedValue(undefined);
    const autosave = startAutosave();

    useEditorStore.getState().newPattern('A', 2, 2);
    useEditorStore.getState().addSlot('#ff0000', 'Red');
    const slotId = useEditorStore.getState().pattern!.palette[0].id;
    useEditorStore.getState().setActiveSlot(slotId);
    useEditorStore.getState().beginStroke(0, 0);
    useEditorStore.getState().continueStroke(0, 1);
    useEditorStore.getState().endStroke();

    expect(saveSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500);

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenLastCalledWith(useEditorStore.getState().pattern);
    autosave.stop();
  });

  it('flushes immediately on blur mid-debounce, before the timer would have fired', () => {
    const saveSpy = vi.spyOn(db, 'savePattern').mockResolvedValue(undefined);
    const autosave = startAutosave();

    useEditorStore.getState().newPattern('B', 2, 2);
    vi.advanceTimersByTime(500); // still mid-debounce (< 1500ms)
    expect(saveSpy).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('blur'));
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenLastCalledWith(useEditorStore.getState().pattern);

    // The debounce timer was cleared by the flush, so letting it run out
    // must not trigger a second write.
    vi.advanceTimersByTime(1500);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    autosave.stop();
  });

  it('flushes immediately on beforeunload mid-debounce', () => {
    const saveSpy = vi.spyOn(db, 'savePattern').mockResolvedValue(undefined);
    const autosave = startAutosave();

    useEditorStore.getState().newPattern('C', 2, 2);
    vi.advanceTimersByTime(500);

    window.dispatchEvent(new Event('beforeunload'));

    expect(saveSpy).toHaveBeenCalledTimes(1);
    autosave.stop();
  });

  it('stop() unsubscribes so further mutations are not autosaved', () => {
    const saveSpy = vi.spyOn(db, 'savePattern').mockResolvedValue(undefined);
    const autosave = startAutosave();

    useEditorStore.getState().newPattern('D', 2, 2);
    autosave.stop(); // flushes the pending save, then unsubscribes
    expect(saveSpy).toHaveBeenCalledTimes(1);

    saveSpy.mockClear();
    useEditorStore.getState().addSlot('#00ff00', 'Green');
    vi.advanceTimersByTime(1500);
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
