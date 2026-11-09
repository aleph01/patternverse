// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntitySummary } from '$lib/server/commons';
import CollectionGallery from './CollectionGallery.svelte';
import EntityList from './EntityList.svelte';

const originalDialogMethods = Object.fromEntries(
  ['showModal', 'close'].map((key) => [
    key,
    Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, key),
  ]),
);
let desktop: boolean;
let resize: (() => void) | undefined;
beforeEach(() => {
  desktop = true;
  resize = undefined;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return desktop;
      },
      addEventListener: (_name: string, listener: () => void) => {
        resize = listener;
      },
      removeEventListener: vi.fn(),
    })),
  );
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
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  for (const [key, descriptor] of Object.entries(originalDialogMethods)) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }
  document.body.style.overflow = '';
});

const items: EntitySummary[] = Array.from({ length: 9 }, (_, index) => ({
  id: `pattern-${index + 1}`,
  sourceId: 'commons',
  type: 'pattern',
  status: 'published',
  title: `Pattern ${index + 1}`,
  summary: `Summary ${index + 1}`,
  url: `/pattern/pattern-${index + 1}`,
}));
const collection: EntitySummary = {
  id: 'example',
  sourceId: 'commons',
  type: 'collection',
  status: 'published',
  title: 'Example collection',
  summary: 'A useful selection.',
  url: '/collection/example',
  verseNames: ['Learning'],
};

describe('Collection card gallery', () => {
  it('paginates four ordered cards, retains collection context, and clamps when items change', async () => {
    const props = { id: 'gallery', collection, items, open: true };
    const view = render(CollectionGallery, props);
    const dialog = await screen.findByRole('dialog', { name: 'Example collection' });
    const gallery = within(dialog);
    expect(gallery.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(
      items.slice(0, 4).map((item) => `${item.url}?collection=commons%3Aexample`),
    );
    expect(
      (gallery.getByRole('button', { name: 'Previous page' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    await fireEvent.click(gallery.getByRole('button', { name: 'Next page' }));
    expect(gallery.getByRole('status').textContent).toBe('5–8 of 9');
    expect(gallery.getAllByRole('link')[0].textContent).toContain('Pattern 5');
    await fireEvent.click(gallery.getByRole('button', { name: 'Next page' }));
    expect(gallery.getAllByRole('link')).toHaveLength(1);
    expect(gallery.getByRole('status').textContent).toBe('9–9 of 9');
    expect((gallery.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    await view.rerender({ ...props, items: items.slice(0, 4) });
    expect(gallery.getAllByRole('link')).toHaveLength(4);
    expect(gallery.queryByRole('navigation', { name: 'Collection pages' })).toBeNull();
    await view.rerender({ ...props, items: [] });
    expect(gallery.getByRole('status').textContent).toContain('no available items');
    expect(gallery.queryByRole('link')).toBeNull();
  });

  it('keeps identical personal and public IDs distinct and preserves private editor links', async () => {
    render(CollectionGallery, {
      id: 'gallery',
      collection: { ...collection, sourceId: 'personal' },
      open: true,
      items: [
        items[0],
        { ...items[0], sourceId: 'personal', title: 'My version', url: '/editor?id=pattern-1' },
      ],
    });
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual([
      '/pattern/pattern-1?collection=personal%3Aexample',
      '/editor?id=pattern-1&collection=personal%3Aexample',
    ]);
  });

  it('links desktop cards and their counts to the collection page and keeps mobile expansion', async () => {
    document.body.style.overflow = 'auto';
    render(EntityList, {
      items: [collection],
      layout: 'cards',
      collections: new Map([['commons:example', items]]),
    });
    const trigger = await screen.findByRole('link', {
      name: 'Open Example collection collection',
    });
    expect(trigger.getAttribute('href')).toBe('/collection/example');
    expect(trigger.hasAttribute('aria-haspopup')).toBe(false);
    const card = document.querySelector('a.feed-row');
    expect(card?.getAttribute('href')).toBe('/collection/example');
    expect(card?.hasAttribute('aria-haspopup')).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('auto');
    desktop = false;
    resize?.();
    expect(
      await screen.findByRole('button', { name: 'Show 9 patterns in Example collection' }),
    ).toBeTruthy();
  });
});
