/** Public feedback, or an explicitly selected article copy for editorial review. */
export type ContributionArticle = {
  sourceId: string;
  id: string;
  type: string;
  title: string;
  path: string;
  revision: string;
};
export type ContributionAnchor = {
  blockId: string;
  sectionId: string;
  sectionTitle: string;
  text: string;
  quote: string;
  start: number;
  end: number;
  x: number;
  y: number;
};
export type ContributionComment = {
  id: string;
  anchor: ContributionAnchor;
  additionalAnchors?: ContributionAnchor[];
  body: string;
  feedback?: ArticleFeedback;
};
export const articleFeedbackCategories = [
  { id: 'too-short', label: 'Too short', description: 'Needs more depth' },
  { id: 'too-long', label: 'Too long', description: 'Could be more concise' },
  { id: 'hard-to-follow', label: 'Hard to follow', description: 'Explain it more clearly' },
  { id: 'error', label: 'Error or inaccuracy', description: 'Something seems incorrect' },
  { id: 'example', label: 'Missing example', description: 'Show a concrete case' },
  { id: 'illustration', label: 'Missing illustration', description: 'A visual would help' },
  { id: 'information', label: 'Missing information', description: 'An important point is absent' },
  { id: 'application', label: 'Hard to apply', description: 'Needs practical guidance' },
] as const;
export type ArticleFeedbackCategory = (typeof articleFeedbackCategories)[number]['id'];
export type ArticleFeedback = { categories: ArticleFeedbackCategory[]; context: string };
export const articleFeedbackBody = (feedback: ArticleFeedback): string =>
  [
    articleFeedbackCategories
      .filter((category) => feedback.categories.includes(category.id))
      .map((category) => category.label)
      .join(' · '),
    feedback.context.trim(),
  ]
    .filter(Boolean)
    .join('\n\n');
export const commentAnchors = (comment: ContributionComment): ContributionAnchor[] => [
  comment.anchor,
  ...(comment.additionalAnchors ?? []),
];
export const anchorKey = (anchor: ContributionAnchor): string =>
  JSON.stringify([anchor.blockId, anchor.text, anchor.start, anchor.end, anchor.quote]);
export type ContributionLink = { from: number; to: number; href: string };
export type ContributionEdit = {
  blockId: string;
  sectionId: string;
  sectionTitle: string;
  before: string;
  after: string;
  beforeLinks?: ContributionLink[];
  afterLinks?: ContributionLink[];
};
export type ArticleContribution = {
  requestId: string;
  article: ContributionArticle;
  comments: ContributionComment[];
  edits: ContributionEdit[];
  name: string;
  email: string;
  website: string;
  suggestion?: ArticleSuggestion;
};
export type ArticleSuggestion = {
  body: string;
  summary: string;
  attribution: string;
  reason: string;
  permission: true;
};
export const contributionStatuses = [
  'pending',
  'reviewing',
  'approved',
  'rejected',
  'archived',
] as const;
export type ContributionStatus = (typeof contributionStatuses)[number];
export const maxSubmissionBytes = 131_072;
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const record = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length <= max && !v.includes('\0');
const position = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
function parseArticleFeedback(value: unknown): ArticleFeedback | null {
  if (
    !record(value) ||
    !Array.isArray(value.categories) ||
    value.categories.length > articleFeedbackCategories.length ||
    !value.categories.every((id) =>
      articleFeedbackCategories.some((category) => category.id === id),
    ) ||
    new Set(value.categories).size !== value.categories.length ||
    (value.categories.includes('too-short') && value.categories.includes('too-long')) ||
    !text(value.context, 3000) ||
    (!value.categories.length && !value.context.trim())
  )
    return null;
  return {
    categories: value.categories as ArticleFeedbackCategory[],
    context: value.context.trim(),
  };
}
const hasControlCharacters = (value: string): boolean =>
  Array.from(value).some(
    (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
  );

export function safeContributionHref(value: string): boolean {
  if (!value || value.length > 1200 || hasControlCharacters(value) || value.includes('\\'))
    return false;
  if (value.startsWith('//')) return false;
  if (!/^(\/|#|https?:\/\/|mailto:)/i.test(value)) return false;
  try {
    return ['https:', 'http:', 'mailto:'].includes(
      new URL(value, 'https://patternverse.invalid').protocol,
    );
  } catch {
    return false;
  }
}

export const sameLinks = (
  a: readonly ContributionLink[] = [],
  b: readonly ContributionLink[] = [],
): boolean => JSON.stringify(a) === JSON.stringify(b);

function parseLinks(value: unknown, content: string): ContributionLink[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const links: ContributionLink[] = [];
  for (const link of value) {
    if (
      !record(link) ||
      !integer(link.from) ||
      !integer(link.to) ||
      link.to <= link.from ||
      link.to > content.length ||
      !text(link.href, 1200) ||
      !safeContributionHref(link.href) ||
      (links.at(-1)?.to ?? 0) > link.from
    )
      return null;
    links.push({ from: link.from, to: link.to, href: link.href });
  }
  return links;
}

function parseAnchor(n: unknown): ContributionAnchor | null {
  if (
    !record(n) ||
    !text(n.blockId, 100) ||
    !text(n.sectionId, 200) ||
    !text(n.sectionTitle, 500) ||
    !text(n.text, 20000) ||
    !text(n.quote, 20000) ||
    !integer(n.start) ||
    !integer(n.end) ||
    n.end < n.start ||
    n.end > n.text.length ||
    !position(n.x) ||
    !position(n.y) ||
    (n.quote && n.text.slice(n.start, n.end) !== n.quote)
  )
    return null;
  return {
    blockId: n.blockId,
    sectionId: n.sectionId,
    sectionTitle: n.sectionTitle,
    text: n.text,
    quote: n.quote,
    start: n.start,
    end: n.end,
    x: n.x,
    y: n.y,
  };
}

/** Parse into an allowlisted shape, dropping unknown data before persistence. */
export function parseContribution(input: unknown): ArticleContribution | null {
  if (
    !record(input) ||
    !text(input.requestId, 36) ||
    !uuid.test(input.requestId) ||
    !record(input.article)
  )
    return null;
  const a = input.article;
  const suggesting = input.suggestion !== undefined;
  let suggestion: ArticleSuggestion | undefined;
  if (suggesting) {
    const s = input.suggestion;
    if (
      !record(s) ||
      !text(s.body, 60000) ||
      !s.body.trim() ||
      !text(s.summary, 2000) ||
      !text(s.attribution, 2000) ||
      !text(s.reason, 4000) ||
      s.permission !== true ||
      a.sourceId !== 'personal' ||
      a.path !== `/suggestions/${input.requestId}` ||
      !['pattern', 'concept', 'practice', 'collection'].includes(String(a.type)) ||
      !text(a.title, 500) ||
      !a.title.trim() ||
      !text(a.id, 200) ||
      !a.id.trim()
    )
      return null;
    suggestion = {
      body: s.body,
      summary: s.summary,
      attribution: s.attribution,
      reason: s.reason.trim(),
      permission: true,
    };
  }
  if (
    !text(a.path, 300) ||
    (!suggesting &&
      !/^\/(pattern|concept|practice|collection)\/[a-z0-9][a-z0-9._-]*$/.test(a.path)) ||
    !text(a.revision, 64) ||
    !/^[\da-f]{64}$/.test(a.revision) ||
    !text(a.sourceId, 100) ||
    !text(a.id, 200) ||
    !text(a.type, 30) ||
    !text(a.title, 500)
  )
    return null;
  if (
    !Array.isArray(input.comments) ||
    input.comments.length > 30 ||
    !Array.isArray(input.edits) ||
    input.edits.length > 30 ||
    (!suggesting && !input.comments.length && !input.edits.length) ||
    (suggesting && (input.comments.length > 0 || input.edits.length > 0))
  )
    return null;
  if (
    !text(input.name, 100) ||
    hasControlCharacters(input.name) ||
    !text(input.email, 254) ||
    hasControlCharacters(input.email) ||
    (input.email !== '' && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(input.email)) ||
    input.website !== ''
  )
    return null;
  const comments: ContributionComment[] = [];
  for (const c of input.comments) {
    if (!record(c) || !text(c.id, 36) || !uuid.test(c.id) || !text(c.body, 4000) || !c.body.trim())
      return null;
    const anchor = parseAnchor(c.anchor);
    if (!anchor) return null;
    const feedback = c.feedback !== undefined ? parseArticleFeedback(c.feedback) : undefined;
    if (
      feedback === null ||
      (feedback &&
        (anchor.blockId || anchor.text || anchor.quote || c.additionalAnchors !== undefined))
    )
      return null;
    let additionalAnchors: ContributionAnchor[] | undefined;
    if (c.additionalAnchors !== undefined) {
      if (!Array.isArray(c.additionalAnchors) || c.additionalAnchors.length > 99) return null;
      additionalAnchors = [];
      for (const value of c.additionalAnchors) {
        const extra = parseAnchor(value);
        if (!extra || !extra.blockId || !extra.text) return null;
        additionalAnchors.push(extra);
      }
      if (additionalAnchors.length && (!anchor.blockId || !anchor.text)) return null;
      const keys = [anchor, ...additionalAnchors].map(anchorKey);
      if (new Set(keys).size !== keys.length) return null;
    }
    comments.push({
      id: c.id,
      body: feedback ? articleFeedbackBody(feedback) : c.body.trim(),
      anchor,
      ...(feedback ? { feedback } : {}),
      ...(additionalAnchors ? { additionalAnchors } : {}),
    });
  }
  const edits: ContributionEdit[] = [];
  for (const e of input.edits) {
    if (
      !record(e) ||
      !text(e.blockId, 100) ||
      !e.blockId ||
      !text(e.sectionId, 200) ||
      !text(e.sectionTitle, 500) ||
      !text(e.before, 20000) ||
      !text(e.after, 20000)
    )
      return null;
    const withLinks = e.beforeLinks !== undefined || e.afterLinks !== undefined;
    const beforeLinks = withLinks ? parseLinks(e.beforeLinks, e.before) : [];
    const afterLinks = withLinks ? parseLinks(e.afterLinks, e.after) : [];
    if (!beforeLinks || !afterLinks || (e.before === e.after && sameLinks(beforeLinks, afterLinks)))
      return null;
    edits.push({
      blockId: e.blockId,
      sectionId: e.sectionId,
      sectionTitle: e.sectionTitle,
      before: e.before,
      after: e.after,
      ...(withLinks ? { beforeLinks, afterLinks } : {}),
    });
  }
  if (
    comments.filter((comment) => comment.feedback).length > 1 ||
    new Set(comments.map((c) => c.id)).size !== comments.length ||
    new Set(edits.map((e) => e.blockId)).size !== edits.length
  )
    return null;
  return {
    requestId: input.requestId,
    article: {
      sourceId: a.sourceId,
      id: a.id,
      type: a.type,
      title: a.title,
      path: a.path,
      revision: a.revision,
    },
    comments,
    edits,
    name: input.name.trim(),
    email: input.email.trim(),
    website: '',
    ...(suggestion ? { suggestion } : {}),
  };
}
