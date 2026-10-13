import type { LocalWorkspace, Situation } from '@patternverse/workspace';

export type SituationNotebookState = {
  selected: Situation | null;
  title: string;
  context: string;
  dirty: boolean;
  saving: boolean;
  saveError: string;
};
export const initialSituationNotebook = (): SituationNotebookState => ({
  selected: null,
  title: '',
  context: '',
  dirty: false,
  saving: false,
  saveError: '',
});

/** One draft, one serialized save queue. The workspace still owns validation and
 * revision checks; dialog/focus, queue reads and storage notifications stay outside.
 */
export function createSituationNotebook(ports: {
  save: LocalWorkspace['updateSituation'];
  changed: (state: SituationNotebookState) => void;
  saved: (entry: Situation) => void;
}) {
  let state = initialSituationNotebook();
  let disposed = false;
  let pending: Promise<boolean> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const update = (patch: Partial<SituationNotebookState>) => {
    state = { ...state, ...patch };
    state.dirty =
      !!state.selected &&
      (state.title.trim() !== state.selected.title || state.context !== state.selected.context);
    if (!disposed) ports.changed(state);
  };
  const clearTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  async function drain(): Promise<boolean> {
    update({ saving: true, saveError: '' });
    try {
      while (state.selected && state.dirty) {
        const entry = state.selected;
        const content = { title: state.title.trim(), context: state.context };
        const saved = await ports.save(entry.id, content, entry.revision);
        // Advance the revision without replacing edits typed during the write.
        update({ selected: saved });
        if (!disposed) ports.saved(saved);
      }
      return true;
    } catch (cause) {
      update({
        saveError:
          cause instanceof Error
            ? cause.message
            : 'Your context could not be saved. Your text is still here.',
      });
      return false;
    } finally {
      clearTimer();
      update({ saving: false });
    }
  }
  function flush(): Promise<boolean> {
    clearTimer();
    if (pending) return pending;
    if (disposed) return Promise.resolve(!state.dirty);
    if (!state.selected || !state.dirty) return Promise.resolve(true);
    pending = drain().finally(() => {
      pending = null;
    });
    return pending;
  }
  return {
    open(entry: Situation): boolean {
      if (disposed || state.selected || pending) return false;
      update({ selected: entry, title: entry.title, context: entry.context, saveError: '' });
      return true;
    },
    edit(content: Partial<Pick<SituationNotebookState, 'title' | 'context'>>) {
      if (disposed || !state.selected) return;
      update({ ...content, saveError: '' });
      clearTimer();
      timer = setTimeout(() => {
        void flush();
      }, 450);
    },
    flush,
    async close(): Promise<boolean> {
      if (disposed) return false;
      // Multiple close/retry requests share the same queue, not parallel writes.
      do {
        if (!(await flush()) || disposed) return false;
      } while (state.dirty);
      update({ selected: null });
      return true;
    },
    dispose(): Promise<boolean> {
      if (disposed) return pending ?? Promise.resolve(!state.dirty);
      clearTimer();
      // Navigation flushes the latest draft as before. An in-flight write and any
      // newer draft finish safely, without publishing back into an unmounted view.
      const finishing = flush();
      disposed = true;
      return finishing;
    },
  };
}
