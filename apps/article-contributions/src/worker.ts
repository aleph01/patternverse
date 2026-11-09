import reviewCatalog from '../dist/review-catalog.json' with { type: 'json' };
import manifestData from '../dist/articles.json' with { type: 'json' };
import { authorizeOwner } from '../../owner-stats/src/access.js';
import { boardUnavailable, reviewBoard } from './board.js';
import { type ContributionArticle, maxSubmissionBytes, parseContribution } from './contract.js';
import { json, readBody } from './http.js';

const manifest: Record<string, ContributionArticle> = manifestData;
const unavailable =
  'Submissions are temporarily unavailable. Your draft has been kept; please try again later.';
export function createHandler(authorize = authorizeOwner) {
  return async (request: Request, env: Env): Promise<Response> => {
    const url = new URL(request.url),
      origins = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
    if (!origins.includes(url.origin)) return json({ error: 'Not found.' }, 404);
    if (url.pathname.startsWith('/owner/contributions')) {
      try {
        if (!(await authorize(request, env)))
          return json({ error: 'Owner sign-in is required.' }, 403);
        return await reviewBoard(request, env, manifest, reviewCatalog);
      } catch {
        return boardUnavailable();
      }
    }
    if (url.pathname === '/api/article-contributions/status' && request.method === 'GET') {
      try {
        if (env.SUBMISSIONS_ENABLED !== 'true' || !env.INBOX || !env.SUBMISSION_LIMITER)
          return json({ available: false });
        await env.INBOX.prepare('SELECT id FROM contributions LIMIT 1').all();
        return json({ available: true });
      } catch {
        return json({ available: false });
      }
    }
    if (url.pathname !== '/api/article-contributions') return json({ error: 'Not found.' }, 404);
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405, { Allow: 'POST' });
    if (!origins.includes(request.headers.get('Origin') ?? ''))
      return json({ error: 'Submit from the Patternverse article.' }, 403);
    if (request.headers.get('Content-Type')?.split(';')[0]?.trim() !== 'application/json')
      return json({ error: 'Use JSON.' }, 415);
    if (env.SUBMISSIONS_ENABLED !== 'true' || !env.INBOX || !env.SUBMISSION_LIMITER)
      return json({ error: unavailable }, 503);
    try {
      const limited = await env.SUBMISSION_LIMITER.limit({
        key: request.headers.get('CF-Connecting-IP') ?? 'unknown',
      });
      if (!limited.success)
        return json({ error: 'Please wait a minute before submitting again.' }, 429, {
          'Retry-After': '60',
        });
      let input: unknown;
      try {
        input = JSON.parse(await readBody(request, maxSubmissionBytes));
      } catch (error) {
        return json(
          {
            error:
              error instanceof RangeError
                ? 'This contribution is too large. Please shorten it.'
                : 'Check your contribution and try again.',
          },
          error instanceof RangeError ? 413 : 400,
        );
      }
      const submission = parseContribution(input);
      if (!submission)
        return json(
          {
            error:
              'Check your contribution and sharing permission, and use a valid email or leave it empty.',
          },
          400,
        );
      const article = submission.suggestion
        ? submission.article
        : manifest[submission.article.path];
      if (
        !article ||
        article.sourceId !== submission.article.sourceId ||
        article.id !== submission.article.id ||
        article.type !== submission.article.type
      )
        return json({ error: 'Only published Commons articles accept contributions.' }, 400);
      submission.article = { ...article, revision: submission.article.revision };
      // Recovery retries may lose optional reply details, which are never saved locally.
      const payload = JSON.stringify(submission),
        fingerprint = JSON.stringify({
          requestId: submission.requestId,
          article: {
            ...submission.article,
            title: submission.suggestion ? submission.article.title : '',
          },
          comments: submission.comments,
          edits: submission.edits,
          ...(submission.suggestion ? { suggestion: submission.suggestion } : {}),
        }),
        hash = Array.from(
          new Uint8Array(
            await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint)),
          ),
          (b) => b.toString(16).padStart(2, '0'),
        ).join('');
      const now = new Date().toISOString();
      await env.INBOX.prepare(
        'INSERT INTO contributions (id, payload_hash, article_path, article_revision, article_title, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
      )
        .bind(
          submission.requestId,
          hash,
          article.path,
          submission.article.revision,
          article.title,
          payload,
          now,
          now,
        )
        .run();
      const saved = await env.INBOX.prepare(
        'SELECT id, payload_hash FROM contributions WHERE id = ?',
      )
        .bind(submission.requestId)
        .first<{ id: string; payload_hash: string }>();
      if (!saved) return json({ error: unavailable }, 503);
      if (saved.payload_hash !== hash)
        return json(
          {
            error:
              'This draft was already submitted with different contents. Start a new contribution to send more feedback.',
          },
          409,
        );
      return json({ accepted: true, id: saved.id }, 201);
    } catch {
      return json({ error: unavailable }, 503);
    }
  };
}
export default { fetch: createHandler() } satisfies ExportedHandler<Env>;
