import { z } from 'zod';

export const ARTICLE_WIDGET_LANGUAGE = 'patternverse-widget';

const articleWidgetSchema = z
  .object({
    src: z.string().regex(/^[a-z0-9][a-z0-9-]*\.html$/),
    title: z.string().trim().min(1).max(160),
    height: z.number().int().min(200).max(1200).default(480),
    fallback: z.string().trim().min(1).max(2000),
  })
  .strict();

export type ArticleWidget = z.infer<typeof articleWidgetSchema>;

/** Widgets reference bundled local documents, never arbitrary URLs or inline article HTML. */
export function parseArticleWidget(source: string): ArticleWidget | undefined {
  try {
    const result = articleWidgetSchema.safeParse(JSON.parse(source));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}
