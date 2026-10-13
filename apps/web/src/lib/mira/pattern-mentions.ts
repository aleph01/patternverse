import type { Effect, Message, PatternRef } from '@patternverse/companion-core';
import type { MiraPatternSummary } from './context';
import { articleReferenceKey, type MiraArticleReference } from './article-reference';

export type TherapyCollection = Readonly<{
  sourceId: string;
  id: string;
  title: string;
  aliases?: readonly string[];
  items: readonly PatternRef[];
}>;
export type MentionSuggestion = MiraPatternSummary &
  Readonly<{
    collections: readonly TherapyCollection[];
  }>;
export type MentionQuery = Readonly<{ start: number; end: number; query: string }>;

/** Only a newly typed mention at the caret opens the picker; emails remain ordinary text. */
export function mentionAtCaret(text: string, caret: number): MentionQuery | null {
  const prefix = text.slice(0, caret);
  const match = /(?:^|\s)@([^@\n]*)$/.exec(prefix);
  if (!match) return null;
  const start = prefix.lastIndexOf('@');
  return { start, end: caret, query: match[1] };
}

const normalize = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** Membership, not a pattern's own verse tag, defines the Therapy collection scope. */
export function therapySuggestions(
  patterns: readonly MiraPatternSummary[],
  collections: readonly TherapyCollection[],
  query: string,
  collectionKey = '',
  selected: readonly MiraPatternSummary[] = [],
): readonly MentionSuggestion[] {
  const excluded = new Set(selected.map(articleReferenceKey));
  const entries = new Map(patterns.map((pattern) => [articleReferenceKey(pattern), pattern]));
  const memberships = new Map<string, TherapyCollection[]>();
  for (const collection of collections) {
    for (const ref of collection.items) {
      const key = articleReferenceKey({ sourceId: ref.sourceId, id: ref.entityId });
      const list = memberships.get(key) ?? [];
      if (!list.some((item) => articleReferenceKey(item) === articleReferenceKey(collection)))
        list.push(collection);
      memberships.set(key, list);
    }
  }
  const terms = normalize(query).split(' ').filter(Boolean);
  const results: MentionSuggestion[] = [];
  for (const [key, membership] of memberships) {
    const pattern = entries.get(key);
    if (!pattern || pattern.type !== 'pattern' || excluded.has(key)) continue;
    if (collectionKey && !membership.some((item) => articleReferenceKey(item) === collectionKey))
      continue;
    const search = normalize(
      [
        pattern.title,
        pattern.summary ?? '',
        ...(pattern.tags ?? []),
        ...(pattern.aliases ?? []),
        ...membership.flatMap((item) => [item.title, ...(item.aliases ?? [])]),
      ].join(' '),
    );
    if (terms.every((term) => search.includes(term)))
      results.push({ ...pattern, collections: membership });
  }
  // Preserve curated collection order on @; put title matches first when searching.
  return terms.length
    ? results.sort(
        (a, b) =>
          Number(normalize(b.title).includes(normalize(query))) -
          Number(normalize(a.title).includes(normalize(query))),
      )
    : results;
}

/** Resolve current-message attachments on every request, including persisted retries. */
export async function messagePatternContexts(
  effect: Effect,
  patterns: readonly MiraPatternSummary[],
  load: (pattern: MiraPatternSummary) => Promise<MiraArticleReference>,
) {
  const refs = [
    ...(effect.activePattern ? [effect.activePattern] : []),
    ...(effect.messages.at(-1)?.role === 'user'
      ? (effect.messages.at(-1)?.patternMentions ?? [])
      : []),
  ];
  const seen = new Set<string>();
  const contexts = [];
  for (const ref of refs) {
    const key = articleReferenceKey({ sourceId: ref.sourceId, id: ref.entityId });
    if (seen.has(key)) continue;
    seen.add(key);
    const pattern = patterns.find(
      (entry) =>
        entry.type === 'pattern' && entry.sourceId === ref.sourceId && entry.id === ref.entityId,
    );
    if (!pattern)
      throw new Error(
        'A mentioned or selected pattern is unavailable. Remove it or select another before sending.',
      );
    const reference = await load(pattern);
    contexts.push({ title: reference.title, summary: reference.summary, article: reference.body });
  }
  return contexts;
}

/** Keep mentions identifiable in later transcript turns, for either reply provider. */
export function conversationMessageText(message: Message): string {
  return message.patternMentions?.length
    ? `${message.text}\n\nMentioned patterns: ${message.patternMentions.map((item) => item.title).join('; ')}`
    : message.text;
}
