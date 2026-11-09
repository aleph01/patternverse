import { type ContributionArticle, contributionStatuses } from './contract.js';
import { privateHeaders, readBody } from './http.js';
import { renderReviewPage, reviewError } from './board-view.js';
import {
  boardPath,
  filtersFrom,
  scopeOptions,
  scopeQuery,
  type ReviewCatalog,
  type ReviewRow,
  type ReviewEvent,
  type QueueRow,
} from './review-model.js';

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const notices: Record<string, string> = {
  approved: 'Contribution approved. Ready for editorial follow-up.',
  rejected: 'Contribution rejected. Your review note is private.',
  reviewing: 'Contribution moved to In review.',
  saved: 'Private notes and review saved.',
  undone: 'Review decision undone.',
};
const redirect = (location: string) =>
  new Response(null, { status: 303, headers: { ...privateHeaders, Location: location } });
export function boardUnavailable(): Response {
  return reviewError(
    'Contributions unavailable',
    'The review service could not load your inbox. Please try again.',
    503,
  );
}
function returnUrl(value: string | null, request: Request, id: string): URL {
  const fallback = new URL(`${boardPath}?review=${id}`, request.url);
  if (!value) return fallback;
  try {
    const candidate = new URL(value, request.url);
    return candidate.origin === fallback.origin && candidate.pathname === boardPath
      ? candidate
      : fallback;
  } catch {
    return fallback;
  }
}
async function updateReview(request: Request, env: Env, row: ReviewRow): Promise<Response> {
  const url = new URL(request.url);
  if (request.headers.get('Origin') !== url.origin)
    return reviewError('Request refused', 'Please use the review form.', 403);
  if (
    request.headers.get('Content-Type')?.split(';')[0]?.trim() !==
    'application/x-www-form-urlencoded'
  )
    return reviewError('Invalid form', 'Please use the review form.', 415);
  let form: URLSearchParams;
  try {
    form = new URLSearchParams(await readBody(request, 65_536));
  } catch {
    return reviewError('Review too large', 'Shorten your review note and try again.', 413);
  }
  const action = form.get('action') ?? 'save',
    version = Number(form.get('version'));
  const destination = returnUrl(form.get('returnTo'), request, row.id);
  const conflict = (note = '') =>
    reviewError(
      'This review changed',
      'Your changes were not saved because another review changed this submission. Reload before trying again.',
      409,
      destination.pathname + destination.search,
      note,
    );
  if (!Number.isInteger(version) || version !== row.version)
    return conflict(form.get('note') ?? '');
  if (!['save', 'decision', 'undo'].includes(action))
    return reviewError('Invalid review', 'Choose a review action and try again.', 400);
  let status = form.get('status') ?? row.status;
  let label = (form.get('label') ?? row.label).trim(),
    note = (form.get('note') ?? row.reviewer_note).trim();
  if (action === 'undo') {
    const history = await env.INBOX.prepare(
      'SELECT status, label, note FROM contribution_events WHERE contribution_id = ? ORDER BY id DESC LIMIT 2',
    )
      .bind(row.id)
      .all<Pick<ReviewEvent, 'status' | 'label' | 'note'>>();
    const latest = history.results[0];
    if (
      !latest ||
      latest.status !== row.status ||
      latest.label !== row.label ||
      latest.note !== row.reviewer_note
    )
      return conflict();
    const previous = history.results[1];
    status = previous?.status ?? 'pending';
    label = previous?.label ?? '';
    note = previous?.note ?? '';
  }
  if (
    !contributionStatuses.some((value) => value === status) ||
    label.length > 100 ||
    note.length > 4000 ||
    label.includes('\0') ||
    note.includes('\0')
  )
    return reviewError(
      'Check your review',
      'Use a valid status, a label up to 100 characters, and a note up to 4,000 characters.',
      400,
      destination.pathname + destination.search,
      note,
    );
  const changed = status !== row.status || label !== row.label || note !== row.reviewer_note;
  if (changed) {
    const now = new Date().toISOString();
    const results = await env.INBOX.batch([
      env.INBOX.prepare(
        'UPDATE contributions SET status = ?, label = ?, reviewer_note = ?, updated_at = ?, version = version + 1 WHERE id = ? AND version = ?',
      ).bind(status, label, note, now, row.id, version),
      env.INBOX.prepare(
        'INSERT INTO contribution_events (contribution_id, status, label, note, reviewer, created_at) SELECT ?, ?, ?, ?, ?, ? WHERE changes() = 1',
      ).bind(row.id, status, label, note, env.OWNER_EMAIL, now),
    ]);
    if (!results[0]?.meta.changes) return conflict(note);
  }
  // Old direct-form callers retain their existing redirect contract.
  if (!form.has('returnTo')) return redirect(`${boardPath}/${row.id}`);
  for (const key of ['notice', 'changed', 'version']) destination.searchParams.delete(key);
  const notice =
    action === 'undo' ? 'undone' : action === 'decision' && status in notices ? status : 'saved';
  destination.searchParams.set('notice', notice);
  if (changed && action !== 'undo') {
    destination.searchParams.set('changed', row.id);
    destination.searchParams.set('version', String(version + 1));
  }
  if (action === 'decision') destination.searchParams.delete('review');
  else destination.searchParams.set('review', row.id);
  return redirect(destination.pathname + destination.search);
}
export async function reviewBoard(
  request: Request,
  env: Env,
  manifest: Record<string, ContributionArticle>,
  catalog: ReviewCatalog = {},
): Promise<Response> {
  const url = new URL(request.url);
  const detail = url.pathname.match(/^\/owner\/contributions\/([\da-f-]{36})(\/export)?$/i);
  if (!detail && url.pathname !== boardPath && url.pathname !== `${boardPath}/`)
    return reviewError('Not found', 'This review page does not exist.', 404);
  const row = detail
    ? await env.INBOX.prepare('SELECT * FROM contributions WHERE id = ?')
        .bind(detail[1])
        .first<ReviewRow>()
    : null;
  if (detail && !row) return reviewError('Not found', 'This contribution could not be found.', 404);
  if (detail?.[2] && row) {
    if (request.method !== 'GET')
      return reviewError('Method not allowed', 'Use GET to download a submission.', 405);
    return new Response(row.payload, {
      headers: {
        ...privateHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="contribution-${row.id}.json"`,
      },
    });
  }
  if (request.method === 'POST' && row) return updateReview(request, env, row);
  if (request.method !== 'GET')
    return reviewError('Method not allowed', 'Use the review form to save changes.', 405);
  const filters = filtersFrom(url, catalog),
    scope = scopeQuery(filters, catalog);
  const statusClause =
    filters.status === 'all' ? '' : `${scope.where ? ' AND' : 'WHERE'} status = ?`;
  const order = filters.sort === 'oldest' ? 'ASC' : 'DESC';
  const [queueResult, countsResult, labelResult] = await Promise.all([
    env.INBOX.prepare(
      `SELECT id, article_title, article_path, status, label, created_at, COALESCE(json_extract(payload, '$.name'),'') AS name, json_array_length(payload, '$.comments') AS comments, json_array_length(payload, '$.edits') AS edits FROM contributions ${scope.where}${statusClause} ORDER BY created_at ${order}, id ${order} LIMIT 26 OFFSET ?`,
    )
      .bind(...scope.values, ...(filters.status === 'all' ? [] : [filters.status]), filters.offset)
      .all<QueueRow>(),
    env.INBOX.prepare(
      `SELECT status, COUNT(*) AS total FROM contributions ${scope.where} GROUP BY status`,
    )
      .bind(...scope.values)
      .all<{ status: string; total: number }>(),
    env.INBOX.prepare(
      "SELECT DISTINCT label FROM contributions WHERE label <> '' ORDER BY label LIMIT 100",
    ).all<{ label: string }>(),
  ]);
  const counts: Record<string, number> = { all: 0 };
  for (const count of countsResult.results) {
    counts[count.status] = count.total;
    counts.all! += count.total;
  }
  const queue = queueResult.results.slice(0, 25);
  const requested = url.searchParams.get('review');
  const selectedId = requested && uuid.test(requested) ? requested : queue[0]?.id;
  let selected =
    row ??
    (selectedId
      ? await env.INBOX.prepare('SELECT * FROM contributions WHERE id = ?')
          .bind(selectedId)
          .first<ReviewRow>()
      : null);
  if (!selected && queue[0])
    selected = await env.INBOX.prepare('SELECT * FROM contributions WHERE id = ?')
      .bind(queue[0].id)
      .first<ReviewRow>();
  const events = selected
    ? (
        await env.INBOX.prepare(
          'SELECT status, label, note, reviewer, created_at FROM contribution_events WHERE contribution_id = ? ORDER BY id DESC LIMIT 100',
        )
          .bind(selected.id)
          .all<ReviewEvent>()
      ).results
    : [];
  let undo: { id: string; version: number } | null = null;
  const changedId = url.searchParams.get('changed'),
    version = Number(url.searchParams.get('version'));
  if (changedId && uuid.test(changedId) && Number.isInteger(version)) {
    const current = await env.INBOX.prepare('SELECT version FROM contributions WHERE id = ?')
      .bind(changedId)
      .first<{ version: number }>();
    if (current?.version === version) undo = { id: changedId, version };
  }
  return renderReviewPage({
    filters,
    queue,
    more: queueResult.results.length > 25,
    counts,
    labels: labelResult.results.map((item) => item.label),
    verses: scopeOptions(catalog, 'verses'),
    collections: scopeOptions(catalog, 'collections', filters.verse),
    selected,
    events,
    tab: url.searchParams.get('tab') ?? '',
    catalog,
    manifest,
    notice: notices[url.searchParams.get('notice') ?? ''] ?? '',
    undo,
  });
}
