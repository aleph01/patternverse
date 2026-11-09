import { describe, expect, it } from 'vitest';
import { parseContribution } from '../../../../article-contributions/src/contract';
import {
  draftKey,
  emptyAnchor,
  newContribution,
  readDraft,
  storeDraft,
  wordDiff,
  articleFeedbackBody,
  type ArticleFeedback,
} from './model';
const article = {
  sourceId: 'commons',
  id: 'example',
  type: 'pattern',
  title: 'Example',
  path: '/pattern/example',
  revision: 'a'.repeat(64),
};
describe('contribution draft recovery', () => {
  it('preserves structured quick feedback and its optional context through validation and draft recovery', () => {
    const feedback: ArticleFeedback = {
      categories: ['example', 'illustration'],
      context: 'Show how these options compare.',
    };
    const draft = newContribution(article);
    draft.comments = [
      {
        id: crypto.randomUUID(),
        anchor: emptyAnchor(),
        body: articleFeedbackBody(feedback),
        feedback,
      },
    ];
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    expect(storeDraft(storage, draft)).toBe(true);
    expect(readDraft(storage, article)?.comments[0]?.feedback).toEqual(feedback);
    expect(parseContribution(draft)?.comments[0]?.body).toBe(
      'Missing example · Missing illustration\n\nShow how these options compare.',
    );
    feedback.context = '';
    expect(parseContribution(draft)?.comments[0]?.feedback?.categories).toEqual([
      'example',
      'illustration',
    ]);
    feedback.categories = [];
    feedback.context = 'Something else could be clearer.';
    expect(parseContribution(draft)?.comments[0]?.body).toBe(feedback.context);
    feedback.context = '';
    expect(parseContribution(draft)).toBeNull();
  });
  it.each([['too-short', 'too-long'], ['example', 'example'], ['unrecognized']])(
    'rejects incompatible, repeated or unrecognized quick feedback categories: %j',
    (...categories) => {
      const draft = newContribution(article);
      draft.comments = [
        {
          id: crypto.randomUUID(),
          anchor: emptyAnchor(),
          body: 'Feedback',
          feedback: { categories: categories as ArticleFeedback['categories'], context: '' },
        },
      ];
      expect(parseContribution(draft)).toBeNull();
    },
  );
  it('rejects oversized context, passage anchors, and duplicate quick feedback records', () => {
    const draft = newContribution(article);
    const feedback: ArticleFeedback = { categories: ['error'], context: 'x'.repeat(3001) };
    draft.comments = [
      { id: crypto.randomUUID(), anchor: emptyAnchor(), body: 'Error or inaccuracy', feedback },
    ];
    expect(parseContribution(draft)).toBeNull();
    feedback.context = '';
    draft.comments[0]!.anchor.blockId = 'paragraph';
    expect(parseContribution(draft)).toBeNull();
    draft.comments[0]!.anchor = emptyAnchor();
    draft.comments.push({ ...draft.comments[0]!, id: crypto.randomUUID() });
    expect(parseContribution(draft)).toBeNull();
  });
  it('keeps one stable submission ID and original revision but excludes reply identity from local storage', () => {
    const draft = newContribution(article);
    draft.name = 'Private name';
    draft.email = 'reply@example.com';
    draft.comments.push({
      id: crypto.randomUUID(),
      anchor: emptyAnchor(),
      body: 'A general comment.',
    });
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    expect(storeDraft(storage, draft)).toBe(true);
    const recovered = readDraft(storage, { ...article, revision: 'b'.repeat(64) })!;
    expect(recovered.requestId).toBe(draft.requestId);
    expect(recovered.article.revision).toBe(article.revision);
    expect(recovered.name).toBe('');
    expect(recovered.email).toBe('');
    expect(recovered.comments).toHaveLength(1);
    expect(values.get(draftKey(article.path))).not.toContain('Private name');
  });
  it('recovers multi-passage comments and rejects duplicate or malformed passage references', () => {
    const draft = newContribution(article);
    const anchor = {
      ...emptyAnchor(),
      blockId: 'block-1',
      text: 'A useful passage.',
      quote: 'useful',
      start: 2,
      end: 8,
    };
    draft.comments = [
      {
        id: crypto.randomUUID(),
        anchor,
        additionalAnchors: [{ ...anchor, blockId: 'block-2' }],
        body: 'Explain the relationship.',
      },
    ];
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    expect(storeDraft(storage, draft)).toBe(true);
    expect(readDraft(storage, article)!.comments).toEqual(draft.comments);
    expect(parseContribution(draft)?.comments).toEqual(draft.comments);
    const comment = draft.comments[0]!;
    comment.additionalAnchors = [anchor];
    expect(parseContribution(draft)).toBeNull();
    comment.additionalAnchors = [{ ...anchor, quote: 'wrong' }];
    expect(parseContribution(draft)).toBeNull();
    comment.additionalAnchors = Array.from({ length: 100 }, (_, i) => ({
      ...anchor,
      blockId: `block-${i + 2}`,
    }));
    expect(parseContribution(draft)).toBeNull();
    comment.additionalAnchors.pop();
    expect(parseContribution(draft)).not.toBeNull();
    comment.anchor = emptyAnchor();
    expect(parseContribution(draft)).toBeNull();
  });
  it('handles blocked storage and rejects malformed drafts without crashing the article', () => {
    expect(
      storeDraft(
        {
          setItem: () => {
            throw Error('quota');
          },
          removeItem: () => {},
        },
        {
          ...newContribution(article),
          comments: [{ id: crypto.randomUUID(), body: 'Comment', anchor: emptyAnchor() }],
        },
      ),
    ).toBe(false);
    expect(readDraft({ getItem: () => '{bad' }, article)).toBeNull();
  });
  it('preserves both exact versions in bounded word diffs', () => {
    for (const [before, after] of [
      ['A useful option.', 'A clearer option.'],
      ['', 'New'],
      ['Delete', ''],
      ['x '.repeat(1000), 'y '.repeat(1000)],
    ]) {
      const changes = wordDiff(before!, after!);
      expect(
        changes
          .filter((c) => c.kind !== 'added')
          .map((c) => c.text)
          .join(''),
      ).toBe(before);
      expect(
        changes
          .filter((c) => c.kind !== 'removed')
          .map((c) => c.text)
          .join(''),
      ).toBe(after);
    }
  });
});
