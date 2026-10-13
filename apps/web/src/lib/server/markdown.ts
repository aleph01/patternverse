import { entityRefKey, type CompiledEntity, type ResolvedWikiLink } from '@patternverse/compiler';
import type { Code, Heading, Link, Parent, Root, RootContent, Text } from 'mdast';
import rehypeSanitize, { defaultSchema, type Options as SanitizeOptions } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { SKIP, visit } from 'unist-util-visit';

const WIKI_LINK_PATTERN = /\[\[([^\]\n]+)\]\]/g;

// Keep diagrams in isolated image documents: repeated SVGs cannot collide with page IDs.
// Only captioned, local diagram assets receive this presentation; raw HTML stays disabled.
const diagramSanitizeSchema: SanitizeOptions = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'figure', 'figcaption'],
  attributes: {
    ...defaultSchema.attributes,
    figure: [['className', 'content-diagram']],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      ['className', 'diagram-scroll'],
      ['role', 'region'],
      'ariaLabel',
    ],
    span: [...(defaultSchema.attributes?.span ?? []), ['className', 'diagram-hint']],
  },
};

export type MarkdownRenderOptions = Readonly<{ omitSections?: readonly string[] }>;

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
) => {
  const queues = createWikiLinkQueues(entity.links);

  return (tree: Root): void => {
    removeSections(tree, options.omitSections ?? []);

    visit(tree, 'paragraph', (node) => {
      const image = node.children[0];
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

export const renderEntityMarkdown = async (
  entity: CompiledEntity,
  entities: readonly CompiledEntity[],
  options: MarkdownRenderOptions = {},
): Promise<string> => {
  const entityIndex = new Map(
    entities.map((candidate) => [entityRefKey(candidate.ref), candidate] as const),
  );

  const output = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(() => remarkPatternverse(entity, entityIndex, options))
    .use(remarkRehype)
    .use(rehypeSanitize, diagramSanitizeSchema)
    .use(rehypeStringify)
    .process(entity.body);

  return String(output);
};
