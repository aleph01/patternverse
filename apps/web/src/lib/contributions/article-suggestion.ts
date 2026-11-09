import type { RawEntity } from '@patternverse/workspace';
import {
  parseContribution,
  maxSubmissionBytes,
  type ArticleContribution,
} from '../../../../article-contributions/src/contract.js';

export const suggestionDraftKey = 'patternverse:article-suggestion:v1';
export const suggestibleArticles = (entities: readonly RawEntity[]): RawEntity[] =>
  entities
    .filter(
      (entity) => entity.sourceId === 'personal' && entity.type !== 'verse' && entity.body.trim(),
    )
    .sort((a, b) => a.title.localeCompare(b.title));

/** Copy only the selected text and visible attribution; never serialize the workspace. */
export async function articleSuggestion(entity: RawEntity): Promise<ArticleContribution> {
  const requestId = crypto.randomUUID();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(entity.body));
  return {
    requestId,
    article: {
      sourceId: 'personal',
      id: entity.id,
      type: entity.type,
      title: entity.title,
      path: `/suggestions/${requestId}`,
      revision: Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join(''),
    },
    suggestion: {
      body: entity.body,
      summary: entity.summary ?? '',
      attribution: entity.attribution ?? '',
      reason: '',
      permission: true,
    },
    comments: [],
    edits: [],
    name: '',
    email: '',
    website: '',
  };
}

export function readSuggestionDraft(storage: Pick<Storage, 'getItem'>): ArticleContribution | null {
  try {
    const raw = storage.getItem(suggestionDraftKey);
    if (!raw || new TextEncoder().encode(raw).byteLength > maxSubmissionBytes) return null;
    const draft = parseContribution(JSON.parse(raw));
    return draft?.suggestion ? draft : null;
  } catch {
    return null;
  }
}

export function saveSuggestionDraft(
  storage: Pick<Storage, 'setItem'>,
  draft: ArticleContribution,
): void {
  storage.setItem(
    suggestionDraftKey,
    JSON.stringify({ ...draft, name: '', email: '', website: '' }),
  );
}

export function validSuggestion(draft: ArticleContribution): boolean {
  return (
    Boolean(parseContribution(draft)) &&
    new TextEncoder().encode(JSON.stringify(draft)).byteLength <= maxSubmissionBytes
  );
}
