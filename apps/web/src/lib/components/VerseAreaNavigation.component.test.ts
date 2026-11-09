// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HomeVerses from './HomeVerses.svelte';
import DesktopLibraryVerses from './DesktopLibraryVerses.svelte';
import MobileLibraryVerses from './MobileLibraryVerses.svelte';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
afterEach(cleanup);

const verses = [
  ['software-engineering', 'Software Engineering'],
  ['learning', 'Learning'],
  ['architecture', 'Architecture'],
  ['business', 'Business'],
  ['graphic-design', 'Graphic Design'],
].map(([id, title]) => ({
  id: id!,
  title: title!,
  sourceId: 'commons',
  key: `commons:${id}`,
  summary: `About ${title}`,
  itemKeys: [],
}));

describe('Area navigation', () => {
  it('groups and filters home links without changing their source-qualified destinations', async () => {
    render(HomeVerses, { verses });
    const home = screen.getByRole('region', { name: 'Verses' });
    expect(within(home).getAllByRole('link')).toHaveLength(5);
    const filters = within(home).getByRole('navigation', { name: 'Verse Areas' });
    expect(within(filters).queryByRole('button', { name: 'Everyday Life' })).toBeNull();
    await fireEvent.click(within(filters).getByRole('button', { name: 'Arts & Design' }));
    expect(
      within(home)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([expect.stringContaining('Architecture'), expect.stringContaining('Graphic Design')]);
    expect(within(home).getByRole('link', { name: 'Architecture' }).getAttribute('href')).toBe(
      '/library?verse=commons%3Aarchitecture',
    );
    await fireEvent.click(within(filters).getByRole('button', { name: 'All' }));
    expect(within(home).getAllByRole('link')).toHaveLength(5);
  });

  for (const [label, Component] of [
    ['desktop', DesktopLibraryVerses],
    ['mobile', MobileLibraryVerses],
  ] as const) {
    it(`${label} separates Area browsing from Verse selection and reveals an external selection`, async () => {
      const onselect = vi.fn();
      const view = render(Component, { verses, selected: 'commons:learning', onselect });
      const scope =
        label === 'mobile'
          ? within(screen.getByRole('region', { name: 'Choose a Verse' }))
          : within(view.container);
      await fireEvent.click(scope.getByRole('button', { name: 'Change verse' }));
      const filters = scope.getByRole('navigation', { name: 'Verse Areas' });
      await fireEvent.click(within(filters).getByRole('button', { name: 'Arts & Design' }));
      expect(onselect).not.toHaveBeenCalled();
      expect(scope.queryByRole('button', { name: 'Learning' })).toBeNull();
      await fireEvent.click(scope.getByRole('button', { name: 'Architecture' }));
      expect(onselect).toHaveBeenLastCalledWith(
        'commons:architecture',
        ...(label === 'mobile' ? [false] : []),
      );
      await view.rerender({ selected: 'commons:software-engineering' });
      await fireEvent.click(scope.getByRole('button', { name: 'Change verse' }));
      expect(
        scope.getByRole('button', { name: 'Software Engineering' }).getAttribute('aria-pressed'),
      ).toBe('true');
      expect(scope.queryByRole('button', { name: 'All verses' })).toBeNull();
    });
  }

  it('keeps personal Verse identity distinct from a Commons Verse with the same ID', async () => {
    const onselect = vi.fn();
    render(DesktopLibraryVerses, {
      verses: [...verses, { ...verses[1]!, sourceId: 'personal', key: 'personal:learning' }],
      selected: 'all',
      onselect,
    });
    const personal = screen.getByRole('region', { name: 'My Verses' });
    await fireEvent.click(within(personal).getByRole('button', { name: 'Learning · Mine' }));
    expect(onselect).toHaveBeenLastCalledWith('personal:learning');
  });
});
