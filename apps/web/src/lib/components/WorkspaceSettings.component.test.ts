// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import WorkspaceSettings from './WorkspaceSettings.svelte';
import { notifyWorkspaceChanged } from '$lib/client/workspace-changes';
import { FONT_SIZE_KEY } from '$lib/client/text-preferences';

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
  delete document.documentElement.dataset.fontSize;
});

it('keeps Dropbox controls out of general workspace settings', () => {
  render(WorkspaceSettings);
  expect(screen.queryByRole('switch', { name: /Automatic Dropbox sync/ })).toBeNull();
});

it.each(['small', 'standard', 'large'])(
  'saves the %s font size and restores it when settings reopen',
  async (size) => {
    const view = render(WorkspaceSettings);
    const field = screen.getByRole('combobox', { name: 'Font size' }) as HTMLSelectElement;
    await waitFor(() => expect(field.disabled).toBe(false));
    expect(field.value).toBe('standard');
    expect(Array.from(field.options, (option) => option.value)).toEqual([
      'small',
      'standard',
      'large',
    ]);
    await fireEvent.change(field, { target: { value: size } });
    expect(localStorage.getItem(FONT_SIZE_KEY)).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await screen.findByText('Settings saved on this device.');
    expect(localStorage.getItem(FONT_SIZE_KEY)).toBe(size);
    expect(document.documentElement.dataset.fontSize).toBe(size);
    view.unmount();
    render(WorkspaceSettings);
    await waitFor(() =>
      expect((screen.getByRole('combobox', { name: 'Font size' }) as HTMLSelectElement).value).toBe(
        size,
      ),
    );
  },
);

it('uses the standard font size for an unrecognized stored preference', async () => {
  localStorage.setItem(FONT_SIZE_KEY, 'huge');
  render(WorkspaceSettings);
  const field = screen.getByRole('combobox', { name: 'Font size' }) as HTMLSelectElement;
  await waitFor(() => expect(field.disabled).toBe(false));
  expect(field.value).toBe('standard');
});

it('keeps widget management in its own workspace tab', () => {
  render(WorkspaceSettings);
  expect(screen.queryByRole('heading', { name: /^Widgets$/ })).toBeNull();
  expect(screen.queryByRole('link', { name: /^Create widget$/ })).toBeNull();
});
