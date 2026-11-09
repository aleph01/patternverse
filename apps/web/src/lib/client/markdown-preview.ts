import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { remarkArticleWidgets } from '$lib/article-widgets/markdown';
import { remarkArticleVideos } from '$lib/article-videos/markdown';
import type { Root, RootContent } from 'mdast';

export const renderMarkdownPreview = async (
  markdown: string,
  options: { strikethrough?: boolean } = {},
): Promise<string> => {
  const output = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(() => (tree: Root) => {
      if (options.strikethrough !== false) return;
      const walk = (node: { children?: RootContent[] }) => {
        if (!node.children) return;
        node.children = node.children.map((child) => {
          if (child.type === 'delete')
            return {
              type: 'text',
              value: markdown.slice(
                child.position?.start.offset ?? 0,
                child.position?.end.offset ?? 0,
              ),
            };
          if ('children' in child) walk(child as { children: RootContent[] });
          return child;
        });
      };
      walk(tree);
    })
    .use(remarkArticleWidgets)
    .use(remarkArticleVideos)
    .use(remarkRehype)
    .use(rehypeSanitize, {
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        div: [...(defaultSchema.attributes?.div ?? []), 'dataArticleWidget', 'dataArticleVideo'],
      },
    })
    .use(rehypeStringify)
    .process(markdown);
  return String(output);
};
