// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { createIndexedDbWorkspace, type LocalWorkspace } from '@patternverse/workspace';
import {
  createWorkspaceBackup,
  encodeWorkspaceBackup,
  type WorkspaceBackup as Backup,
} from '@patternverse/workspace/backup';
import WorkspaceBackup from './WorkspaceBackup.svelte';
import { observeWorkspaceWrites } from '$lib/client/workspace';
import { readAutomaticSync } from '$lib/client/sync-preferences';

let workspace: LocalWorkspace;
vi.mock('$lib/client/workspace', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$lib/client/workspace')>()),
  getLocalWorkspace: async () => workspace,
}));
beforeEach(async () => {
  localStorage.clear();
  workspace = observeWorkspaceWrites(
    createIndexedDbWorkspace({
      indexedDB: new IDBFactory(),
      IDBKeyRange,
      databaseName: crypto.randomUUID(),
    }),
  );
  await workspace.createEntity({ id: 'current', type: 'pattern', title: 'Current idea', body: '' });
});
afterEach(() => {
  cleanup();
  workspace.close();
  vi.restoreAllMocks();
  localStorage.clear();
});
async function backup() {
  return createWorkspaceBackup({
    ...(await workspace.readWorkspaceData()),
    entities: [
      {
        id: 'restored',
        type: 'pattern',
        title: 'Restored idea',
        sourceId: 'personal',
        status: 'draft',
        body: 'My article',
      },
    ],
  });
}
async function upload(data: Backup | string) {
  const bytes =
    typeof data === 'string' ? new TextEncoder().encode(data) : encodeWorkspaceBackup(data);
  const file = new File([], 'my-backup.cbor');
  Object.defineProperty(file, 'arrayBuffer', { value: async () => new Uint8Array(bytes).buffer });
  await fireEvent.change(screen.getByLabelText('Choose a workspace backup'), {
    target: { files: [file] },
  });
}

it('previews without writing and requires explicit confirmation before replacing, with recovery', async () => {
  const before = await workspace.readWorkspaceData();
  const incoming = await backup();
  render(WorkspaceBackup);
  await fireEvent.click(screen.getByRole('button', { name: 'Restore from backup' }));
  await upload(incoming);
  await screen.findByRole('button', { name: 'Replace workspace' });
  expect(await workspace.readWorkspaceData()).toEqual(before);
  expect(
    (screen.getByRole('button', { name: 'Replace workspace' }) as HTMLButtonElement).disabled,
  ).toBe(true);
  await fireEvent.click(screen.getByRole('checkbox'));
  await fireEvent.click(screen.getByRole('button', { name: 'Replace workspace' }));
  await screen.findByText(/Workspace restored on this device/);
  expect(readAutomaticSync()).toBe(false);
  expect(screen.getByRole('status').textContent).toContain('Automatic sync is off');
  expect((await workspace.listEntities()).map((e) => e.id)).toEqual(['restored']);
  expect(await workspace.getRecoveryBackup()).toMatchObject(before);
  await fireEvent.click(screen.getByRole('button', { name: 'Review recovery copy' }));
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  expect(
    (screen.getByRole('button', { name: 'Replace workspace' }) as HTMLButtonElement).disabled,
  ).toBe(true);
  await fireEvent.click(screen.getByRole('checkbox'));
  await fireEvent.click(screen.getByRole('button', { name: 'Replace workspace' }));
  await waitFor(async () => expect(await workspace.readWorkspaceData()).toEqual(before));
});

it('cancel and unreadable files leave the workspace unchanged, and new files reset confirmation', async () => {
  const before = await workspace.readWorkspaceData();
  const incoming = await backup();
  render(WorkspaceBackup);
  await fireEvent.click(screen.getByRole('button', { name: 'Restore from backup' }));
  await upload(incoming);
  await screen.findByRole('button', { name: 'Replace workspace' });
  await fireEvent.click(screen.getByRole('checkbox'));
  await upload('not a backup');
  await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: 'Replace workspace' })).toBeNull();
  expect(await workspace.readWorkspaceData()).toEqual(before);
  await upload(JSON.stringify(incoming));
  await screen.findByRole('button', { name: 'Replace workspace' });
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByLabelText('Choose a workspace backup')).toBeNull();
  expect(await workspace.readWorkspaceData()).toEqual(before);
});

it('reports transaction failure without claiming success or clearing confirmation', async () => {
  render(WorkspaceBackup);
  vi.spyOn(workspace, 'replaceFromBackup').mockRejectedValue(new Error('Storage full'));
  const before = await workspace.readWorkspaceData();
  await fireEvent.click(screen.getByRole('button', { name: 'Restore from backup' }));
  await upload(await backup());
  await screen.findByRole('button', { name: 'Replace workspace' });
  await fireEvent.click(screen.getByRole('checkbox'));
  await fireEvent.click(screen.getByRole('button', { name: 'Replace workspace' }));
  await screen.findByRole('alert');
  expect(screen.queryByRole('status')).toBeNull();
  expect(await workspace.readWorkspaceData()).toEqual(before);
});
