/** Public section anchors shared by the article renderer and its navigation. */
export type ArticleSection = Readonly<{ id: string; title: string; depth: 2 | 3 }>;

export const hasArticleOutline = (sections: readonly ArticleSection[]): boolean =>
  sections.length >= 3;
