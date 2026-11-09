import type { Heading, Root } from 'mdast';
import { defaultSchema } from 'rehype-sanitize';
import { visit } from 'unist-util-visit';
import type { ArticleSection } from '$lib/article-sections';

/** Assign stable anchors to rendered sections, including repeated or non-Latin headings. */
export function anchorArticleSections(tree: Root): readonly ArticleSection[] {
  const sections: ArticleSection[] = [];
  const used = new Set<string>();
  visit(tree, 'heading', (heading) => {
    if (heading.depth !== 2 && heading.depth !== 3) return;
    const title = heading.children.map(inlineText).join('').replace(/\s+/g, ' ').trim();
    if (!title) return;
    const slug =
      title
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-|-$/g, '') || 'section';
    // Sentence-length headings should still produce short, readable shared links.
    const fragment = Array.from(slug).slice(0, 32).join('').replace(/-$/, '');
    const base = `article-section-${fragment}`;
    let id = base;
    let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    heading.data = {
      ...heading.data,
      hProperties: { ...heading.data?.hProperties, id, tabIndex: -1 },
    };
    sections.push({ id: `${defaultSchema.clobberPrefix ?? ''}${id}`, title, depth: heading.depth });
  });
  return sections;
}

function inlineText(node: Heading['children'][number]): string {
  if ('children' in node) return node.children.map(inlineText).join('');
  if (node.type === 'image') return node.alt ?? '';
  return 'value' in node && typeof node.value === 'string' ? node.value : '';
}
