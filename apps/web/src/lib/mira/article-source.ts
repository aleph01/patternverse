import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Root, Heading } from 'mdast';

/** Reading material only: execution fences and host-specific Mira sections are not model instructions. */
export function readableArticleSource(body: string): string {
  const tree = unified().use(remarkParse).parse(body) as Root;
  const headingText = (node: Heading) =>
    node.children
      .map((child) => ('value' in child ? child.value : ''))
      .join('')
      .trim()
      .toLowerCase();
  const omitted = new Set(['with mira', 'executable pattern markdown']);
  let omitDepth: number | null = null;
  return tree.children
    .flatMap((node) => {
      if (node.type === 'heading') {
        if (omitDepth !== null && node.depth <= omitDepth) omitDepth = null;
        if (omitted.has(headingText(node))) omitDepth = node.depth;
      }
      if (
        omitDepth !== null ||
        (node.type === 'code' &&
          ['patternverse-language', 'patternverse-practice'].includes(node.lang ?? ''))
      )
        return [];
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      return start === undefined || end === undefined ? [] : [body.slice(start, end)];
    })
    .join('\n\n');
}
