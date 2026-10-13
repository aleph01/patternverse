// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { createIndexedDbWorkspace, type LocalWorkspace } from '@patternverse/workspace';
import PracticeHistory from './PracticeHistory.svelte';
import { notifyWorkspaceChanged } from '$lib/client/workspace-changes';

let workspace: LocalWorkspace;
vi.mock('$lib/client/workspace', () => ({ getLocalWorkspace: async () => workspace }));
const input = {
  id: 'run',
  patternRef: { sourceId: 'commons', entityId: 'test-pattern' },
  patternType: 'pattern' as const,
  patternTitle: 'Test Pattern',
  title: 'Planning the launch',
  verseIds: ['decision-making'],
  origin: 'patternverse' as const,
  status: 'completed' as const,
  revision: 1,
  responses: [{ id: 'question', prompt: 'What matters?', answer: 'Keep hosting costs low.' }],
};
beforeEach(() => {
  workspace = createIndexedDbWorkspace({
    indexedDB: new IDBFactory(),
    IDBKeyRange,
    databaseName: crypto.randomUUID(),
  });
});
afterEach(() => {
  cleanup();
  workspace.close();
  vi.restoreAllMocks();
});
it('searches answers, renames a run, and exposes plain text and a confirmation before deletion', async () => {
  await workspace.savePracticeRun(input);
  render(PracticeHistory, { commonsEntities: [] });
  await screen.findByRole('heading', { name: input.title });
  await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'hosting' } });
  expect(screen.getByRole('status').textContent).toContain('1 run');
  expect(screen.getAllByText('hosting').length).toBeGreaterThan(0);
  await fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
  await fireEvent.input(screen.getByRole('textbox', { name: 'Run title' }), {
    target: { value: 'A small release' },
  });
  await fireEvent.submit(screen.getByRole('button', { name: 'Save name' }).closest('form')!);
  await screen.findByRole('heading', { name: 'A small release' });
  await screen.findByText('Run renamed.');
  await fireEvent.click(screen.getByRole('button', { name: 'Copy plain text' }));
  await screen.findByRole('textbox', { name: 'Copy your responses' });
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(await workspace.getPracticeRun(input.id)).toBeDefined();
});

it('refreshes saved responses without clobbering an active rename draft', async () => {
  await workspace.savePracticeRun(input);
  render(PracticeHistory, { commonsEntities: [] });
  await screen.findByRole('heading', { name: input.title });
  await fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
  const field = screen.getByRole('textbox', { name: 'Run title' }) as HTMLInputElement;
  await fireEvent.input(field, { target: { value: 'My draft title' } });
  await workspace.renamePracticeRun(input.id, 'Remote title');
  notifyWorkspaceChanged({ origin: 'sync', topics: ['practice-runs'] });
  expect(field.value).toBe('My draft title');
  await fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
  await screen.findByRole('heading', { name: 'Remote title' });
  await workspace.deletePracticeRun(input.id);
  notifyWorkspaceChanged({ origin: 'restore', topics: ['practice-runs'] });
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Remote title' })).toBeNull());
});
it('keeps saved responses and exports available without offering individual response imports', async () => {
  await workspace.savePracticeRun(input);
  render(PracticeHistory, { commonsEntities: [] });
  await screen.findByRole('heading', { name: input.title });
  expect(screen.queryByRole('button', { name: 'Import responses' })).toBeNull();
  expect(screen.queryByRole('region', { name: 'Import practice responses' })).toBeNull();
  expect(screen.queryByRole('textbox', { name: 'Or paste a practice export' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy();
  expect(await workspace.listPracticeRuns()).toHaveLength(1);
  expect((await workspace.getPracticeRun(input.id))?.responses).toEqual(input.responses);
});

it('shows search and the empty state without an import entry point', async () => {
  render(PracticeHistory, { commonsEntities: [] });
  await screen.findByText('Your first run belongs here.');
  expect(screen.getByRole('searchbox', { name: 'Search practice history' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Import responses' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Preview import' })).toBeNull();
});

it('paginates twenty runs at a time and combines completion filters with response search', async () => {
  for (let i = 0; i < 21; i++)
    await workspace.savePracticeRun({
      ...input,
      id: `run-${String(i).padStart(2, '0')}`,
      title: `Saved run ${i}`,
      status: i === 20 ? 'in-progress' : 'completed',
    });
  render(PracticeHistory, { commonsEntities: [] });
  await screen.findByRole('navigation', { name: 'Practice history pagination' });
  expect(
    screen.getAllByRole('button', { pressed: false }).filter((b) => b.classList.contains('run')),
  ).toHaveLength(19);
  await fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
  expect(document.querySelectorAll('.run')).toHaveLength(1);
  await fireEvent.change(
    screen.getByRole('combobox', { name: 'Filter practice history by status' }),
    { target: { value: 'in-progress' } },
  );
  expect(screen.queryByRole('navigation', { name: 'Practice history pagination' })).toBeNull();
  expect(document.querySelectorAll('.run')).toHaveLength(1);
  await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'no matching answer' } });
  expect(screen.getByText('No matching runs. Try another word or clear the filters.')).toBeTruthy();
});

it('deletes only after confirmation and refreshes the empty state', async () => {
  await workspace.savePracticeRun(input);
  render(PracticeHistory, { commonsEntities: [] });
  await screen.findByRole('heading', { name: input.title });
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  await screen.findByText('Your first run belongs here.');
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining(input.title));
  expect(await workspace.getPracticeRun(input.id)).toBeUndefined();
  expect(screen.getByText('Saved run deleted.')).toBeTruthy();
});

it('keeps a failed rename draft available for retry', async () => {
  await workspace.savePracticeRun(input);
  const rename = vi
    .spyOn(workspace, 'renamePracticeRun')
    .mockRejectedValueOnce(new Error('Try again.'));
  render(PracticeHistory, { commonsEntities: [] });
  await screen.findByRole('heading', { name: input.title });
  await fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
  const field = screen.getByRole('textbox', { name: 'Run title' });
  await fireEvent.input(field, { target: { value: 'Retry title' } });
  await fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
  await screen.findByRole('alert');
  expect(field).toHaveProperty('value', 'Retry title');
  expect(await workspace.getPracticeRun(input.id)).toHaveProperty('title', input.title);
  await fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
  await screen.findByRole('heading', { name: 'Retry title' });
  expect(rename).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('alert')).toBeNull();
});

it('does not apply a pending rename result to a newly selected run', async () => {
  await workspace.savePracticeRun(input);
  await workspace.savePracticeRun({ ...input, id: 'second', title: 'Another run' });
  const original = workspace.renamePracticeRun.bind(workspace);
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const rename = vi.spyOn(workspace, 'renamePracticeRun').mockImplementation(async (id, name) => {
    await pending;
    await original(id, name);
  });
  render(PracticeHistory, { commonsEntities: [] });
  await screen.findByRole('button', { name: /Another run/ });
  await fireEvent.click(screen.getByRole('button', { name: new RegExp(input.title) }));
  await fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
  await fireEvent.input(screen.getByRole('textbox', { name: 'Run title' }), {
    target: { value: 'First run renamed' },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
  await waitFor(() => expect(rename).toHaveBeenCalledWith('run', 'First run renamed'));
  await fireEvent.click(screen.getByRole('button', { name: /Another run/ }));
  finish();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Rename' })).toHaveProperty('disabled', false),
  );
  expect(screen.getByRole('heading', { name: 'Another run' })).toBeTruthy();
  expect(await workspace.getPracticeRun('run')).toHaveProperty('title', 'First run renamed');
  expect(await workspace.getPracticeRun('second')).toHaveProperty('title', 'Another run');
  expect(screen.queryByText('Run renamed.')).toBeNull();
});

it('renders HTML-looking answers as literal text when highlighting search matches', async () => {
  const answer = '<img src=x onerror=alert(1)> literal answer';
  await workspace.savePracticeRun({ ...input, responses: [{ ...input.responses[0], answer }] });
  render(PracticeHistory, { commonsEntities: [] });
  await screen.findByRole('heading', { name: input.title });
  await fireEvent.input(screen.getByRole('searchbox'), { target: { value: '<img' } });
  expect(document.querySelector('.response p')?.textContent).toBe(answer);
  expect(document.querySelector('.response img')).toBeNull();
  expect(document.querySelector('.response mark')?.textContent).toBe('<img');
});
