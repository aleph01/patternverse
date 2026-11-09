// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VerseSelector from './VerseSelector.svelte';

const verses = [
  ['learning', 'Learning'],
  ['decision-making', 'Decision Making'],
  ['creativity', 'Creativity'],
  ['architecture', 'Architecture'],
].map(([id, title]) => ({
  id: id!,
  title: title!,
  key: `commons:${id}`,
  sourceId: 'commons',
  itemKeys: [],
}));

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('collapsing Verse selector', () => {
  it('selects immediately, fades the chooser, and restores the selected tile and scrolling on reopen', async () => {
    const onselect = vi.fn();
    const view = render(VerseSelector, { verses, selected: 'all', onselect });
    const track = view.container.querySelector<HTMLElement>('.verse-track[data-area="thinking"]')!;
    track.scrollLeft = 123;
    await fireEvent.scroll(track);
    const choice = screen.getByRole('button', { name: 'Decision Making' });
    choice.focus();
    await fireEvent.click(choice);
    expect(onselect).toHaveBeenLastCalledWith('commons:decision-making');
    expect(screen.getByRole('heading', { name: 'Decision Making' })).toBeTruthy();
    expect((view.container.querySelector('.verse-chooser') as HTMLElement).inert).toBe(true);
    expect(view.container.querySelector('.verse-selector')!.getAttribute('data-state')).toBe(
      'closing',
    );
    await waitFor(() =>
      expect(view.container.querySelector('.verse-selector')!.getAttribute('data-state')).toBe(
        'closed',
      ),
    );
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Change verse' }));
    await view.rerender({ selected: 'commons:decision-making' });
    await fireEvent.click(screen.getByRole('button', { name: 'Change verse' }));
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Decision Making' })),
    );
    expect(track.scrollLeft).toBe(123);
  });

  it('keeps Area browsing separate from the selected Verse when closing and reopening', async () => {
    const onselect = vi.fn();
    render(VerseSelector, { verses, selected: 'commons:learning', onselect });
    await fireEvent.click(screen.getByRole('button', { name: 'Change verse' }));
    await fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Verse Areas' })).getByRole('button', {
        name: 'Arts & Design',
      }),
    );
    expect(screen.queryByRole('button', { name: 'All verses' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onselect).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Learning' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Change verse' }));
    expect(screen.queryByRole('button', { name: 'Learning' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Architecture' })).toBeTruthy();
    await fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Verse Areas' })).getByRole('button', {
        name: 'All',
      }),
    );
    expect(screen.getByRole('button', { name: 'Learning' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Architecture' })).toBeTruthy();
  });

  it('supports an already-selected Verse, selecting it again, and external navigation', async () => {
    const onselect = vi.fn();
    const view = render(VerseSelector, { verses, selected: 'commons:learning', onselect });
    expect(view.container.querySelector('.verse-selector')!.getAttribute('data-state')).toBe(
      'closed',
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Change verse' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Learning' }));
    expect(onselect).toHaveBeenLastCalledWith('commons:learning');
    await waitFor(() =>
      expect(view.container.querySelector('.verse-selector')!.getAttribute('data-state')).toBe(
        'closed',
      ),
    );
    await view.rerender({ selected: 'commons:architecture' });
    expect(screen.getByRole('heading', { name: 'Architecture' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Change verse' }));
    expect(screen.getByRole('button', { name: 'Architecture' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('scrolls with arrow controls and honors reduced motion when choosing or closing', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    const oncollapse = vi.fn();
    const view = render(VerseSelector, { verses, selected: 'all', onselect: vi.fn(), oncollapse });
    const track = view.container.querySelector<HTMLElement>('.verse-track[data-area="thinking"]')!;
    Object.defineProperties(track, { clientWidth: { value: 200 }, scrollWidth: { value: 600 } });
    track.scrollBy = vi.fn();
    await fireEvent.scroll(track);
    await fireEvent.click(
      screen.getByRole('button', { name: 'More Verses in Thinking & Learning' }),
    );
    expect(track.scrollBy).toHaveBeenCalledWith({ left: 160, behavior: 'instant' });
    await fireEvent.click(screen.getByRole('button', { name: 'Learning' }));
    expect(view.container.querySelector('.verse-selector')!.getAttribute('data-state')).toBe(
      'closed',
    );
    expect(oncollapse).toHaveBeenCalledOnce();
    await fireEvent.click(screen.getByRole('button', { name: 'Change verse' }));
    await fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(view.container.querySelector('.verse-selector')!.getAttribute('data-state')).toBe(
      'closed',
    );
  });
});
