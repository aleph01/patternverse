// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import ArticleWidget from '../ArticleWidget.svelte';

vi.mock('$app/paths', () => ({ base: '' }));
vi.mock('../assets', () => ({
  loadWidgetSource: vi.fn(async () => '<!doctype html><body>Library</body>'),
}));
afterEach(cleanup);

it.each(['identify-limiting-beliefs.html', 'explore-what-feels-wrong.html', 'identify-needs.html'])(
  'starts %s immediately and resizes only from its trusted host',
  async (src) => {
    const { container } = render(ArticleWidget, {
      widget: {
        src,
        title: 'Belief library',
        height: 900,
        fallback: 'Themes and structures.',
      },
    });
    await waitFor(() => expect(container.querySelector('iframe')).not.toBeNull());
    expect(container.querySelector('button')).toBeNull();
    const frame = container.querySelector('iframe')!;
    const post = vi.spyOn(frame.contentWindow!, 'postMessage');
    window.dispatchEvent(
      new MessageEvent('message', {
        source: frame.contentWindow,
        origin: window.location.origin,
        data: { type: 'article-widget-ready' },
      }),
    );
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({ autoResize: true }),
      window.location.origin,
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: window.location.origin,
        data: { type: 'article-widget-size', height: 4000 },
      }),
    );
    expect(frame.getAttribute('height')).toBe('900');
    window.dispatchEvent(
      new MessageEvent('message', {
        source: frame.contentWindow,
        origin: window.location.origin,
        data: { type: 'article-widget-size', height: 4000 },
      }),
    );
    await waitFor(() => expect(frame.getAttribute('height')).toBe('4000'));
  },
);
