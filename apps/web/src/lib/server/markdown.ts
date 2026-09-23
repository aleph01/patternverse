import { entityRefKey, type CompiledEntity, type ResolvedWikiLink } from '@patternverse/compiler';
import type { Code, Link, Parent, Root, RootContent, Text } from 'mdast';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { SKIP, visit } from 'unist-util-visit';

const WIKI_LINK_PATTERN = /\[\[([^\]\n]+)\]\]/g;

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
) => {
  const queues = createWikiLinkQueues(entity.links);

  return (tree: Root): void => {
    visit(tree, 'code', (node: Code, index, parent: Parent | undefined) => {
      if (node.lang === 'patternverse-practice' && parent && index !== undefined) {
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
): Promise<string> => {
  const entityIndex = new Map(
    entities.map((candidate) => [entityRefKey(candidate.ref), candidate] as const),
  );

  const output = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(() => remarkPatternverse(entity, entityIndex))
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(entity.body);

  return String(output);
};
