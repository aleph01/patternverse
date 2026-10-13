import {
  practiceRunText,
  serializePracticeArchive,
  type LocalWorkspace,
  type SavedPracticeRun,
} from '@patternverse/workspace';

export type PracticeHistoryActionsState = {
  selectedId: string;
  mobileDetail: boolean;
  renaming: boolean;
  name: string;
  copyText: string;
  busy: boolean;
  error: string;
  message: string;
};
export const initialPracticeHistoryActions = (): PracticeHistoryActionsState => ({
  selectedId: '',
  mobileDetail: false,
  renaming: false,
  name: '',
  copyText: '',
  busy: false,
  error: '',
  message: '',
});

/** View actions only. Persistence, plain text and archive rules are reused, and
 * browser confirmation/clipboard/download and refresh are supplied by the host.
 */
export function createPracticeHistoryActions(ports: {
  workspace: () => Promise<Pick<LocalWorkspace, 'renamePracticeRun' | 'deletePracticeRun'>>;
  selected: () => SavedPracticeRun | undefined;
  refresh: () => Promise<void>;
  confirm: (question: string) => boolean;
  copy: (text: string) => Promise<void>;
  download: (content: string, filename: string) => void;
  started: () => void;
  changed: (state: PracticeHistoryActionsState) => void;
}) {
  let state = initialPracticeHistoryActions();
  let disposed = false;
  let viewVersion = 0;
  const current = (version: number) => !disposed && version === viewVersion;
  const update = (patch: Partial<PracticeHistoryActionsState>) => {
    if (disposed) return;
    state = { ...state, ...patch };
    ports.changed(state);
  };
  async function action(work: (version: number) => Promise<void>) {
    if (disposed || state.busy) return;
    const version = viewVersion;
    update({ busy: true, error: '', message: '' });
    ports.started();
    try {
      await work(version);
    } catch (cause) {
      if (current(version))
        update({
          error: cause instanceof Error ? cause.message : 'The change could not be saved.',
        });
    } finally {
      update({ busy: false });
    }
  }
  return {
    select(id: string, mobileDetail = true) {
      viewVersion++;
      update({ selectedId: id, mobileDetail, renaming: false, copyText: '' });
    },
    reset() {
      viewVersion++;
      update({ selectedId: '', mobileDetail: false, renaming: false, copyText: '' });
    },
    back() {
      update({ mobileDetail: false });
    },
    toggleRename() {
      if (disposed || state.busy) return;
      const run = ports.selected();
      if (!run) return;
      viewVersion++;
      update({ name: run.title, renaming: !state.renaming });
    },
    setName(name: string) {
      viewVersion++;
      update({ name });
    },
    rename() {
      const run = ports.selected(),
        name = state.name;
      if (!run) return Promise.resolve();
      return action(async (version) => {
        const workspace = await ports.workspace();
        if (disposed) return;
        await workspace.renamePracticeRun(run.id, name);
        if (current(version)) update({ renaming: false });
        if (disposed) return;
        await ports.refresh();
        if (current(version)) update({ message: 'Run renamed.' });
      });
    },
    remove() {
      const run = ports.selected();
      if (!run) return Promise.resolve();
      return action(async (version) => {
        if (
          !ports.confirm(
            `Delete “${run.title}” and its responses from this device? This cannot be undone.`,
          )
        )
          return;
        const workspace = await ports.workspace();
        if (!current(version)) return;
        await workspace.deletePracticeRun(run.id);
        if (current(version))
          update({ selectedId: '', mobileDetail: false, renaming: false, copyText: '' });
        if (disposed) return;
        await ports.refresh();
        if (current(version)) update({ message: 'Saved run deleted.' });
      });
    },
    copy() {
      const run = ports.selected();
      if (!run) return Promise.resolve();
      return action(async (version) => {
        const text = practiceRunText(run);
        try {
          await ports.copy(text);
          if (current(version)) update({ message: 'Responses copied as plain text.' });
        } catch {
          if (current(version))
            update({ copyText: text, message: 'Select and copy the text below.' });
        }
      });
    },
    exportRun() {
      const run = ports.selected();
      if (!run) return Promise.resolve();
      return action(async () => {
        ports.download(serializePracticeArchive(run), 'patternverse-practice-responses.json');
      });
    },
    dispose() {
      disposed = true;
      viewVersion++;
    },
  };
}
