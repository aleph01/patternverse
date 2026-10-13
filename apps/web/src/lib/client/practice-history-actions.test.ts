import { expect, it, vi } from 'vitest';
import {
  parsePracticeArchive,
  practiceRunText,
  type SavedPracticeRun,
} from '@patternverse/workspace';
import {
  createPracticeHistoryActions,
  initialPracticeHistoryActions,
  type PracticeHistoryActionsState,
} from './practice-history-actions';

const run: SavedPracticeRun = {
  id: 'one',
  workspaceId: 'private',
  patternRef: { sourceId: 'commons', entityId: 'test-pattern' },
  patternType: 'pattern',
  patternTitle: 'Test pattern',
  title: 'A private run',
  verseIds: ['learning'],
  origin: 'patternverse',
  status: 'completed',
  revision: 1,
  responses: [{ id: 'answer', prompt: 'What matters?', answer: 'Keep it simple.' }],
  createdAt: '2026-10-01T12:00:00Z',
  updatedAt: '2026-10-01T12:00:00Z',
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function fixture() {
  let selected: SavedPracticeRun | undefined = run;
  let state: PracticeHistoryActionsState = initialPracticeHistoryActions();
  const workspace = {
    renamePracticeRun: vi.fn(async (id: string, title: string) => {
      void id;
      void title;
    }),
    deletePracticeRun: vi.fn(async (id: string) => {
      void id;
    }),
  };
  const ports = {
    workspace: vi.fn(async () => workspace),
    selected: vi.fn(() => selected),
    refresh: vi.fn(async () => {}),
    confirm: vi.fn(() => true),
    copy: vi.fn(async (text: string) => {
      void text;
    }),
    download: vi.fn(),
    started: vi.fn(),
    changed: vi.fn((next: PracticeHistoryActionsState) => {
      state = next;
    }),
  };
  const controller = createPracticeHistoryActions(ports);
  return {
    controller,
    ports,
    workspace,
    get state() {
      return state;
    },
    select: (next: SavedPracticeRun | undefined) => {
      selected = next;
      controller.select(next?.id ?? '');
    },
  };
}

it('does no browser, storage or view work on construction and ignores actions without a run', async () => {
  const f = fixture();
  for (const port of Object.values(f.ports)) expect(port).not.toHaveBeenCalled();
  f.select(undefined);
  await f.controller.rename();
  await f.controller.remove();
  await f.controller.copy();
  await f.controller.exportRun();
  expect(f.ports.workspace).not.toHaveBeenCalled();
  expect(f.ports.copy).not.toHaveBeenCalled();
  expect(f.ports.download).not.toHaveBeenCalled();
});
it('opens/resets details and rename/copy drafts while preserving a URL-selected desktop detail', async () => {
  const f = fixture();
  f.controller.select('one', false);
  expect(f.state).toMatchObject({ selectedId: 'one', mobileDetail: false });
  f.controller.toggleRename();
  expect(f.state).toMatchObject({ renaming: true, name: run.title });
  f.controller.setName('Draft');
  f.select({ ...run, id: 'two', title: 'Another run' });
  expect(f.state).toMatchObject({
    selectedId: 'two',
    mobileDetail: true,
    renaming: false,
    copyText: '',
  });
  f.controller.toggleRename();
  expect(f.state.name).toBe('Another run');
  f.controller.back();
  expect(f.state.mobileDetail).toBe(false);
  expect(f.state.selectedId).toBe('two');
  f.controller.reset();
  expect(f.state).toMatchObject({
    selectedId: '',
    mobileDetail: false,
    renaming: false,
    copyText: '',
  });
});
it('renames through the workspace, refreshes and closes only the accepted draft', async () => {
  const f = fixture();
  f.controller.toggleRename();
  f.controller.setName('New name');
  await f.controller.rename();
  expect(f.workspace.renamePracticeRun).toHaveBeenCalledExactlyOnceWith('one', 'New name');
  expect(f.ports.refresh).toHaveBeenCalledOnce();
  expect(f.state).toMatchObject({ renaming: false, busy: false, message: 'Run renamed.' });
});
it('snapshots the rename target and title before the workspace resolves', async () => {
  const f = fixture(),
    pending = deferred<typeof f.workspace>();
  f.ports.workspace.mockReturnValueOnce(pending.promise);
  f.controller.toggleRename();
  f.controller.setName('Submitted name');
  const saving = f.controller.rename();
  f.select({ ...run, id: 'two' });
  f.controller.setName('Different draft');
  pending.resolve(f.workspace);
  await saving;
  expect(f.workspace.renamePracticeRun).toHaveBeenCalledExactlyOnceWith('one', 'Submitted name');
  expect(f.state).toMatchObject({
    selectedId: 'two',
    name: 'Different draft',
    message: '',
    busy: false,
  });
});
it('preserves edits typed during a pending rename instead of closing the newer draft', async () => {
  const f = fixture(),
    pending = deferred<void>();
  f.workspace.renamePracticeRun.mockReturnValueOnce(pending.promise);
  f.controller.toggleRename();
  f.controller.setName('Submitted');
  const saving = f.controller.rename();
  await Promise.resolve();
  f.controller.setName('Newer draft');
  pending.resolve();
  await saving;
  expect(f.state).toMatchObject({ name: 'Newer draft', renaming: true, busy: false, message: '' });
  expect(f.ports.refresh).toHaveBeenCalledOnce();
});
it.each([new Error('Run title must be between 1 and 120 characters.'), 'unknown'])(
  'retains a failed rename and permits retry (%s)',
  async (cause) => {
    const f = fixture();
    f.workspace.renamePracticeRun.mockRejectedValueOnce(cause);
    f.controller.toggleRename();
    f.controller.setName('A title');
    await f.controller.rename();
    expect(f.state).toMatchObject({ renaming: true, name: 'A title', busy: false, message: '' });
    expect(f.state.error).toBe(
      cause instanceof Error ? cause.message : 'The change could not be saved.',
    );
    expect(f.ports.refresh).not.toHaveBeenCalled();
    await f.controller.rename();
    expect(f.state).toMatchObject({ error: '', message: 'Run renamed.' });
  },
);
it('does not delete or refresh without confirmation', async () => {
  const f = fixture();
  f.ports.confirm.mockReturnValue(false);
  await f.controller.remove();
  expect(f.ports.confirm).toHaveBeenCalledExactlyOnceWith(
    'Delete “A private run” and its responses from this device? This cannot be undone.',
  );
  expect(f.ports.workspace).not.toHaveBeenCalled();
  expect(f.workspace.deletePracticeRun).not.toHaveBeenCalled();
  expect(f.ports.refresh).not.toHaveBeenCalled();
  expect(f.state.busy).toBe(false);
});
it('deletes only the confirmed run, resets stale detail controls and refreshes', async () => {
  const f = fixture();
  f.controller.select('one');
  f.controller.toggleRename();
  await f.controller.remove();
  expect(f.workspace.deletePracticeRun).toHaveBeenCalledExactlyOnceWith('one');
  expect(f.state).toMatchObject({
    selectedId: '',
    mobileDetail: false,
    renaming: false,
    message: 'Saved run deleted.',
  });
  expect(f.ports.refresh).toHaveBeenCalledOnce();
});
it('leaves the selection and rename draft available after delete failure', async () => {
  const f = fixture();
  f.controller.select('one');
  f.controller.toggleRename();
  f.workspace.deletePracticeRun.mockRejectedValueOnce(new Error('Storage unavailable'));
  await f.controller.remove();
  expect(f.state).toMatchObject({
    selectedId: 'one',
    mobileDetail: true,
    renaming: true,
    error: 'Storage unavailable',
    busy: false,
  });
});
it('does not start a delete if selection changes during workspace acquisition', async () => {
  const f = fixture(),
    pending = deferred<typeof f.workspace>();
  f.ports.workspace.mockReturnValueOnce(pending.promise);
  const deleting = f.controller.remove();
  f.select({ ...run, id: 'two' });
  pending.resolve(f.workspace);
  await deleting;
  expect(f.workspace.deletePracticeRun).not.toHaveBeenCalled();
  expect(f.ports.refresh).not.toHaveBeenCalled();
});
it('does not clear a newly selected run when an already-started delete finishes', async () => {
  const f = fixture(),
    pending = deferred<void>();
  f.workspace.deletePracticeRun.mockReturnValueOnce(pending.promise);
  const deleting = f.controller.remove();
  await Promise.resolve();
  f.select({ ...run, id: 'two' });
  pending.resolve();
  await deleting;
  expect(f.workspace.deletePracticeRun).toHaveBeenCalledExactlyOnceWith('one');
  expect(f.state).toMatchObject({ selectedId: 'two', mobileDetail: true, message: '' });
  expect(f.ports.refresh).toHaveBeenCalledOnce();
});
it('uses the existing plain-text projection without acquiring storage', async () => {
  const f = fixture();
  await f.controller.copy();
  expect(f.ports.copy).toHaveBeenCalledExactlyOnceWith(practiceRunText(run));
  expect(f.state).toMatchObject({
    message: 'Responses copied as plain text.',
    copyText: '',
    busy: false,
  });
  expect(f.ports.workspace).not.toHaveBeenCalled();
});
it('offers the same literal plain text for manual selection when the clipboard is blocked', async () => {
  const f = fixture();
  f.ports.copy.mockRejectedValueOnce(new Error('Denied'));
  await f.controller.copy();
  expect(f.state).toMatchObject({
    copyText: practiceRunText(run),
    message: 'Select and copy the text below.',
    error: '',
  });
  f.controller.reset();
  expect(f.state.copyText).toBe('');
});
it.each([false, true])(
  'ignores stale clipboard results after changing the run (failed=%s)',
  async (failed) => {
    const f = fixture(),
      pending = deferred<void>();
    f.ports.copy.mockReturnValueOnce(pending.promise);
    const copying = f.controller.copy();
    f.select({ ...run, id: 'two' });
    if (failed) pending.reject(new Error('Denied'));
    else pending.resolve();
    await copying;
    expect(f.state).toMatchObject({ selectedId: 'two', copyText: '', message: '', busy: false });
  },
);
it('exports the existing bounded archive, without ownership fields or storage writes', async () => {
  const f = fixture();
  await f.controller.exportRun();
  const [content, filename] = f.ports.download.mock.calls[0];
  expect(filename).toBe('patternverse-practice-responses.json');
  expect(parsePracticeArchive(content)).toMatchObject({ id: 'one', responses: run.responses });
  expect(JSON.parse(content).run).not.toHaveProperty('workspaceId');
  expect(f.ports.workspace).not.toHaveBeenCalled();
});
it.each(['archive', 'download'])(
  'reports %s failures through the same action error boundary',
  async (failure) => {
    const f = fixture();
    if (failure === 'archive') f.select({ ...run, title: '' });
    else
      f.ports.download.mockImplementationOnce(() => {
        throw new Error('Download unavailable');
      });
    await f.controller.exportRun();
    expect(f.state.error).toBe(
      failure === 'archive' ? 'Invalid or oversized practice text.' : 'Download unavailable',
    );
    expect(f.state.busy).toBe(false);
  },
);
it('guards repeated clicks and overlapping actions while another action is pending', async () => {
  const f = fixture(),
    pending = deferred<void>();
  f.ports.copy.mockReturnValueOnce(pending.promise);
  const copying = f.controller.copy();
  await f.controller.copy();
  await f.controller.exportRun();
  await f.controller.remove();
  await f.controller.rename();
  f.controller.toggleRename();
  expect(f.ports.copy).toHaveBeenCalledOnce();
  expect(f.ports.confirm).not.toHaveBeenCalled();
  expect(f.ports.workspace).not.toHaveBeenCalled();
  expect(f.ports.download).not.toHaveBeenCalled();
  expect(f.state.renaming).toBe(false);
  pending.resolve();
  await copying;
});
it('suppresses late failures without attaching them to a different selected run', async () => {
  const f = fixture(),
    pending = deferred<void>();
  f.workspace.renamePracticeRun.mockReturnValueOnce(pending.promise);
  const saving = f.controller.rename();
  await Promise.resolve();
  f.select({ ...run, id: 'two' });
  pending.reject(new Error('Failure for old selection'));
  await saving;
  expect(f.state).toMatchObject({ selectedId: 'two', error: '', busy: false });
});
it('disposal before storage acquisition prevents a new mutation', async () => {
  const f = fixture(),
    pending = deferred<typeof f.workspace>();
  f.ports.workspace.mockReturnValueOnce(pending.promise);
  const saving = f.controller.rename();
  f.controller.dispose();
  f.ports.changed.mockClear();
  pending.resolve(f.workspace);
  await saving;
  expect(f.workspace.renamePracticeRun).not.toHaveBeenCalled();
  expect(f.ports.refresh).not.toHaveBeenCalled();
  expect(f.ports.changed).not.toHaveBeenCalled();
});
it.each([false, true])(
  'finishes an already-started write without post-unmount refresh/view updates (failed=%s)',
  async (failed) => {
    const f = fixture(),
      pending = deferred<void>();
    f.workspace.renamePracticeRun.mockReturnValueOnce(pending.promise);
    const saving = f.controller.rename();
    await Promise.resolve();
    f.controller.dispose();
    f.ports.changed.mockClear();
    if (failed) pending.reject(new Error('Failure'));
    else pending.resolve();
    await saving;
    expect(f.workspace.renamePracticeRun).toHaveBeenCalledOnce();
    expect(f.ports.refresh).not.toHaveBeenCalled();
    expect(f.ports.changed).not.toHaveBeenCalled();
  },
);
it('ignores actions after disposal', async () => {
  const f = fixture();
  f.controller.dispose();
  f.controller.dispose();
  f.controller.select('two');
  f.controller.reset();
  f.controller.back();
  f.controller.toggleRename();
  f.controller.setName('After closing');
  await f.controller.rename();
  await f.controller.remove();
  await f.controller.copy();
  await f.controller.exportRun();
  expect(f.ports.changed).not.toHaveBeenCalled();
  expect(f.ports.workspace).not.toHaveBeenCalled();
  expect(f.ports.copy).not.toHaveBeenCalled();
  expect(f.ports.download).not.toHaveBeenCalled();
});
