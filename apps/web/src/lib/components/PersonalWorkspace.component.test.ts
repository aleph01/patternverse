// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { RawEntity } from '@patternverse/workspace';
import PersonalWorkspace from './PersonalWorkspace.svelte';

const local = vi.hoisted(() => ({ entities: [] as RawEntity[] }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: async () => ({
    listEntities: async () => local.entities,
    listSavedEntries: async () => [],
    updateEntity: async (id: string, change: (entity: RawEntity) => RawEntity) => {
      local.entities = local.entities.map((entity) => (entity.id === id ? change(entity) : entity));
    },
    mutateEntities: async (change: (entities: readonly RawEntity[]) => readonly RawEntity[]) => {
      local.entities = [...change(local.entities)];
    },
  }),
}));

beforeEach(() => {
  const base = { sourceId: 'personal', status: 'draft', body: '' } as const;
  local.entities = [
    { ...base, type: 'verse', id: 'first', title: 'First verse' },
    { ...base, type: 'verse', id: 'second', title: 'Second verse' },
    { ...base, type: 'pattern', id: 'pattern', title: 'My pattern', verses: ['first'] },
  ];
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  vi.restoreAllMocks();
});

it('retains host-owned drafts, focuses the extracted panel, and saves through the workspace boundary', async () => {
  render(PersonalWorkspace, { commonsEntities: [] });
  const manage = (await screen.findAllByRole('button', { name: 'Manage verse →' }))[0];
  await fireEvent.click(manage);
  const panel = document.querySelector('.manage-panel')!;
  await waitFor(() => expect(document.activeElement).toBe(panel));
  expect(screen.getByRole('button', { name: 'Delete verse' })).toHaveProperty('disabled', true);
  await fireEvent.input(screen.getByRole('textbox', { name: 'Name' }), {
    target: { value: 'Renamed verse' },
  });
  await fireEvent.input(screen.getByLabelText('Description'), {
    target: { value: 'My description' },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Save details' }));
  await screen.findByText('Name and description saved. The item stays private.');
  expect(local.entities[0]).toMatchObject({ title: 'Renamed verse', summary: 'My description' });
  expect(screen.getByRole('textbox', { name: 'Name' })).toHaveProperty('value', 'Renamed verse');
  expect(screen.getByRole('heading', { name: 'Manage verse: Renamed verse' })).toBeTruthy();
  await fireEvent.click(screen.getByRole('button', { name: 'Close management' }));
  expect(document.querySelector('.manage-panel')).toBeNull();
});

it('keeps membership errors visible and uses the selected destination on retry', async () => {
  render(PersonalWorkspace, { commonsEntities: [] });
  await fireEvent.click((await screen.findAllByRole('button', { name: 'Manage verse →' }))[0]);
  await fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Move this item');
  expect(local.entities[2]).toMatchObject({ verses: ['first'] });
  await fireEvent.change(screen.getByLabelText('Destination verse'), {
    target: { value: 'second' },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Move' }));
  await screen.findByText('Moved to the selected verse.');
  expect(local.entities[2]).toMatchObject({ verses: ['second'] });
  expect(screen.queryByRole('alert')).toBeNull();
});
