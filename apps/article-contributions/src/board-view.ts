import { commentAnchors, type ArticleContribution, type ContributionEdit } from './contract.js';
import { escapeHtml as e, privateHeaders } from './http.js';
import { linkedDiff, linkChanges } from './links.js';
import { boardStyles } from './board-styles.js';
import {
  boardPath,
  boardUrl,
  statusLabels,
  type ReviewPage,
  type ReviewRow,
  type ReviewFilters,
} from './review-model.js';

const icons: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  x: '<path d="m18 6-12 12M6 6l12 12"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
};
const icon = (name: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? ''}</svg>`;
const date = (value: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(value));
const hidden = (name: string, value: string | number) =>
  `<input type="hidden" name="${name}" value="${e(String(value))}">`;
const badge = (status: ReviewRow['status']) =>
  `<span class="pv-status">${status === 'pending' ? '<span class="pv-new-dot"></span>' : icon(status === 'approved' ? 'check' : status === 'reviewing' ? 'clock' : 'x')}${statusLabels[status]}</span>`;
const countText = (edits: number, comments: number) =>
  [
    edits ? `${edits} ${edits === 1 ? 'edit' : 'edits'}` : '',
    comments ? `${comments} ${comments === 1 ? 'comment' : 'comments'}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
const options = (values: { id: string; title: string }[], selected: string, all: string) =>
  `<option value="">${all}</option>${values.map((item) => `<option value="${e(item.id)}"${item.id === selected ? ' selected' : ''}>${e(item.title)}</option>`).join('')}`;
const clientScript = `const form=document.getElementById('review-filters');form?.addEventListener('change',event=>{if(event.target instanceof HTMLSelectElement){if(event.target.name==='verse')form.elements.namedItem('collection').value='';form.requestSubmit();}});`;
export function boardDocument(title: string, content: string, status = 200): Response {
  const nonce = crypto.randomUUID();
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)} — Patternverse</title><style>${boardStyles}</style><body><div class="pv-chrome"><a class="pv-wordmark" href="/">patternverse</a><span class="pv-slash">/</span><a href="${boardPath}">editorial</a><a href="/owner/stats">Website statistics ↗</a></div>${content}<footer class="pv-footer"><a href="${boardPath}">Patternverse editorial</a><span>Private contributions · nothing published automatically</span></footer><script nonce="${nonce}">${clientScript}</script></body></html>`,
    {
      status,
      headers: {
        ...privateHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        // Keep same-origin form Origins intact while withholding private URLs from other sites.
        'Referrer-Policy': 'same-origin',
        'Content-Security-Policy': `${privateHeaders['Content-Security-Policy']}; script-src 'nonce-${nonce}'`,
      },
    },
  );
}
export function reviewError(
  title: string,
  message: string,
  status: number,
  returnTo = boardPath,
  note = '',
): Response {
  return boardDocument(
    title,
    `<main class="pv-error"><h1>${e(title)}</h1><p>${e(message)}</p>${note ? `<div class="pv-field"><label for="unsaved-note">Your unsaved note</label><textarea id="unsaved-note" readonly>${e(note)}</textarea></div>` : ''}<a class="pv-button" href="${e(returnTo)}">Reload review inbox</a></main>`,
    status,
  );
}
function editMarkup(edit: ContributionEdit, index: number): string {
  const diff = linkedDiff(edit.before, edit.after, edit.beforeLinks, edit.afterLinks)
    .map((change) => {
      const text = change.href
        ? `<a href="${e(change.href)}" target="_blank" rel="noopener noreferrer">${e(change.text)}</a>`
        : e(change.text);
      return change.kind === 'same'
        ? text
        : `<${change.kind === 'added' ? 'ins' : 'del'}>${text}</${change.kind === 'added' ? 'ins' : 'del'}>`;
    })
    .join('');
  const links = linkChanges(edit.before, edit.after, edit.beforeLinks, edit.afterLinks);
  return `<section class="pv-edit"><header class="pv-edit-head"><span>Edit ${index + 1}</span><strong>${e(edit.sectionTitle || 'Article text')}</strong></header><div class="pv-reading">${diff}</div>${links.added.length || links.removed.length ? `<ul class="pv-link-changes" aria-label="Link changes">${links.removed.map((link) => `<li>Remove link: <del>${e(link.text)} → ${e(link.href)}</del></li>`).join('')}${links.added.map((link) => `<li>Add link: <ins><a href="${e(link.href)}" target="_blank" rel="noopener noreferrer">${e(link.text)}</a> → ${e(link.href)}</ins></li>`).join('')}</ul>` : ''}</section>`;
}
function commentMarkup(payload: ArticleContribution): string {
  return payload.comments
    .map((comment, index) => {
      const anchors = commentAnchors(comment).filter((anchor) => anchor.blockId);
      return `<section class="pv-comment"><header class="pv-comment-head"><span class="pv-comment-number">${index + 1}</span><span>${anchors.length ? `${anchors.length} ${anchors.length === 1 ? 'passage' : 'passages'} · one comment` : 'Whole article'}</span></header>${anchors.length ? `<div class="pv-quotes">${anchors.map((anchor, i) => `<div class="pv-quote"><small>${anchors.length > 1 ? `${i + 1}. ` : ''}${e(anchor.sectionTitle || 'Article introduction')}</small><blockquote>${e(anchor.quote || anchor.text)}</blockquote></div>`).join('')}</div>` : ''}<p class="pv-comment-body">${e(comment.body)}</p>${anchors.length ? `<details><summary>Original context</summary>${anchors.map((anchor) => `<p>${e(anchor.text)}</p>`).join('')}</details>` : ''}</section>`;
    })
    .join('');
}
function contextMarkup(payload: ArticleContribution): string {
  return `<p class="pv-meta">Original passages with suggested changes and comments.</p>${payload.edits.map(editMarkup).join('')}${payload.comments
    .map((comment, index) =>
      commentAnchors(comment)
        .filter((a) => a.text)
        .map(
          (anchor) =>
            `<section class="pv-context-item"><div class="pv-meta">Comment ${index + 1} · ${e(anchor.sectionTitle || 'Article introduction')}</div><div class="pv-reading">${anchor.quote ? `${e(anchor.text.slice(0, anchor.start))}<mark>${e(anchor.quote)}</mark>${e(anchor.text.slice(anchor.end))}` : e(anchor.text)}</div><p class="pv-comment-body">${e(comment.body)}</p></section>`,
        )
        .join(''),
    )
    .join('')}`;
}
function formFields(row: ReviewRow, filters: ReviewFilters, tab: string): string {
  return (
    hidden('version', row.version) + hidden('returnTo', boardUrl(filters, { review: row.id, tab }))
  );
}
function detail(data: ReviewPage): string {
  const { selected: row, filters } = data;
  if (!row)
    return `<section class="pv-detail"><div class="pv-empty"><h2>${data.counts.all ? 'No contributions match these filters.' : 'Your inbox is clear.'}</h2><p>Article suggestions, edits and comments will appear here.</p><a class="pv-button" href="${boardPath}?status=all">Clear filters</a></div></section>`;
  const payload = JSON.parse(row.payload) as ArticleContribution;
  const name = payload.name || 'Anonymous contributor';
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const taxonomy = data.catalog[row.article_path];
  const index = data.queue.findIndex((item) => item.id === row.id);
  const pager = (direction: number) => {
    const target = data.queue[index + direction];
    return target
      ? `<a class="pv-icon-button" href="${e(boardUrl(filters, { review: target.id, tab: data.tab }))}" aria-label="${direction < 0 ? 'Previous' : 'Next'} contribution">${icon(direction < 0 ? 'left' : 'right')}</a>`
      : `<span class="pv-icon-button" aria-disabled="true">${icon(direction < 0 ? 'left' : 'right')}</span>`;
  };
  const current = data.manifest[row.article_path];
  const stale = !payload.suggestion && (!current || current.revision !== row.article_revision);
  const tabs = [
    ...(payload.suggestion ? [['article', 'Suggested article']] : []),
    ...(payload.edits.length ? [['edits', `Text edits (${payload.edits.length})`]] : []),
    ...(payload.comments.length ? [['comments', `Comments (${payload.comments.length})`]] : []),
    ...(!payload.suggestion ? [['context', 'In context']] : []),
    ['activity', 'Activity'],
  ];
  const active = tabs.some(([id]) => id === data.tab) ? data.tab : tabs[0]![0];
  const panes: Record<string, string> = {
    article: payload.suggestion
      ? `<p class="pv-meta">New ${e(payload.article.type)} suggested for Commons. This is the submitted copy; later personal edits do not change it.</p>${payload.suggestion.summary ? `<p class="pv-comment-body">${e(payload.suggestion.summary)}</p>` : ''}${payload.suggestion.attribution ? `<p class="pv-comment-body">Attribution: ${e(payload.suggestion.attribution)}</p>` : ''}${payload.suggestion.reason ? `<section class="pv-comment"><h3>Why it belongs in Commons</h3><p class="pv-comment-body">${e(payload.suggestion.reason)}</p></section>` : ''}<section class="pv-context-item"><h3>Submitted article text</h3><div class="pv-reading">${e(payload.suggestion.body)}</div></section><p class="pv-meta">The contributor confirmed permission to share this article for review and possible publication in Commons.</p>`
      : '',
    edits: `<div class="pv-legend"><span><mark>Added text</mark></span><span><s>Deleted text</s></span></div>${payload.edits.map(editMarkup).join('')}`,
    comments: commentMarkup(payload),
    context: contextMarkup(payload),
    activity: `<ol class="pv-timeline">${data.events.map((event) => `<li><strong>${statusLabels[event.status]}</strong><p>You · ${e(date(event.created_at))} UTC${event.label ? ` · ${e(event.label)}` : ''}</p>${event.note ? `<p>${e(event.note)}</p>` : ''}</li>`).join('')}<li><strong>Contribution received</strong><p>${e(name)} · ${e(date(row.created_at))} UTC</p></li></ol>`,
  };
  const action = (status: string, label: string, kind = '') =>
    `<form method="post" action="${boardPath}/${row.id}">${formFields(row, filters, active!)}${hidden('action', 'decision')}${hidden('status', status)}<button type="submit" class="pv-button ${kind}"${row.status === status ? ' disabled' : ''}>${icon(status === 'approved' ? 'check' : 'clock')}${label}</button></form>`;
  return `<section class="pv-detail" id="review" aria-label="Review ${e(row.article_title)}"><div class="pv-detail-top"><span class="pv-eyebrow">Contribution</span><div class="pv-pager">${index >= 0 ? `<span>${index + 1 + filters.offset} of ${data.counts[filters.status] ?? data.counts.all}</span>` : ''}${pager(-1)}${pager(1)}</div></div><h2>${e(row.article_title)}</h2>${taxonomy ? `<p class="pv-taxonomy">${e(taxonomy.verses.map((v) => v.title).join(' · '))}${taxonomy.collections.length ? ` / ${e(taxonomy.collections.map((c) => c.title).join(' · '))}` : ''}</p>` : ''}<div class="pv-byline"><span class="pv-avatar">${e(initials)}</span><div><p>${e(name)}</p><span class="pv-meta">${e(date(row.created_at))} UTC · ${payload.suggestion ? 'New article suggestion' : countText(payload.edits.length, payload.comments.length)}</span></div><span style="margin-left:auto">${badge(row.status)}</span></div>${payload.email ? `<p class="pv-contributor-note">Reply address: ${e(payload.email)}</p>` : ''}${stale ? '<p class="pv-warning">The published article has changed since this contribution began. Check the current article before applying these suggestions.</p>' : ''}<div class="pv-actions">${action('approved', 'Approve contribution', 'primary')}<details class="pv-reject"><summary class="pv-button">${icon('x')}Reject</summary><form method="post" action="${boardPath}/${row.id}">${formFields(row, filters, active!)}${hidden('action', 'decision')}${hidden('status', 'rejected')}<div class="pv-field"><label for="rejection-note">Private review note · optional</label><textarea id="rejection-note" name="note" rows="3" maxlength="4000">${e(row.reviewer_note)}</textarea></div><div><button class="pv-button primary" type="submit">Reject contribution</button></div></form></details>${row.status === 'pending' ? action('reviewing', 'Mark in review', 'quiet') : ''}</div><p class="pv-approval-note">${icon('shield')}Approval accepts the suggestion. Publishing is a separate step.</p><nav class="pv-content-tabs" aria-label="Contribution content">${tabs.map(([id, title]) => `<a href="${e(boardUrl(filters, { review: row.id, tab: id }))}" aria-current="${active === id}">${title}</a>`).join('')}</nav>${Object.entries(
    panes,
  )
    .map(
      ([id, content]) =>
        `<div class="pv-tab-content" data-review-tab="${id}"${id === active ? '' : ' hidden'}>${content}</div>`,
    )
    .join(
      '',
    )}<details class="pv-organize" id="organize"><summary>Organize & private notes${row.label ? ` · ${e(row.label)}` : ''}</summary><form method="post" action="${boardPath}/${row.id}">${formFields(row, filters, active!)}${hidden('action', 'save')}<div class="pv-review-fields"><div class="pv-field"><label for="review-status">Status</label><select id="review-status" name="status">${Object.entries(
    statusLabels,
  )
    .map(
      ([id, label]) =>
        `<option value="${id}"${row.status === id ? ' selected' : ''}>${label}</option>`,
    )
    .join(
      '',
    )}</select></div><div class="pv-field"><label for="review-label">Label</label><input id="review-label" name="label" maxlength="100" value="${e(row.label)}" list="review-labels" placeholder="e.g. Clarity"><datalist id="review-labels">${data.labels.map((label) => `<option value="${e(label)}">`).join('')}</datalist></div></div><div class="pv-field"><label for="review-note">Private review note</label><textarea id="review-note" name="note" rows="4" maxlength="4000" placeholder="Notes for your editorial follow-up…">${e(row.reviewer_note)}</textarea></div><div><button type="submit" class="pv-button">Save review</button></div></form></details><div class="pv-detail-links">${current ? `<a href="${e(row.article_path)}" target="_blank" rel="noopener noreferrer">Read article ↗</a>` : ''}<a href="${boardPath}/${row.id}/export">Download submission</a></div></section>`;
}
export function renderReviewPage(data: ReviewPage): Response {
  const { filters } = data;
  const filterForm = `<form class="pv-filters" id="review-filters" method="get" action="${boardPath}">${hidden('status', filters.status)}<label class="pv-search">${icon('search')}<input type="search" name="q" value="${e(filters.q)}" maxlength="120" aria-label="Search contributions" placeholder="Search article, contributor, or feedback"></label><select name="sort" class="pv-select pv-sort" aria-label="Sort contributions"><option value="newest"${filters.sort === 'newest' ? ' selected' : ''}>Newest first</option><option value="oldest"${filters.sort === 'oldest' ? ' selected' : ''}>Oldest first</option></select><button type="submit" class="pv-button">Apply filters</button><div class="pv-scopes"><label><span>Verse</span><select name="verse" class="pv-select" aria-label="Filter by verse">${options(data.verses, filters.verse, 'All verses')}</select></label><label><span>Collection</span><select name="collection" class="pv-select" aria-label="Filter by collection">${options(data.collections, filters.collection, 'All collections')}</select></label><label><span>Label</span><select name="label" class="pv-select" aria-label="Filter by label">${options(
    data.labels.map((label) => ({ id: label, title: label })),
    filters.label,
    'All labels',
  )}</select></label></div></form>`;
  const statuses = [
    ['pending', 'New'],
    ['reviewing', 'In review'],
    ['approved', 'Approved'],
    ['rejected', 'Rejected'],
    ['archived', 'Archived'],
    ['all', 'All'],
  ];
  const queue = data.queue
    .map(
      (item) =>
        `<a class="pv-submission" href="${e(boardUrl(filters, { review: item.id }))}" aria-current="${data.selected?.id === item.id}"><span class="pv-row-top"><span>${item.status === 'pending' ? '<span class="pv-new-dot"></span>' : ''}${e(item.name || 'Anonymous contributor')}</span><span>${e(new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(item.created_at)))}</span></span><h3>${e(item.article_title)}</h3><span class="pv-row-bottom"><span>${item.article_path.startsWith('/suggestions/') ? 'New article suggestion' : countText(item.edits, item.comments)}</span><span>↗</span></span>${item.label ? `<span class="pv-labels"><span class="pv-label">${e(item.label)}</span></span>` : ''}</a>`,
    )
    .join('');
  const notice = data.notice
    ? `<div class="pv-notice" role="status"><span>${icon('check')}${e(data.notice)}</span>${data.undo ? `<form method="post" action="${boardPath}/${data.undo.id}">${hidden('action', 'undo')}${hidden('version', data.undo.version)}${hidden('returnTo', boardUrl(filters, { review: data.undo.id, tab: data.tab }))}<button class="pv-button quiet" type="submit">Undo</button></form>` : ''}</div>`
    : '';
  return boardDocument(
    'Contribution inbox',
    `<header class="pv-page-head"><div><h1>Contributions</h1><p>Good ideas, clearer articles. One review at a time.</p></div><span class="pv-owner">Only visible to you</span></header>${filterForm}<nav class="pv-status-tabs" aria-label="Contribution status">${statuses.map(([id, label]) => `<a href="${e(boardUrl(filters, { status: id, offset: 0 }))}" aria-current="${filters.status === id}">${label}<span class="pv-count">${data.counts[id!] ?? 0}</span></a>`).join('')}</nav>${notice}<main class="pv-workspace"><aside class="pv-queue" aria-label="Contribution inbox"><div class="pv-queue-inner"><div class="pv-queue-heading" aria-live="polite"><span>${data.counts[filters.status] ?? 0} contributions</span><span>${filters.sort === 'newest' ? 'Newest first' : 'Oldest first'}</span></div>${queue || '<p class="pv-empty">Nothing here yet.</p>'}<nav class="pv-pagination" aria-label="Inbox pages">${filters.offset ? `<a href="${e(boardUrl(filters, { offset: Math.max(0, filters.offset - 25) }))}">← Previous page</a>` : '<span></span>'}${data.more ? `<a href="${e(boardUrl(filters, { offset: filters.offset + 25 }))}">Next page →</a>` : ''}</nav></div></aside>${detail(data)}</main>`,
  );
}
