// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CollectionBrowser from './CollectionBrowser.svelte';
import type { CollectionOverview } from '$lib/collection-navigation';

const state = vi.hoisted(() => ({
  url: new URL('https://patternverse.org/pattern/current?collection=commons:example'),
  mobile: false,
  goto: vi.fn(),
}));
vi.mock('$app/state', () => ({
  page: {
    get url() {
      return state.url;
    },
  },
}));
vi.mock('$app/navigation', () => ({ goto: state.goto }));
const items = ['first', 'current', 'last'].map((id) => ({
  id,
  sourceId: 'commons',
  title: id,
  type: 'pattern' as const,
  summary: '',
  status: 'published' as const,
  url: `/pattern/${id}`,
}));
const overviews: CollectionOverview[] = [
  {
    collection: {
      ...items[0],
      id: 'example',
      title: 'Example Collection',
      type: 'collection',
      url: '/collection/example',
    },
    items,
  },
];
const props = { overviews, article: { sourceId: 'commons', entityId: 'current' } };
beforeEach(() => {
  state.mobile = false;
  state.goto.mockReset();
  state.url = new URL('https://patternverse.org/pattern/current?collection=commons:example');
  window.matchMedia = vi.fn(
    () =>
      ({
        matches: state.mobile,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );
  Element.prototype.scrollIntoView = vi.fn();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('collection overview', () => {
  it('starts collapsed, opens only on click, and marks the current row', async () => {
    const { container } = render(CollectionBrowser, props);
    const trigger = screen.getByRole('button', { name: 'Browse Example Collection, 2 of 3' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await fireEvent.pointerEnter(container.querySelector('.collection-browser')!);
    expect(screen.queryByRole('region', { name: 'Collection overview' })).toBeNull();
    await fireEvent.click(trigger);
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Collection overview' })).toBeTruthy(),
    );
    expect(screen.getByRole('link', { name: 'current' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'last' }).getAttribute('href')).toBe(
      '/pattern/last?collection=commons%3Aexample',
    );
    await fireEvent.pointerLeave(container.querySelector('.collection-browser')!);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });
  it('keeps the inline panel open during outside interaction until explicitly closed', async () => {
    render(CollectionBrowser, props);
    await fireEvent.click(screen.getByRole('button', { name: /Browse Example/ }));
    await fireEvent.pointerDown(document.body);
    expect(screen.getByRole('region', { name: 'Collection overview' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Close collection overview' }));
    expect(screen.queryByRole('region', { name: 'Collection overview' })).toBeNull();
  });
  it('uses the same inline overview on mobile without locking page scrolling', async () => {
    state.mobile = true;
    render(CollectionBrowser, props);
    const trigger = screen.getByRole('button', { name: /Browse Example/ });
    expect(trigger.hasAttribute('aria-haspopup')).toBe(false);
    await fireEvent.click(trigger);
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Collection overview' })).toBeTruthy(),
    );
    expect(document.body.style.overflow).toBe('');
    await fireEvent.click(screen.getByRole('button', { name: 'Close collection overview' }));
    await waitFor(() => expect(document.body.style.overflow).toBe(''));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Collection overview' })).toBeNull();
  });
  it('switches overlapping collections without scrolling or discarding unrelated URL state', async () => {
    state.url = new URL('https://patternverse.org/pattern/current?mode=reading');
    render(CollectionBrowser, {
      ...props,
      overviews: [
        ...overviews,
        {
          collection: { ...overviews[0].collection, id: 'subset', title: 'Subset' },
          items: items.slice(1),
        },
      ],
    });
    await fireEvent.click(screen.getByRole('button', { name: /Browse Example/ }));
    await fireEvent.change(screen.getByRole('combobox', { name: 'Browsing collection' }), {
      target: { value: 'commons:subset' },
    });
    expect(state.goto).toHaveBeenCalledWith(
      '/pattern/current?mode=reading&collection=commons%3Asubset',
      { noScroll: true, keepFocus: true },
    );
  });
  it('renders nothing when the article belongs to no available collection', () => {
    render(CollectionBrowser, { ...props, article: { sourceId: 'personal', entityId: 'current' } });
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('links previous and next entries in collection order, retaining the context', () => {
    render(CollectionBrowser, props);
    expect(screen.getByRole('link', { name: 'Previous pattern: first' }).getAttribute('href')).toBe(
      '/pattern/first?collection=commons%3Aexample',
    );
    expect(screen.getByRole('link', { name: 'Next pattern: last' }).getAttribute('href')).toBe(
      '/pattern/last?collection=commons%3Aexample',
    );
  });
  it('disables unavailable arrows at collection boundaries', async () => {
    const view = render(CollectionBrowser, {
      ...props,
      article: { sourceId: 'commons', entityId: 'first' },
    });
    expect(screen.getByRole('button', { name: 'Previous pattern' }).hasAttribute('disabled')).toBe(
      true,
    );
    await view.rerender({ ...props, article: { sourceId: 'commons', entityId: 'last' } });
    expect(screen.getByRole('button', { name: 'Next pattern' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.getByRole('link', { name: 'Previous pattern: current' })).toBeTruthy();
  });
  it('closes the overview when navigating to a different article', async () => {
    const view = render(CollectionBrowser, props);
    await fireEvent.click(screen.getByRole('button', { name: /Browse Example/ }));
    await view.rerender({ ...props, article: { sourceId: 'commons', entityId: 'last' } });
    expect(screen.queryByRole('region', { name: 'Collection overview' })).toBeNull();
    expect(
      screen
        .getByRole('button', { name: 'Browse Example Collection, 3 of 3' })
        .getAttribute('aria-expanded'),
    ).toBe('false');
  });
  it('provides the article title as a fallback outside a collection', () => {
    render(CollectionBrowser, { overviews: [], article: props.article, title: 'Current Pattern' });
    expect(screen.getByText('Current Pattern')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Browse/ })).toBeNull();
  });
});
