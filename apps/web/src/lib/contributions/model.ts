import {
  parseContribution,
  type ArticleContribution,
  type ContributionAnchor,
  type ContributionArticle,
  type ContributionComment,
  type ContributionEdit,
  type ContributionLink,
  sameLinks,
  safeContributionHref,
  commentAnchors,
  anchorKey,
  articleFeedbackCategories,
  articleFeedbackBody,
  type ArticleFeedback,
  type ArticleFeedbackCategory,
} from '../../../../article-contributions/src/contract.js';
export type {
  ArticleContribution,
  ContributionAnchor,
  ContributionArticle,
  ContributionComment,
  ContributionEdit,
  ContributionLink,
  ArticleFeedback,
  ArticleFeedbackCategory,
};
export {
  sameLinks,
  safeContributionHref,
  commentAnchors,
  anchorKey,
  articleFeedbackCategories,
  articleFeedbackBody,
};
export { wordDiff } from '../../../../article-contributions/src/diff.js';
export { linkedDiff, linkChanges } from '../../../../article-contributions/src/links.js';

export const draftKey = (path: string): string => `patternverse:article-contribution:v1:${path}`;
export const emptyAnchor = (): ContributionAnchor => ({
  blockId: '',
  sectionId: '',
  sectionTitle: 'Whole article',
  text: '',
  quote: '',
  start: 0,
  end: 0,
  x: 0.95,
  y: 0,
});
export function newContribution(article: ContributionArticle): ArticleContribution {
  return {
    requestId: crypto.randomUUID(),
    article,
    comments: [],
    edits: [],
    name: '',
    email: '',
    website: '',
  };
}
export function readDraft(
  storage: Pick<Storage, 'getItem'>,
  article: ContributionArticle,
): ArticleContribution | null {
  try {
    const raw = storage.getItem(draftKey(article.path));
    if (!raw || new TextEncoder().encode(raw).byteLength > 131072) return null;
    const value = parseContribution(JSON.parse(raw));
    return value?.article.path === article.path && value.article.sourceId === article.sourceId
      ? value
      : null;
  } catch {
    return null;
  }
}
/** Names and reply addresses are used at submission only, never saved with the local draft. */
export function storeDraft(
  storage: Pick<Storage, 'setItem' | 'removeItem'>,
  draft: ArticleContribution,
): boolean {
  try {
    const key = draftKey(draft.article.path);
    if (!draft.comments.length && !draft.edits.length) storage.removeItem(key);
    else {
      const value = JSON.stringify({ ...draft, name: '', email: '', website: '' });
      if (
        new TextEncoder().encode(value).byteLength > 131072 ||
        !parseContribution(JSON.parse(value))
      )
        return false;
      storage.setItem(key, value);
    }
    return true;
  } catch {
    return false;
  }
}
