// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render as renderSvelte,
  screen,
  within,
} from '@testing-library/svelte';
import type { ComponentProps } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ArticleReaderNavigation from './ArticleReaderNavigation.svelte';
const render = (
  component: typeof ArticleReaderNavigation,
  props: ComponentProps<typeof ArticleReaderNavigation>,
) => renderSvelte(component, { props });
import type { ArticleNavigationContext, NavigationCollection } from '$lib/article-navigation';

const state = vi.hoisted(() => ({
  url: new URL(
    'https://patternverse.org/pattern/current?collection=commons:second&verse=commons:life',
  ),
  goto: vi.fn(),
}));
vi.mock('$app/paths', () => ({ base: '/preview' }));
vi.mock('$app/state', () => ({
  page: {
    get url() {
      return state.url;
    },
  },
}));
vi.mock('$app/navigation', () => ({ goto: state.goto }));
const entry = (id: string, sourceId = 'commons') => ({
  id,
  sourceId,
  type: 'pattern' as const,
  title: id,
  url: `/pattern/${id}`,
});
const collection = (id: string, ids: string[]): NavigationCollection => ({
  ...entry(id),
  type: 'collection',
  url: `/collection/${id}`,
  verseKeys: ['commons:life'],
  items: ids.map((id) => entry(id)),
});
const context: ArticleNavigationContext = {
  asset: { path: '/library/navigation/example.json', sha256: 'example' },
  entity: entry('current'),
  verseKeys: ['commons:life'],
  navigation: {
    verses: [
      { ...entry('life'), type: 'verse', collectionKeys: ['commons:first', 'commons:second'] },
    ],
    collections: [
      collection('first', ['current', 'other']),
      collection('second', ['before', 'current', 'after']),
    ],
  },
};
const sections = [
  { id: 'details', title: 'Details', depth: 2 as const },
  { id: 'example', title: 'Example', depth: 3 as const },
];
beforeEach(() => {
  state.url = new URL(
    'https://patternverse.org/pattern/current?collection=commons:second&verse=commons:life',
  );
  state.goto.mockReset();
  window.matchMedia = vi.fn(
    () =>
      ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sticky article reader navigation', () => {
  it('follows the requested collection order and retains the base and Verse', () => {
    render(ArticleReaderNavigation, { context, sections });
    expect(screen.getByRole('button', { name: 'Browse second, 2 of 3' })).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Previous article: before' }).getAttribute('href'),
    ).toBe('/preview/pattern/before?collection=commons%3Asecond&verse=commons%3Alife');
    expect(screen.getByRole('link', { name: 'Next article: after' }).getAttribute('href')).toBe(
      '/preview/pattern/after?collection=commons%3Asecond&verse=commons%3Alife',
    );
  });
  it('ignores stale context and distinguishes identical IDs from different sources', () => {
    state.url = new URL('https://patternverse.org/pattern/current?collection=personal:first');
    render(ArticleReaderNavigation, {
      context: {
        ...context,
        navigation: {
          ...context.navigation,
          collections: [
            {
              ...collection('first', []),
              sourceId: 'personal',
              items: [entry('current', 'personal')],
            },
            ...context.navigation.collections,
          ],
        },
      },
      sections,
    });
    expect(screen.getByRole('button', { name: 'Browse first, 1 of 2' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Previous article' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.getByRole('link', { name: 'Next article: other' })).toBeTruthy();
  });
  it('keeps sections and collection articles in their own dropdowns and restores focus', async () => {
    render(ArticleReaderNavigation, { context, sections });
    const trigger = screen.getByRole('button', { name: 'On this page: Overview' });
    await fireEvent.click(trigger);
    const panel = screen.getByRole('region', { name: 'Reader navigation' });
    expect(
      within(panel)
        .getByRole('link', { name: /Details/ })
        .getAttribute('href'),
    ).toBe('#details');
    expect(
      within(panel)
        .getByRole('link', { name: /Overview/ })
        .getAttribute('aria-current'),
    ).toBe('location');
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Collection articles' })).toBeNull();
    const collectionTrigger = screen.getByRole('button', { name: 'Browse second, 2 of 3' });
    await fireEvent.click(collectionTrigger);
    expect(screen.getByRole('link', { name: 'current' }).getAttribute('aria-current')).toBe('page');
    expect(screen.queryByRole('navigation', { name: 'Article contents' })).toBeNull();
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.activeElement).toBe(collectionTrigger);
    await fireEvent.click(trigger);
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Reader navigation' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it('closes after a section link or an outside click without locking the page', async () => {
    render(ArticleReaderNavigation, { context, sections });
    const trigger = screen.getByRole('button', { name: 'On this page: Overview' });
    await fireEvent.click(trigger);
    await fireEvent.click(screen.getByRole('link', { name: /Details/ }));
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(trigger);
    await fireEvent.pointerDown(document.body);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.body.style.overflow).toBe('');
  });
  it('keeps unrelated URL state when changing the collection', async () => {
    state.url = new URL(
      'https://patternverse.org/pattern/current?collection=commons:second&mode=reading&verse=commons:life#example',
    );
    render(ArticleReaderNavigation, { context, sections });
    await fireEvent.click(screen.getByRole('button', { name: 'Browse second, 2 of 3' }));
    await fireEvent.change(screen.getByRole('combobox', { name: 'Browsing collection' }), {
      target: { value: 'commons:first' },
    });
    expect(state.goto).toHaveBeenCalledWith(
      '/pattern/current?collection=commons%3Afirst&mode=reading&verse=commons%3Alife#example',
      { noScroll: true, keepFocus: true },
    );
  });
  it('offers the collection at the end and works without article sections', async () => {
    render(ArticleReaderNavigation, {
      context: { ...context, entity: entry('after') },
      sections: [],
    });
    expect(
      screen.getByRole('link', { name: 'Back to collection: second' }).getAttribute('href'),
    ).toBe('/preview/collection/second?collection=commons%3Asecond&verse=commons%3Alife');
    expect(screen.queryByRole('button', { name: /On this page/ })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Browse second, 3 of 3' }));
    expect(screen.getByRole('link', { name: 'after' })).toBeTruthy();
  });
  it('provides contents outside a collection and no bar for an empty article', () => {
    const view = render(ArticleReaderNavigation, {
      context: { ...context, navigation: { verses: [], collections: [] } },
      sections,
    });
    expect(screen.getByRole('button', { name: 'On this page: Overview' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Next article/ })).toBeNull();
    view.unmount();
    const empty = render(ArticleReaderNavigation, {
      context: { ...context, navigation: { verses: [], collections: [] } },
      sections: [],
    });
    expect(empty.container.querySelector('.reader-navigation')).toBeNull();
  });
});
