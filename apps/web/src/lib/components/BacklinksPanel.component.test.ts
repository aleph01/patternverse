// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { EntitySummary } from '$lib/server/commons';
import BacklinksPanel from './BacklinksPanel.svelte';

const originalDialogMethods = Object.fromEntries(
  ['showModal', 'close'].map((key) => [
    key,
    Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, key),
  ]),
);
const originalScrollIntoView = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollIntoView',
);
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      if (!this.open) return;
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  for (const [key, descriptor] of Object.entries(originalDialogMethods)) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }
  if (originalScrollIntoView)
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScrollIntoView);
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  document.body.style.overflow = '';
});

const items: EntitySummary[] = Array.from({ length: 41 }, (_, index) => ({
  id: `pattern-${index + 1}`,
  sourceId: 'commons',
  type: 'pattern',
  status: 'published',
  title: `Pattern ${index + 1}`,
  summary: `Summary ${index + 1}`,
  url: `/pattern/pattern-${index + 1}`,
}));

it('starts without entries, opens separately, paginates all backlinks, and resets on reopen', async () => {
  document.body.style.overflow = 'auto';
  render(BacklinksPanel, { items, title: 'Working Memory' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.queryByRole('link')).toBeNull();
  const trigger = screen.getByRole('button', { name: 'Linked by 41' });
  await fireEvent.click(trigger);
  const panel = within(await screen.findByRole('dialog', { name: 'Linked by 41' }));
  expect(document.body.style.overflow).toBe('hidden');
  expect(panel.getByText('Entries linking to “Working Memory”.')).toBeTruthy();
  expect(panel.getAllByRole('link')).toHaveLength(20);
  expect((panel.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  await fireEvent.click(panel.getByRole('button', { name: 'Next page' }));
  expect(panel.getAllByRole('link')[0].getAttribute('href')).toBe('/pattern/pattern-21');
  expect(panel.getByRole('status').textContent).toContain('21–40 of 41');
  await fireEvent.click(panel.getByRole('button', { name: 'Next page' }));
  expect(panel.getAllByRole('link')).toHaveLength(1);
  expect(panel.getByRole('link').getAttribute('href')).toBe('/pattern/pattern-41');
  expect((panel.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  await fireEvent.click(panel.getByRole('button', { name: 'Close linked by' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.queryByRole('link')).toBeNull();
  expect(document.body.style.overflow).toBe('auto');
  expect(document.activeElement).toBe(trigger);
  await fireEvent.click(trigger);
  const reopened = within(await screen.findByRole('dialog'));
  expect(reopened.getByRole('status').textContent).toContain('1–20 of 41');
});

it('omits pagination for a short list, preserves source URLs, and releases scroll on navigation', async () => {
  const view = render(BacklinksPanel, {
    title: 'Working Memory',
    items: [
      items[0],
      { ...items[0], sourceId: 'personal', title: 'My pattern', url: '/editor?id=pattern-1' },
    ],
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Linked by 2' }));
  const panel = within(await screen.findByRole('dialog'));
  expect(panel.queryByRole('navigation')).toBeNull();
  expect(panel.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
    '/pattern/pattern-1',
    '/editor?id=pattern-1',
  ]);
  view.unmount();
  expect(document.body.style.overflow).toBe('');
});
