import { entityRefKey, type CompiledEntity, type ResolvedWikiLink } from '@patternverse/compiler';
import type { Code, Heading, Link, Parent, Root, RootContent, Text } from 'mdast';
import rehypeSanitize, { defaultSchema, type Options as SanitizeOptions } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { SKIP, visit } from 'unist-util-visit';
import { assetMimeType, contentAssetDimensions } from './content-assets';
import { remarkArticleWidgets } from '$lib/article-widgets/markdown';
import { remarkArticleVideos } from '$lib/article-videos/markdown';
import type { ArticleSection } from '$lib/article-sections';
import { anchorArticleSections } from './article-sections';
import { rehypeSyntaxHighlighting } from './syntax-highlighting';

const WIKI_LINK_PATTERN = /\[\[([^\]\n]+)\]\]/g;

// Keep diagrams in isolated image documents: repeated SVGs cannot collide with page IDs.
// Only captioned, local diagram assets receive this presentation; raw HTML stays disabled.
const diagramSanitizeSchema: SanitizeOptions = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'figure', 'figcaption', 'picture', 'source'],
  attributes: {
    ...defaultSchema.attributes,
    h2: [...(defaultSchema.attributes?.h2 ?? []), ['tabIndex', -1]],
    h3: [...(defaultSchema.attributes?.h3 ?? []), ['tabIndex', -1]],
    figure: [['className', 'content-diagram', 'content-photo']],
    img: [...(defaultSchema.attributes?.img ?? []), 'loading', 'decoding'],
    source: ['srcSet', 'media', 'type', 'width', 'height'],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      ['tabIndex', 0],
      'dataArticleWidget',
      'dataArticleVideo',
      ['className', 'diagram-scroll'],
      ['role', 'region'],
      'ariaLabel',
    ],
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      ['className', 'diagram-hint', 'figure-credit'],
    ],
  },
};

export type MarkdownRenderOptions = Readonly<{ omitSections?: readonly string[] }>;

/** Render public article sections and their outline in the same Markdown pass. */
export const renderEntityArticle = (
  entity: CompiledEntity,
  entities: readonly CompiledEntity[],
  options: MarkdownRenderOptions = {},
): Promise<Readonly<{ html: string; sections: readonly ArticleSection[] }>> =>
  renderMarkdown(entity, entities, options, true);

export const renderEntityMarkdown = async (
  entity: CompiledEntity,
  entities: readonly CompiledEntity[],
  options: MarkdownRenderOptions = {},
): Promise<string> => (await renderMarkdown(entity, entities, options, false)).html;

/** Remove complete public-reading sections by heading, while retaining the source entity unchanged. */
const removeSections = (tree: Root, omittedHeadings: readonly string[]): void => {
  const omitted = new Set(omittedHeadings.map((heading) => heading.trim().toLocaleLowerCase()));
  for (let index = 0; index < tree.children.length; index += 1) {
    const node = tree.children[index];
    if (node?.type !== 'heading' || !omitted.has(headingText(node))) continue;
    let end = index + 1;
    while (end < tree.children.length) {
      const candidate = tree.children[end];
      if (candidate?.type === 'heading' && candidate.depth <= node.depth) break;
      end += 1;
    }
    tree.children.splice(index, end - index);
    index -= 1;
  }
};

const headingText = (heading: Heading): string =>
  heading.children
    .flatMap((child) => ('value' in child && typeof child.value === 'string' ? [child.value] : []))
    .join('')
    .trim()
    .toLocaleLowerCase();

const createWikiLinkQueues = (
  links: readonly ResolvedWikiLink[],
): Map<string, ResolvedWikiLink[]> => {
  const queues = new Map<string, ResolvedWikiLink[]>();
  for (const link of links) queues.set(link.raw, [...(queues.get(link.raw) ?? []), link]);
  return queues;
};

const replaceWikiLinks = (
  node: Text,
  queues: Map<string, ResolvedWikiLink[]>,
  entityIndex: ReadonlyMap<string, CompiledEntity>,
): readonly RootContent[] => {
  const children: RootContent[] = [];
  let cursor = 0;

  for (const match of node.value.matchAll(WIKI_LINK_PATTERN)) {
    const index = match.index ?? 0;
    const raw = match[0];
    if (index > cursor) children.push({ type: 'text', value: node.value.slice(cursor, index) });

    const queue = queues.get(raw) ?? [];
    const resolved = queue.shift();
    if (!resolved) {
      children.push({ type: 'text', value: raw });
    } else {
      queues.set(raw, queue);
      const target = entityIndex.get(entityRefKey(resolved.target));
      if (!target) {
        children.push({ type: 'text', value: resolved.resolvedLabel });
      } else {
        const link: Link = {
          type: 'link',
          url: `/${target.type}/${target.id}`,
          children: [{ type: 'text', value: resolved.resolvedLabel }],
        };
        children.push(link);
      }
    }
    cursor = index + raw.length;
  }

  if (cursor < node.value.length) children.push({ type: 'text', value: node.value.slice(cursor) });
  return children.length > 0 ? children : [node];
};

const remarkPatternverse = (
  entity: CompiledEntity,
  entityIndex: ReadonlyMap<string, CompiledEntity>,
  options: MarkdownRenderOptions,
  assetDimensions: Awaited<ReturnType<typeof contentAssetDimensions>>,
) => {
  const queues = createWikiLinkQueues(entity.links);

  return (tree: Root): void => {
    removeSections(tree, options.omitSections ?? []);

    visit(tree, 'paragraph', (node, index, parent) => {
      const image = node.children[0];
      // Imported film evidence keeps its publisher URL and Markdown attribution.
      // Treat only an explicit image/caption pair as a figure, leaving ordinary
      // remote images and unrelated prose untouched.
      const caption = index === undefined ? undefined : parent?.children[index + 1];
      if (
        entity.id.startsWith('film-') &&
        node.children.length === 1 &&
        image?.type === 'image' &&
        /^https:\/\//.test(image.url) &&
        caption?.type === 'paragraph' &&
        caption.children[0]?.type === 'emphasis' &&
        caption.children.some((child) => child.type === 'text' && child.value.includes('Credit:'))
      ) {
        const captionChildren = caption.children.flatMap((child) => {
          if (child.type !== 'text' || !child.value.includes('Credit:')) return [child];
          const boundary = child.value.indexOf('Credit:');
          return [
            { type: 'text' as const, value: child.value.slice(0, boundary) },
            {
              type: 'emphasis' as const,
              data: { hName: 'span', hProperties: { className: ['figure-credit'] } },
              children: [{ type: 'text' as const, value: child.value.slice(boundary) }],
            },
          ];
        });
        node.data = { hName: 'figure', hProperties: { className: ['content-photo'] } };
        node.children = [
          {
            type: 'link',
            url: image.url,
            data: { hProperties: { ariaLabel: 'Open full-size photograph or film image' } },
            children: [image],
          },
          { type: 'emphasis', data: { hName: 'figcaption' }, children: captionChildren },
        ];
        parent?.children.splice(index! + 1, 1);
        return;
      }
      const assetPath =
        image?.type === 'image' ? image.url.replace(/^(?:\.\.\/assets\/|\/assets\/)/, '') : '';
      if (
        node.children.length === 1 &&
        image?.type === 'image' &&
        /^(?:\.\.\/assets\/|\/assets\/)/.test(image.url) &&
        assetMimeType(assetPath)?.startsWith('image/')
      ) {
        image.url = `/assets/${assetPath}`;
        if (!image.title) return;
        const dimensions = assetDimensions[assetPath];
        const isDiagram = assetPath.endsWith('.svg');
        const compactPath = assetPath.replace(/\.svg$/, '-mobile.svg');
        const compactDimensions = isDiagram ? assetDimensions[compactPath] : undefined;
        const imageNode = {
          type: 'element' as const,
          tagName: 'a',
          properties: { href: image.url, ariaLabel: 'Open full-size visual' },
          children: [
            {
              type: 'element' as const,
              tagName: 'img',
              properties: {
                src: image.url,
                alt: image.alt ?? '',
                loading: 'lazy',
                decoding: 'async',
                ...dimensions,
              },
              children: [],
            },
          ],
        };
        node.data = {
          hName: 'figure',
          hProperties: { className: [isDiagram ? 'content-diagram' : 'content-photo'] },
          hChildren: [
            isDiagram
              ? {
                  type: 'element',
                  tagName: 'div',
                  properties: {
                    className: ['diagram-scroll'],
                    tabIndex: 0,
                    role: 'region',
                    ariaLabel: `Scrollable visual: ${image.alt ?? entity.title}`,
                  },
                  children: [
                    compactDimensions
                      ? {
                          ...imageNode,
                          children: [
                            {
                              type: 'element' as const,
                              tagName: 'picture',
                              properties: {},
                              children: [
                                {
                                  type: 'element' as const,
                                  tagName: 'source',
                                  properties: {
                                    srcSet: `/assets/${compactPath}`,
                                    media: '(max-width: 600px)',
                                    type: 'image/svg+xml',
                                    ...compactDimensions,
                                  },
                                  children: [],
                                },
                                imageNode.children[0],
                              ],
                            },
                          ],
                        }
                      : imageNode,
                  ],
                }
              : imageNode,
            {
              type: 'element',
              tagName: 'figcaption',
              properties: {},
              children: [
                { type: 'text', value: image.title },
                ...(isDiagram
                  ? [
                      {
                        type: 'element' as const,
                        tagName: 'span',
                        properties: { className: ['diagram-hint'] },
                        children: [
                          {
                            type: 'text' as const,
                            value: compactDimensions
                              ? 'Open the visual for full detail.'
                              : 'Scroll horizontally for readable labels; open the visual for full detail.',
                          },
                        ],
                      },
                    ]
                  : []),
              ],
            },
          ],
        };
        return;
      }
      if (
        node.children.length !== 1 ||
        image?.type !== 'image' ||
        !image.title ||
        !/^\/diagrams\/[a-z0-9/-]+\.svg$/.test(image.url)
      )
        return;

      node.data = {
        hName: 'figure',
        hProperties: { className: ['content-diagram'] },
        hChildren: [
          {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['diagram-scroll'],
              tabIndex: 0,
              role: 'region',
              ariaLabel: `Scrollable diagram: ${image.alt ?? entity.title}`,
            },
            children: [
              {
                type: 'element',
                tagName: 'img',
                properties: { src: image.url, alt: image.alt ?? '', width: 720, height: 470 },
                children: [],
              },
            ],
          },
          {
            type: 'element',
            tagName: 'figcaption',
            properties: {},
            children: [
              { type: 'text', value: image.title },
              {
                type: 'element',
                tagName: 'span',
                properties: { className: ['diagram-hint'] },
                children: [
                  { type: 'text', value: 'Scroll horizontally to read all diagram labels.' },
                ],
              },
            ],
          },
        ],
      };
    });

    visit(tree, 'code', (node: Code, index, parent: Parent | undefined) => {
      if (
        (node.lang === 'patternverse-practice' || node.lang === 'patternverse-language') &&
        parent &&
        index !== undefined
      ) {
        parent.children.splice(index, 1);
        return [SKIP, index];
      }
      return undefined;
    });

    visit(tree, 'text', (node: Text, index, parent: Parent | undefined) => {
      if (!parent || index === undefined || !node.value.includes('[[')) return undefined;
      const replacement = replaceWikiLinks(node, queues, entityIndex);
      parent.children.splice(index, 1, ...replacement);
      return [SKIP, index + replacement.length];
    });
  };
};

const renderMarkdown = async (
  entity: CompiledEntity,
  entities: readonly CompiledEntity[],
  options: MarkdownRenderOptions,
  withSections: boolean,
): Promise<Readonly<{ html: string; sections: readonly ArticleSection[] }>> => {
  const entityIndex = new Map(
    entities.map((candidate) => [entityRefKey(candidate.ref), candidate] as const),
  );
  const assetDimensions = await contentAssetDimensions();
  let sections: readonly ArticleSection[] = [];

  const output = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(() => remarkPatternverse(entity, entityIndex, options, assetDimensions))
    .use(remarkArticleWidgets)
    .use(remarkArticleVideos)
    .use(() => (tree: Root) => {
      if (withSections) sections = anchorArticleSections(tree);
    })
    .use(remarkRehype)
    .use(rehypeSanitize, diagramSanitizeSchema)
    .use(rehypeSyntaxHighlighting)
    .use(rehypeStringify)
    .process(entity.body);

  return { html: String(output), sections };
};
