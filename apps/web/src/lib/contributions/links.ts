import { wordDiff, safeContributionHref, type ContributionLink } from './model';

export function readLinks(element: HTMLElement): ContributionLink[] {
  const links: ContributionLink[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let offset = 0,
    node: Node | null;
  while ((node = walker.nextNode())) {
    const length = node.textContent?.length ?? 0;
    const anchor = node.parentElement?.closest('a');
    let href = anchor?.getAttribute('href') ?? '';
    if (href.startsWith('#contribution-')) href = `#${href.slice('#contribution-'.length)}`;
    if (length && anchor && safeContributionHref(href)) {
      const last = links.at(-1);
      if (last?.to === offset && last.href === href) last.to += length;
      else links.push({ from: offset, to: offset + length, href });
    }
    offset += length;
  }
  return links;
}

/** Recover unchanged link labels in older text-only drafts. */
export function retainLinks(
  before: string,
  after: string,
  links: ContributionLink[],
): ContributionLink[] {
  if (before === after) return links.map((link) => ({ ...link }));
  const retained: ContributionLink[] = [];
  let oldOffset = 0,
    newOffset = 0;
  for (const change of wordDiff(before, after)) {
    if (change.kind === 'same') {
      for (const link of links) {
        if (link.from >= oldOffset && link.to <= oldOffset + change.text.length)
          retained.push({
            ...link,
            from: newOffset + link.from - oldOffset,
            to: newOffset + link.to - oldOffset,
          });
      }
    }
    if (change.kind !== 'added') oldOffset += change.text.length;
    if (change.kind !== 'removed') newOffset += change.text.length;
  }
  return retained;
}
