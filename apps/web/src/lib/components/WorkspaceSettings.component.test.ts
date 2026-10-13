// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import WorkspaceSettings from './WorkspaceSettings.svelte';
import { notifyWorkspaceChanged } from '$lib/client/workspace-changes';

const local = vi.hoisted(() => ({ name: 'Test workspace' }));

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: async () => ({
    getWorkspace: async () => ({ name: local.name }),
    renameWorkspace: async (name: string) => {
      local.name = name;
      return { name };
    },
  }),
}));
beforeEach(() => {
  localStorage.clear();
  local.name = 'Test workspace';
});

it('refreshes synced names, protects a draft, then resumes after settings are saved', async () => {
  render(WorkspaceSettings);
  const field = screen.getByRole('textbox', { name: 'Workspace name' }) as HTMLInputElement;
  await waitFor(() => expect(field.value).toBe('Test workspace'));
  local.name = 'Synced workspace';
  notifyWorkspaceChanged({ origin: 'sync', topics: ['workspace'] });
  await waitFor(() => expect(field.value).toBe('Synced workspace'));
  await fireEvent.input(field, { target: { value: 'My draft' } });
  local.name = 'Another remote name';
  notifyWorkspaceChanged({ origin: 'restore', topics: ['workspace'] });
  await Promise.resolve();
  expect(field.value).toBe('My draft');
  await fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
  await screen.findByText('Settings saved on this device.');
  expect(field.value).toBe('My draft');
  local.name = 'Later remote name';
  notifyWorkspaceChanged({ origin: 'sync', topics: ['workspace'] });
  await waitFor(() => expect(field.value).toBe('Later remote name'));
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

it('keeps Dropbox controls out of general workspace settings', () => {
  render(WorkspaceSettings);
  expect(screen.queryByRole('switch', { name: /Automatic Dropbox sync/ })).toBeNull();
});
