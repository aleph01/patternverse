import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHandler } from '../src/worker.js';
import { parseContribution, type ArticleContribution } from '../src/contract.js';
import migration from '../migrations/0001_contributions.sql?raw';

const origin = 'https://patternverse.org';
const settings = {
  ...env,
  SUBMISSIONS_ENABLED: 'true',
  ALLOWED_ORIGINS: origin,
  SUBMISSION_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
} as Env;
const handle = createHandler(),
  owner = createHandler(async () => true);
function suggestion(): ArticleContribution {
  const requestId = crypto.randomUUID();
  return {
    requestId,
    article: {
      sourceId: 'personal',
      id: 'my-pattern',
      type: 'pattern',
      title: 'A new pattern',
      path: `/suggestions/${requestId}`,
      revision: 'a'.repeat(64),
    },
    suggestion: {
      body: '## Example\n\n<script>unsafe</script>',
      summary: 'A useful idea.',
      attribution: 'Original author',
      reason: 'Useful to beginners.',
      permission: true,
    },
    comments: [],
    edits: [],
    name: '',
    email: '',
    website: '',
  };
}
const post = (body: unknown, requestOrigin = origin) =>
  new Request(`${origin}/api/article-contributions`, {
    method: 'POST',
    headers: { Origin: requestOrigin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const read = (path: string) => owner(new Request(`${origin}/owner/contributions${path}`), settings);
beforeEach(async () => {
  await settings.INBOX.exec(
    migration
      .replace(/--[^\n]*/g, '')
      .replace(/\s+/g, ' ')
      .split(';')
      .filter((s) => s.trim())
      .map(
        (s) =>
          `${s.replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ').replace('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS ')};`,
      )
      .join('\n'),
  );
  await settings.INBOX.batch([
    settings.INBOX.prepare('DELETE FROM contribution_events'),
    settings.INBOX.prepare('DELETE FROM contributions'),
  ]);
});
describe('new article suggestions', () => {
  it('stores one private copy, exposes it for review and export, and preserves the review workflow', async () => {
    const body = suggestion();
    expect(
      (
        await handle(
          post({
            ...body,
            privateWorkspace: 'DO NOT KEEP',
            suggestion: { ...body.suggestion, answers: 'DO NOT KEEP' },
          }),
          settings,
        )
      ).status,
    ).toBe(201);
    expect((await handle(post(body), settings)).status).toBe(201);
    const queue = await (await read('')).text();
    expect(queue).toContain('New article suggestion');
    expect(queue).toContain('Suggested article');
    expect(queue).toContain('&lt;script&gt;unsafe&lt;/script&gt;');
    expect(queue).not.toContain('<script>unsafe</script>');
    expect(queue).not.toContain('published article has changed');
    expect(queue).toContain('Useful to beginners.');
    expect(queue).toContain('Original author');
    const exported = await read(`/${body.requestId}/export`);
    expect(exported.headers.get('Cache-Control')).toContain('private, no-store');
    expect(await exported.json()).toEqual(body);
    expect(
      (
        await handle(
          new Request(`${origin}/owner/contributions/${body.requestId}/export`),
          settings,
        )
      ).status,
    ).toBe(403);
    const decision = await owner(
      new Request(`${origin}/owner/contributions/${body.requestId}`, {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          version: '1',
          status: 'approved',
          note: 'Ready for editorial follow-up.',
        }),
      }),
      settings,
    );
    expect(decision.status).toBe(303);
    expect(
      await settings.INBOX.prepare('SELECT status FROM contributions WHERE id = ?')
        .bind(body.requestId)
        .first(),
    ).toEqual({ status: 'approved' });
    expect(
      (await settings.INBOX.prepare('SELECT id FROM contributions').all()).results,
    ).toHaveLength(1);
    expect(await (await read(`/${body.requestId}`)).text()).toContain(
      'Publishing is a separate step.',
    );
  });
  it('includes the article title and every submitted field in duplicate detection', async () => {
    const body = suggestion();
    await handle(post(body), settings);
    expect(
      (
        await handle(
          post({ ...body, name: 'Recovered name', email: 'author@example.com' }),
          settings,
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await handle(
          post({ ...body, article: { ...body.article, title: 'Changed title' } }),
          settings,
        )
      ).status,
    ).toBe(409);
    for (const field of ['body', 'summary', 'attribution', 'reason'] as const) {
      expect(
        (
          await handle(
            post({ ...body, suggestion: { ...body.suggestion, [field]: 'Changed content' } }),
            settings,
          )
        ).status,
      ).toBe(409);
    }
  });
  it('rejects missing permission, blank or oversized content, forged paths and mixed feedback', () => {
    const body = suggestion();
    for (const changes of [
      { permission: false },
      { permission: undefined },
      { body: '' },
      { body: 'a'.repeat(60001) },
      { reason: 'a'.repeat(4001) },
    ]) {
      expect(
        parseContribution({ ...body, suggestion: { ...body.suggestion, ...changes } }),
      ).toBeNull();
    }
    for (const article of [
      { ...body.article, path: '/pattern/pretend' },
      { ...body.article, sourceId: 'commons' },
      { ...body.article, type: 'verse' },
      { ...body.article, title: '  ' },
    ]) {
      expect(parseContribution({ ...body, article })).toBeNull();
    }
    expect(parseContribution({ ...body, suggestion: undefined })).toBeNull();
    expect(parseContribution({ ...body, edits: [{}] })).toBeNull();
  });
  it('keeps the existing origin, size and availability controls', async () => {
    expect((await handle(post(suggestion(), 'https://elsewhere.example'), settings)).status).toBe(
      403,
    );
    expect(
      (await handle(post(suggestion()), { ...settings, SUBMISSIONS_ENABLED: 'false' })).status,
    ).toBe(503);
    expect(
      (await handle(post({ ...suggestion(), extra: 'a'.repeat(132000) }), settings)).status,
    ).toBe(413);
  });
});
