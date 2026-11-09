import { safeContributionHref, type ContributionLink } from './contract.js';
import { wordDiff, type TextChange } from './diff.js';

export function linkChanges(
  before: string,
  after: string,
  beforeLinks: ContributionLink[] = [],
  afterLinks: ContributionLink[] = [],
) {
  const original = beforeLinks.map((link) => ({
    text: before.slice(link.from, link.to),
    href: link.href,
  }));
  const proposed = afterLinks.map((link) => ({
    text: after.slice(link.from, link.to),
    href: link.href,
  }));
  const equal = (a: (typeof original)[number], b: (typeof original)[number]) =>
    a.text === b.text && a.href === b.href;
  const added = [...proposed],
    removed: typeof original = [];
  for (const link of original) {
    const index = added.findIndex((candidate) => equal(link, candidate));
    if (index >= 0) added.splice(index, 1);
    else removed.push(link);
  }
  return { removed, added };
}

export function linkedDiff(
  before: string,
  after: string,
  beforeLinks: ContributionLink[] = [],
  afterLinks: ContributionLink[] = [],
): (TextChange & { href?: string })[] {
  const segments: (TextChange & { href?: string })[] = [];
  let oldOffset = 0,
    newOffset = 0;
  for (const change of wordDiff(before, after)) {
    const offset = change.kind === 'removed' ? oldOffset : newOffset;
    const links = change.kind === 'removed' ? beforeLinks : afterLinks;
    let cursor = offset;
    const end = offset + change.text.length;
    for (const link of links) {
      if (link.to <= cursor || link.from >= end || !safeContributionHref(link.href)) continue;
      if (link.from > cursor)
        segments.push({
          kind: change.kind,
          text: change.text.slice(cursor - offset, link.from - offset),
        });
      const start = Math.max(cursor, link.from),
        stop = Math.min(end, link.to);
      segments.push({
        kind: change.kind,
        text: change.text.slice(start - offset, stop - offset),
        href: link.href,
      });
      cursor = stop;
    }
    if (cursor < end)
      segments.push({ kind: change.kind, text: change.text.slice(cursor - offset) });
    if (change.kind !== 'added') oldOffset += change.text.length;
    if (change.kind !== 'removed') newOffset += change.text.length;
  }
  return segments;
}
