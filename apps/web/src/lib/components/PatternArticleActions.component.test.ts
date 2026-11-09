// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/svelte';
import PatternArticleActions from './PatternArticleActions.svelte';
import type { PracticeAction } from '$lib/practice-options';

vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
vi.mock('$lib/worksheet/availability.svelte', () => ({
  worksheetEligibility: (definition: () => { source?: string } | undefined) => ({
    get available() {
      return Boolean(definition() && definition()?.source !== 'unavailable');
    },
  }),
}));
afterEach(cleanup);
const options: PracticeAction[] = ['quick-check', 'decision-brief'].map((id, index) => ({
  ref: { sourceId: 'commons', entityId: id },
  title: index ? 'Build a decision brief' : 'A quick decision check',
  summary: index ? 'Set scope and constraints.' : 'Find the question.',
  durationMinutes: index ? 10 : 2,
  runPath: `/practice/${id}/run`,
  articlePath: `/practice/${id}`,
  tryHref: `/practice/${id}/run`,
  miraHref: `/mira?source=commons&pattern=${id}`,
  worksheetDefinition: { source: id },
  needsAi: false,
  isTherapy: true,
}));
const props = {
  title: 'Define the decision',
  tryHref: '/pattern/define-the-decision/run',
  miraHref: '/mira?source=commons&pattern=define-the-decision',
  description: 'A short, structured reflection.',
  worksheetDefinition: { source: 'embedded' },
};

describe('one or many article practices', () => {
  it('keeps the existing three choices for a single practice', () => {
    render(PatternArticleActions, { ...props, practices: options.slice(0, 1) });
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('heading', { name: 'By yourself' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'With mira' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'In your own editor' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Try this pattern' }).getAttribute('href')).toBe(
      props.tryHref,
    );
    expect(screen.getByRole('button', { name: 'Open worksheet' })).toBeTruthy();
  });

  it('puts each practice and its distinct actions on one row', () => {
    render(PatternArticleActions, { ...props, practices: options });
    const matrix = screen.getByRole('table', { name: 'Practices and ways to use them' });
    expect(within(matrix).getAllByRole('row')).toHaveLength(3);
    for (const option of options) {
      const row = within(matrix)
        .getByRole('rowheader', { name: new RegExp(option.title) })
        .closest('tr')!;
      expect(
        within(row)
          .getByRole('link', { name: `Start ${option.title}` })
          .getAttribute('href'),
      ).toBe(option.tryHref);
      expect(
        within(row)
          .getByRole('link', { name: `Explore ${option.title} with mira` })
          .getAttribute('href'),
      ).toBe(option.miraHref);
      expect(
        within(row).getByRole('button', { name: `Open worksheet for ${option.title}` }),
      ).toBeTruthy();
    }
  });

  it('makes the compact shortcut choose a practice instead of silently opening the first', () => {
    render(PatternArticleActions, { ...props, practices: options, compact: true });
    const nav = screen.getByRole('navigation', { name: 'Pattern shortcuts' });
    expect(within(nav).getAllByRole('link')).toHaveLength(1);
    expect(
      within(nav).getByRole('link', { name: 'Choose from 2 practices' }).getAttribute('href'),
    ).toBe('#try-pattern-heading');
    expect(within(nav).queryByRole('button', { name: 'Open worksheet' })).toBeNull();
  });

  it('leaves unsupported combinations unavailable without borrowing another practice’s source', () => {
    render(PatternArticleActions, {
      ...props,
      practices: [
        options[0],
        {
          ...options[1],
          tryHref: undefined,
          miraHref: undefined,
          worksheetDefinition: { source: 'unavailable' },
        },
      ],
    });
    const row = screen.getByRole('rowheader', { name: /Build a decision brief/ }).closest('tr')!;
    expect(within(row).queryByRole('link')).toBeNull();
    expect(within(row).queryByRole('button')).toBeNull();
    expect(within(row).getByLabelText('Self-guided practice unavailable')).toBeTruthy();
    expect(within(row).getByLabelText('Worksheet unavailable')).toBeTruthy();
  });
});
