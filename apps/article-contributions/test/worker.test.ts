import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHandler } from '../src/worker.js';
import manifest from '../dist/articles.json' with { type: 'json' };
import migration from '../migrations/0001_contributions.sql?raw';
import { seedReviewFixtures, previewIds } from './review-fixtures.js';
import type { ArticleContribution } from '../src/contract.js';

const origin = 'https://patternverse.org';
const article = Object.values(manifest)[0]!;
const limiter = { limit: vi.fn().mockResolvedValue({ success: true }) };
const settings = {
  ...env,
  SUBMISSIONS_ENABLED: 'true',
  ALLOWED_ORIGINS: origin,
  OWNER_EMAIL: 'contact@patternverse.org',
  SUBMISSION_LIMITER: limiter,
} as Env;
const handle = createHandler(),
  owner = createHandler(async () => true);
const post = (body: unknown, headers = {}) =>
  new Request(`${origin}/api/article-contributions`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
const submission = (): ArticleContribution => ({
  requestId: crypto.randomUUID(),
  article,
  name: '',
  email: '',
  website: '',
  edits: [],
  comments: [
    {
      id: crypto.randomUUID(),
      body: 'Please add an example.',
      anchor: {
        blockId: 'block-1',
        sectionId: 'intro',
        sectionTitle: 'Introduction',
        text: 'A useful approach.',
        quote: 'useful',
        start: 2,
        end: 8,
        x: 0.8,
        y: 0.2,
      },
    },
  ],
});

beforeEach(async () => {
  vi.clearAllMocks();
  limiter.limit.mockResolvedValue({ success: true });
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

describe('stored article contributions', () => {
  it('persists link-only suggestions and exposes their destinations in review and export', async () => {
    const body = submission();
    const destination = Object.values(manifest).find((item) => item.path !== article.path)!.path;
    body.comments = [];
    body.edits = [
      {
        blockId: 'block-0',
        sectionId: '',
        sectionTitle: 'Introduction',
        before: 'A useful pattern.',
        after: 'A useful pattern.',
        beforeLinks: [],
        afterLinks: [{ from: 2, to: 8, href: destination }],
      },
    ];
    expect((await handle(post(body), settings)).status).toBe(201);
    expect((await handle(post(body), settings)).status).toBe(201);
    const detail = await owner(
      new Request(`${origin}/owner/contributions/${body.requestId}`),
      settings,
    );
    const html = await detail.text();
    expect(html).toContain('Add link:');
    expect(html).toContain(`href="${destination}"`);
    const exported = await owner(
      new Request(`${origin}/owner/contributions/${body.requestId}/export`),
      settings,
    );
    expect(((await exported.json()) as ArticleContribution).edits[0]!.afterLinks).toEqual(
      body.edits[0]!.afterLinks,
    );
    const invalid = {
      ...body,
      requestId: crypto.randomUUID(),
      edits: [{ ...body.edits[0], afterLinks: [{ from: 2, to: 8, href: 'javascript:alert(1)' }] }],
    };
    expect((await handle(post(invalid), settings)).status).toBe(400);
  });
  it('stores all passages for one comment and includes each in owner review and export', async () => {
    const body = submission();
    const comment = body.comments[0]!;
    comment.additionalAnchors = [
      {
        ...comment.anchor,
        blockId: 'block-4',
        sectionTitle: 'Another section',
        text: 'A second explanation.',
        quote: 'second',
        start: 2,
        end: 8,
      },
    ];
    expect((await handle(post(body), settings)).status).toBe(201);
    expect((await handle(post(body), settings)).status).toBe(201);
    const detail = await owner(
      new Request(`${origin}/owner/contributions/${body.requestId}`),
      settings,
    );
    const html = await detail.text();
    expect(html).toContain('2 passages');
    expect(html).toContain('<blockquote>useful</blockquote>');
    expect(html).toContain('<blockquote>second</blockquote>');
    expect(html).toContain('Another section');
    const exported = await owner(
      new Request(`${origin}/owner/contributions/${body.requestId}/export`),
      settings,
    );
    expect(((await exported.json()) as ArticleContribution).comments).toEqual(body.comments);
    comment.additionalAnchors = [comment.anchor];
    expect((await handle(post({ ...body, requestId: crypto.randomUUID() }), settings)).status).toBe(
      400,
    );
  });
  it('persists one complete submission and makes retries idempotent', async () => {
    const body = submission();
    body.comments.push({
      ...body.comments[0]!,
      id: crypto.randomUUID(),
      body: 'A second comment.',
    });
    expect((await handle(post(body), settings)).status).toBe(201);
    expect(await (await handle(post(body), settings)).json()).toEqual({
      accepted: true,
      id: body.requestId,
    });
    const rows = await settings.INBOX.prepare('SELECT payload FROM contributions').all<{
      payload: string;
    }>();
    expect(rows.results).toHaveLength(1);
    expect(JSON.parse(rows.results[0]!.payload).comments).toHaveLength(2);
    expect(
      (await handle(post({ ...body, name: 'Recovered without contact details' }), settings)).status,
    ).toBe(201);
    body.comments[0]!.body = 'Different contents after acceptance.';
    expect((await handle(post(body), settings)).status).toBe(409);
  });
  it('accepts an older revision but warns the owner and never publishes it', async () => {
    const body = submission();
    body.article = { ...body.article, revision: '0'.repeat(64) };
    await handle(post(body), settings);
    const review = await owner(
      new Request(`${origin}/owner/contributions/${body.requestId}`),
      settings,
    );
    expect(await review.text()).toContain('published article has changed');
    expect(
      (await settings.INBOX.prepare('SELECT status FROM contributions').first<{ status: string }>())
        ?.status,
    ).toBe('pending');
  });
  it('rejects private/unknown articles, forged anchors, oversized bodies and cross-origin requests', async () => {
    const unknown = submission();
    unknown.article = { ...unknown.article, path: '/pattern/private-unknown' };
    expect((await handle(post(unknown), settings)).status).toBe(400);
    const forged = submission();
    forged.comments[0]!.anchor.quote = 'not in passage';
    expect((await handle(post(forged), settings)).status).toBe(400);
    expect(
      (await handle(post(submission(), { Origin: 'https://elsewhere.example' }), settings)).status,
    ).toBe(403);
    expect(
      (await handle(post({ ...submission(), name: 'a'.repeat(132000) }), settings)).status,
    ).toBe(413);
  });
  it('does not claim availability or acceptance while disabled or the database is unavailable', async () => {
    expect(
      await (
        await handle(new Request(`${origin}/api/article-contributions/status`), {
          ...settings,
          SUBMISSIONS_ENABLED: 'false',
        })
      ).json(),
    ).toEqual({ available: false });
    expect(
      (await handle(post(submission()), { ...settings, SUBMISSIONS_ENABLED: 'false' })).status,
    ).toBe(503);
    const broken = {
      ...settings,
      INBOX: new Proxy(settings.INBOX, {
        get(target, property, receiver) {
          if (property === 'prepare')
            return () => {
              throw new Error('Private database error');
            };
          return Reflect.get(target, property, receiver);
        },
      }),
    };
    expect((await handle(post(submission()), broken)).status).toBe(503);
  });
  it('enforces rate limits and fails closed when the limiter fails', async () => {
    limiter.limit.mockResolvedValueOnce({ success: false });
    expect((await handle(post(submission()), settings)).status).toBe(429);
    limiter.limit.mockRejectedValueOnce(new Error('Unavailable'));
    expect((await handle(post(submission()), settings)).status).toBe(503);
  });
  it('requires a verified owner JWT for every review, export and update', async () => {
    const body = submission();
    await handle(post(body), settings);
    for (const path of [
      '/owner/contributions',
      `/owner/contributions/${body.requestId}`,
      `/owner/contributions/${body.requestId}/export`,
    ]) {
      const response = await handle(
        new Request(`${origin}${path}`, {
          headers: { 'Cf-Access-Authenticated-User-Email': settings.OWNER_EMAIL },
        }),
        settings,
      );
      expect(response.status).toBe(403);
      expect(response.headers.get('Cache-Control')).toContain('no-store');
    }
  });
  it('escapes user content, records owner decisions atomically and rejects stale review forms', async () => {
    const body = submission();
    body.comments[0]!.body = '<script>unsafe</script>';
    await handle(post(body), settings);
    const detail = await owner(
      new Request(`${origin}/owner/contributions/${body.requestId}`),
      settings,
    );
    expect(await detail.text()).toContain('&lt;script&gt;unsafe&lt;/script&gt;');
    const request = () =>
      new Request(`${origin}/owner/contributions/${body.requestId}`, {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          version: '1',
          status: 'approved',
          label: 'clarity',
          note: 'Accepted wording; publication pending.',
        }),
      });
    expect((await owner(request(), settings)).status).toBe(303);
    expect((await owner(request(), settings)).status).toBe(409);
    expect(
      (await settings.INBOX.prepare('SELECT status FROM contributions').first<{ status: string }>())
        ?.status,
    ).toBe('approved');
    expect(
      (await settings.INBOX.prepare('SELECT * FROM contribution_events').all()).results,
    ).toHaveLength(1);
    const badOrigin = new Request(`${origin}/owner/contributions/${body.requestId}`, {
      method: 'POST',
      headers: { Origin: 'https://bad.example' },
    });
    expect((await owner(badOrigin, settings)).status).toBe(403);
    const inbox = await owner(
      new Request(`${origin}/owner/contributions?status=approved&q=unsafe&label=clarity`),
      settings,
    );
    expect(await inbox.text()).toContain(body.requestId);
  });
});

describe('review inbox', () => {
  const view = (query = '') =>
    owner(new Request(`${origin}/owner/contributions${query}`), settings);
  const update = (id: string, fields: Record<string, string>) =>
    owner(
      new Request(`${origin}/owner/contributions/${id}`, {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(fields),
      }),
      settings,
    );
  it('filters and counts submissions by real verse and collection metadata', async () => {
    await seedReviewFixtures(settings.INBOX);
    const page = await view('?verse=commons%3Asoftware-engineering');
    const html = await page.text();
    expect(page.status).toBe(200);
    expect(page.headers.get('Cache-Control')).toContain('private, no-store');
    expect(page.headers.get('Referrer-Policy')).toBe('same-origin');
    expect(page.headers.get('Content-Security-Policy')).toContain("script-src 'nonce-");
    expect(html).toContain('aria-label="Filter by verse"');
    expect(html).toContain('aria-label="Filter by collection"');
    expect(html).toContain('Review Singleton');
    expect(html).not.toContain('Review Define the Decision');
    expect(html).toContain('New<span class="pv-count">1</span>');
    expect(html).toContain('All<span class="pv-count">1</span>');
    const combined = await (
      await view(
        '?verse=commons%3Asoftware-engineering&collection=commons%3Agof-design-patterns&q=global&label=Examples',
      )
    ).text();
    expect(combined).toContain('Review Singleton');
    const changed = await (
      await view('?verse=commons%3Astatistics&collection=commons%3Agof-design-patterns')
    ).text();
    expect(changed).toContain('Review Report a Forecast Distribution');
    expect(changed).not.toContain('Review Singleton');
    const empty = await (await view('?q=%25')).text();
    expect(empty).not.toContain('class="pv-submission"');
    expect(empty).toContain('Clear filters');
    const oldest = await (await view('?sort=oldest')).text();
    expect(oldest.indexOf(`review=${previewIds[2]}`)).toBeLessThan(
      oldest.indexOf(`review=${previewIds[0]}`),
    );
  });
  it('paginates the queue without losing its taxonomy filters', async () => {
    await seedReviewFixtures(settings.INBOX);
    const template = await settings.INBOX.prepare('SELECT * FROM contributions WHERE id = ?')
      .bind(previewIds[1])
      .first<{
        article_path: string;
        article_revision: string;
        article_title: string;
        payload: string;
      }>();
    const inserts = Array.from({ length: 26 }, () =>
      settings.INBOX.prepare(
        'INSERT INTO contributions (id,payload_hash,article_path,article_revision,article_title,payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
      ).bind(
        crypto.randomUUID(),
        'test',
        template!.article_path,
        template!.article_revision,
        template!.article_title,
        template!.payload,
        '2026-10-20T00:00:00Z',
        '2026-10-20T00:00:00Z',
      ),
    );
    await settings.INBOX.batch(inserts);
    const first = await (
      await view('?verse=commons%3Asoftware-engineering&collection=commons%3Agof-design-patterns')
    ).text();
    expect(first.match(/class="pv-submission"/g)).toHaveLength(25);
    expect(first).toContain('Next page →');
    expect(first).toContain('verse=commons%3Asoftware-engineering');
    expect(first).toContain('collection=commons%3Agof-design-patterns');
    const second = await (
      await view(
        '?verse=commons%3Asoftware-engineering&collection=commons%3Agof-design-patterns&offset=25',
      )
    ).text();
    expect(second.match(/class="pv-submission"/g)).toHaveLength(2);
    expect(second).toContain('Previous page');
    expect(second).not.toContain('Next page →');
  });
  it('keeps notes during quick decisions and undoes the latest review atomically', async () => {
    await seedReviewFixtures(settings.INBOX);
    const id = previewIds[0]!;
    const returnTo = `/owner/contributions?verse=commons%3Adecision-making&review=${id}&tab=comments`;
    const saved = await update(id, {
      action: 'save',
      version: '1',
      status: 'reviewing',
      label: 'Sources',
      note: 'Keep this editorial note.',
      returnTo,
    });
    expect(saved.status).toBe(303);
    const approved = await update(id, {
      action: 'decision',
      version: '2',
      status: 'approved',
      returnTo,
    });
    expect(approved.status).toBe(303);
    const location = new URL(approved.headers.get('Location')!, origin);
    expect(location.searchParams.get('verse')).toBe('commons:decision-making');
    expect(location.searchParams.has('review')).toBe(false);
    expect(location.searchParams.get('changed')).toBe(id);
    expect(location.searchParams.get('version')).toBe('3');
    const stored = () =>
      settings.INBOX.prepare(
        'SELECT status,label,reviewer_note,version FROM contributions WHERE id = ?',
      )
        .bind(id)
        .first<{ status: string; label: string; reviewer_note: string; version: number }>();
    expect(await stored()).toEqual({
      status: 'approved',
      label: 'Sources',
      reviewer_note: 'Keep this editorial note.',
      version: 3,
    });
    const flashed = await (await view(location.search)).text();
    expect(flashed).toContain('>Undo</button>');
    expect((await update(id, { action: 'undo', version: '3', returnTo })).status).toBe(303);
    expect(await stored()).toEqual({
      status: 'reviewing',
      label: 'Sources',
      reviewer_note: 'Keep this editorial note.',
      version: 4,
    });
    expect((await update(id, { action: 'undo', version: '3', returnTo })).status).toBe(409);
    expect(
      (
        await settings.INBOX.prepare('SELECT * FROM contribution_events WHERE contribution_id = ?')
          .bind(id)
          .all()
      ).results,
    ).toHaveLength(3);
    const stale = await (await view(`${location.search}`)).text();
    expect(stale).not.toContain('>Undo</button>');
  });
  it('keeps invalid redirects local and preserves a conflicting unsaved note', async () => {
    await seedReviewFixtures(settings.INBOX);
    const id = previewIds[0]!;
    const changed = await update(id, {
      action: 'decision',
      status: 'approved',
      version: '1',
      returnTo: 'https://elsewhere.example/owner/contributions',
    });
    expect(changed.headers.get('Location')).toMatch(/^\/owner\/contributions\?/);
    const conflict = await update(id, {
      action: 'save',
      status: 'pending',
      version: '1',
      note: '<retain my note>',
      returnTo: '/owner/contributions',
    });
    expect(conflict.status).toBe(409);
    expect(await conflict.text()).toContain('&lt;retain my note&gt;');
  });
});
