// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { rawEntitySchema } from '@patternverse/schema';
import { loadBearingsArticle } from './article';

vi.mock('$app/paths', () => ({
  resolve: (path: string, params: { id: string }) =>
    path.replace('[id]', encodeURIComponent(params.id)),
}));
const pattern = { sourceId: 'commons', id: 'same-id', title: 'Public pattern', summary: '' };
const article = {
  ...pattern,
  summary: 'Public summary',
  body: 'Full public article',
  html: '<p>Full public article</p>',
  standaloneHref: null,
};

it('loads a full public article on demand without consulting private storage', async () => {
  const getEntity = vi.fn(),
    fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(article)));
  const controller = new AbortController();
  expect(await loadBearingsArticle(pattern, { getEntity }, controller.signal, fetcher)).toEqual(
    article,
  );
  expect(fetcher).toHaveBeenCalledWith('/mira/reference/same-id', { signal: controller.signal });
  expect(getEntity).not.toHaveBeenCalled();
});

it('reads and sanitizes a private pattern locally even when a public record has the same ID', async () => {
  const entity = rawEntitySchema.parse({
    sourceId: 'personal',
    id: pattern.id,
    type: 'pattern',
    title: 'Private pattern',
    summary: 'My summary',
    status: 'draft',
    body: '## My private reading\n\nKeep this personal detail.\n\n<script>window.readerExecuted = true</script>\n\n[Unsafe](javascript:alert(1))\n\n```patternverse-language\n!ask secret {}\n```',
  });
  const getEntity = vi.fn().mockResolvedValue(entity),
    fetcher = vi.fn<typeof fetch>();
  const loaded = await loadBearingsArticle(
    { ...pattern, sourceId: 'personal' },
    { getEntity },
    new AbortController().signal,
    fetcher,
  );
  expect(loaded).toMatchObject({ sourceId: 'personal', id: pattern.id, title: 'Private pattern' });
  expect(loaded.html).toContain('Keep this personal detail.');
  expect(loaded.html).not.toMatch(/<script|javascript:|!ask secret/);
  expect(fetcher).not.toHaveBeenCalled();
});

it('does not substitute a public article for a missing private pattern or accept a mismatched response', async () => {
  const getEntity = vi.fn().mockResolvedValue(undefined),
    fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ ...article, sourceId: 'personal' })));
  await expect(
    loadBearingsArticle(
      { ...pattern, sourceId: 'personal' },
      { getEntity },
      new AbortController().signal,
      fetcher,
    ),
  ).rejects.toThrow('unavailable');
  expect(fetcher).not.toHaveBeenCalled();
  await expect(
    loadBearingsArticle(pattern, { getEntity }, new AbortController().signal, fetcher),
  ).rejects.toThrow('verified');
});

it('stops a canceled private read before accessing storage and gives a recoverable loading error', async () => {
  const controller = new AbortController();
  controller.abort();
  const getEntity = vi.fn(),
    fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }));
  await expect(
    loadBearingsArticle(
      { ...pattern, sourceId: 'personal' },
      { getEntity },
      controller.signal,
      fetcher,
    ),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(getEntity).not.toHaveBeenCalled();
  await expect(
    loadBearingsArticle(pattern, { getEntity }, new AbortController().signal, fetcher),
  ).rejects.toThrow('try again');
});
