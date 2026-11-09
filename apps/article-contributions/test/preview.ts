/** Local browser-test entry only. Production uses src/worker.ts and always verifies Access. */
import { createHandler } from '../src/worker.js';
import schema from '../migrations/0001_contributions.sql';
import { seedReviewFixtures } from './review-fixtures.js';

const handle = createHandler(async () => true);
export default {
  async fetch(request, env) {
    // This entry is served on loopback with a separate, disposable preview database.
    const existing = await env.INBOX.prepare('SELECT id FROM contributions LIMIT 1')
      .first()
      .catch(() => null);
    if (!existing) {
      const statements = schema
        .replace(/--[^\n]*/g, '')
        .split(';')
        .filter((value) => value.trim());
      for (const statement of statements)
        await env.INBOX.exec(
          statement
            .replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ')
            .replace('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS ')
            .replace(/\s+/g, ' '),
        );
      await seedReviewFixtures(env.INBOX);
    }
    if (request.method === 'POST' && new URL(request.url).pathname === '/__review-preview/reset') {
      await env.INBOX.batch([
        env.INBOX.prepare('DELETE FROM contribution_events'),
        env.INBOX.prepare('DELETE FROM contributions'),
      ]);
      await seedReviewFixtures(env.INBOX);
      return Response.json({ reset: true });
    }
    // Vite forwards the app's loopback Origin while Wrangler receives the backend URL.
    // Normalize only the two local preview origins; production's origin check is unchanged.
    const origin = request.headers.get('Origin');
    const localOrigins = ['http://127.0.0.1:4199', 'http://127.0.0.1:8793'];
    const input =
      origin && localOrigins.includes(origin)
        ? new Request(
            new URL(new URL(request.url).pathname + new URL(request.url).search, origin),
            request,
          )
        : request;
    const response = await handle(input, env);
    if (response.headers.get('Content-Type')?.includes('text/html')) {
      const html = await response.text();
      return new Response(
        html.replace(
          '<a href="/owner/contributions">editorial</a>',
          '<a href="/owner/contributions">editorial</a><span class="pv-preview">Local preview · sample submissions</span>',
        ),
        response,
      );
    }
    return response;
  },
} satisfies ExportedHandler<Env>;
