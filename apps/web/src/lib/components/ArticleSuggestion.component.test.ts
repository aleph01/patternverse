// @vitest-environment jsdom
import { webcrypto } from 'node:crypto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ArticleSuggestion from './ArticleSuggestion.svelte';
import { suggestionDraftKey } from '$lib/contributions/article-suggestion';

const { listEntities } = vi.hoisted(() => ({ listEntities: vi.fn() }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: async () => ({ listEntities }),
}));
const article = {
  sourceId: 'personal',
  id: 'my-article',
  type: 'pattern',
  title: 'A useful approach',
  body: '## Try this\n\nA practical example.',
  summary: 'A short summary.',
  attribution: 'Original author',
  status: 'draft',
  tags: ['PRIVATE TAG'],
  sourcePath: '/PRIVATE/source/path',
  verses: ['PRIVATE VERSE'],
};
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('crypto', webcrypto);
  listEntities.mockResolvedValue([
    article,
    { ...article, id: 'another', title: 'Unselected article', body: 'PRIVATE UNSELECTED BODY' },
    { ...article, id: 'public', sourceId: 'commons', title: 'Published article' },
    { ...article, id: 'verse', type: 'verse', title: 'Personal verse' },
    { ...article, id: 'empty', title: 'Empty article', body: '   ' },
  ]);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function selectArticle() {
  await screen.findByLabelText('Your article');
  await fireEvent.change(screen.getByLabelText('Your article'), {
    target: { value: 'my-article' },
  });
  await screen.findByRole('heading', { name: article.title });
}
const permit = () => fireEvent.click(screen.getByRole('checkbox'));

describe('personal article suggestions', () => {
  it('previews only the selected article and sends it with explicit permission', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(async (_url, options) =>
        options?.method === 'POST'
          ? Response.json(
              { accepted: true, id: JSON.parse(options.body).requestId },
              { status: 201 },
            )
          : Response.json({ available: true }),
      );
    vi.stubGlobal('fetch', fetch);
    render(ArticleSuggestion);
    await selectArticle();
    expect(
      screen.queryByRole('option', { name: /Published article|Personal verse|Empty article/ }),
    ).toBeNull();
    expect(screen.getByText(/A practical example/).textContent).toBe(article.body);
    const send = screen.getByRole('button', {
      name: 'Suggest article for review',
    }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    await fireEvent.input(screen.getByLabelText(/Why would this be useful/), {
      target: { value: 'It helps beginners.' },
    });
    await fireEvent.input(screen.getByLabelText(/Reply email/), {
      target: { value: 'author@example.com' },
    });
    await permit();
    await waitFor(() => expect(send.disabled).toBe(false));
    await fireEvent.submit(screen.getByRole('form', { name: 'Suggest an article' }));
    await screen.findByText('Your article suggestion is in the review inbox.');
    const sent = JSON.parse(
      fetch.mock.calls.find(([, options]) => options?.method === 'POST')![1].body,
    );
    expect(sent.suggestion).toEqual({
      body: article.body,
      summary: article.summary,
      attribution: article.attribution,
      reason: 'It helps beginners.',
      permission: true,
    });
    expect(sent.email).toBe('author@example.com');
    expect(JSON.stringify(sent)).not.toMatch(/PRIVATE|tags|sourcePath|verses/);
    expect(sent.article.path).toBe(`/suggestions/${sent.requestId}`);
    expect(localStorage.getItem(suggestionDraftKey)).toBeNull();
  });
  it('keeps a failed submission across reloads, retries the same copy and excludes contact details from storage', async () => {
    let accepted = false;
    const attempts: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url, options) => {
        if (options?.method !== 'POST') return Response.json({ available: true });
        const input = JSON.parse(options.body);
        attempts.push(input.requestId);
        return accepted
          ? Response.json({ accepted: true, id: input.requestId })
          : Response.json({ error: 'Try again later.' }, { status: 503 });
      }),
    );
    render(ArticleSuggestion);
    await selectArticle();
    await fireEvent.input(screen.getByLabelText(/Your name/), {
      target: { value: 'Private name' },
    });
    await fireEvent.input(screen.getByLabelText(/Reply email/), {
      target: { value: 'private@example.com' },
    });
    await permit();
    await fireEvent.submit(screen.getByRole('form', { name: 'Suggest an article' }));
    await screen.findByText('Try again later.');
    expect(localStorage.getItem(suggestionDraftKey)).not.toMatch(
      /Private name|private@example.com/,
    );
    cleanup();
    accepted = true;
    render(ArticleSuggestion);
    await screen.findByRole('heading', { name: article.title });
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    await permit();
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Suggest article for review' }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
    await fireEvent.submit(screen.getByRole('form', { name: 'Suggest an article' }));
    await screen.findByText('Your article suggestion is in the review inbox.');
    expect(attempts).toHaveLength(2);
    expect(attempts[0]).toBe(attempts[1]);
  });
  it('keeps submissions disabled when the service is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ available: false })));
    render(ArticleSuggestion);
    await selectArticle();
    await permit();
    await screen.findByText(/Article submissions are temporarily unavailable/);
    expect(
      (screen.getByRole('button', { name: 'Suggest article for review' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(localStorage.getItem(suggestionDraftKey)).toContain(article.id);
  });
  it('offers a writing path when no personal articles exist and reports storage failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ available: true })));
    listEntities.mockResolvedValueOnce([]);
    render(ArticleSuggestion);
    await screen.findByRole('link', { name: 'Write an article' });
    cleanup();
    listEntities.mockRejectedValueOnce(new Error('Storage unavailable'));
    render(ArticleSuggestion);
    await screen.findByText(/Your personal articles could not be loaded/);
  });
});
