import type {
  BearingsNotebook,
  LocalWorkspace,
  Situation,
  SituationPriority,
} from '@patternverse/workspace';
import { notebookFor } from './notebook';

export type BearingsSession = Readonly<{
  selected: Situation | null;
  document: BearingsNotebook | null;
  title: string;
  context: string;
  priority: SituationPriority | null;
  dirty: boolean;
  saving: boolean;
  error: string;
}>;
export const initialBearingsSession = (): BearingsSession => ({
  selected: null,
  document: null,
  title: '',
  context: '',
  priority: null,
  dirty: false,
  saving: false,
  error: '',
});
export function createBearingsSession(ports: {
  save: LocalWorkspace['updateSituation'];
  changed: (state: BearingsSession) => void;
  saved: (situation: Situation) => void;
}) {
  let state = initialBearingsSession(),
    baseline = '',
    disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Promise<boolean> | null = null;
  const signature = () =>
    JSON.stringify({
      title: state.title.trim(),
      context: state.context,
      notebook: state.document,
      priority: state.priority,
    });
  const publish = (patch: Partial<BearingsSession>) => {
    state = { ...state, ...patch };
    state = { ...state, dirty: !!state.selected && signature() !== baseline };
    if (!disposed) ports.changed(state);
  };
  const clear = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  async function drain(): Promise<boolean> {
    publish({ saving: true, error: '' });
    try {
      while (state.selected && state.document && signature() !== baseline) {
        const snapshot = {
          title: state.title.trim(),
          context: state.context,
          notebook: state.document,
          priority: state.priority,
        };
        const saved = await ports.save(state.selected.id, snapshot, state.selected.revision);
        baseline = JSON.stringify(snapshot);
        publish({ selected: saved });
        if (!disposed) ports.saved(saved);
      }
      return true;
    } catch (cause) {
      publish({
        error:
          cause instanceof Error
            ? cause.message
            : 'Your notebook could not be saved. Keep it open and retry.',
      });
      return false;
    } finally {
      publish({ saving: false });
    }
  }
  function flush(): Promise<boolean> {
    clear();
    if (pending) return pending;
    if (!state.selected || !state.dirty) return Promise.resolve(true);
    pending = drain().finally(() => {
      pending = null;
    });
    return pending;
  }
  return {
    open(situation: Situation) {
      if (disposed || state.selected || pending) return false;
      state = {
        ...initialBearingsSession(),
        selected: situation,
        title: situation.title,
        context: situation.context,
        document: notebookFor(situation),
        priority: situation.priority ?? null,
      };
      baseline = signature();
      publish({});
      return true;
    },
    edit(patch: Partial<Pick<BearingsSession, 'document' | 'title' | 'context' | 'priority'>>) {
      if (disposed || !state.selected) return;
      publish({ ...patch, error: '' });
      clear();
      timer = setTimeout(() => {
        void flush();
      }, 450);
    },
    flush,
    async close() {
      if (disposed || !(await flush())) return false;
      while (state.dirty) if (!(await flush())) return false;
      publish({ selected: null, document: null });
      return true;
    },
    dispose() {
      clear();
      const saving = flush();
      disposed = true;
      return saving;
    },
  };
}
