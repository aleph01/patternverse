// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  parseContribution,
  type ContributionLink,
} from '../../../../article-contributions/src/contract.js';
import { linkChanges, linkedDiff, newContribution, readDraft, storeDraft } from './model';
import { readLinks, retainLinks } from './links';

const article = {
  sourceId: 'commons',
  id: 'example',
  type: 'pattern',
  title: 'Example',
  path: '/pattern/example',
  revision: 'a'.repeat(64),
};
function proposal(links: ContributionLink[]) {
  const value = newContribution(article);
  value.edits.push({
    blockId: 'block-0',
    sectionId: '',
    sectionTitle: 'Introduction',
    before: 'Useful pattern',
    after: 'Useful pattern',
    beforeLinks: [],
    afterLinks: links,
  });
  return value;
}
describe('article contribution links', () => {
  it('accepts link-only edits and restores them without losing their destinations', () => {
    const links = [{ from: 0, to: 6, href: '/pattern/run-a-premortem' }];
    const value = proposal(links);
    expect(parseContribution(value)?.edits[0]?.afterLinks).toEqual(links);
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, text: string) => {
        values.set(key, text);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    expect(storeDraft(storage, value)).toBe(true);
    expect(readDraft(storage, article)?.edits[0]?.afterLinks).toEqual(links);
    expect(parseContribution(proposal([]))).toBeNull();
  });
  it('rejects executable destinations, broken ranges, overlapping links and partial metadata', () => {
    for (const href of [
      'javascript:alert(1)',
      'data:text/html,test',
      '//example.com',
      '/\\example.com',
      'https://example.com\ninvalid',
    ])
      expect(parseContribution(proposal([{ from: 0, to: 6, href }]))).toBeNull();
    for (const links of [
      [{ from: 6, to: 3, href: '/pattern/example' }],
      [{ from: 0, to: 100, href: '/pattern/example' }],
      [
        { from: 0, to: 6, href: '/pattern/example' },
        { from: 4, to: 8, href: '/pattern/other' },
      ],
    ])
      expect(parseContribution(proposal(links))).toBeNull();
    const partial = proposal([{ from: 0, to: 6, href: '/pattern/example' }]);
    delete partial.edits[0]!.beforeLinks;
    expect(parseContribution(partial)).toBeNull();
  });
  it('preserves existing anchors and recovers their positions in older text-only drafts', () => {
    const node = document.createElement('p');
    node.innerHTML = 'A <a href="#contribution-section">useful <strong>pattern</strong></a>.';
    const links = readLinks(node);
    expect(links).toEqual([{ from: 2, to: 16, href: '#section' }]);
    expect(retainLinks(node.textContent!, `Try ${node.textContent!}`, links)).toEqual([
      { from: 6, to: 20, href: '#section' },
    ]);
  });
  it('shows destination changes even when the linked words stay the same', () => {
    const before = [{ from: 0, to: 6, href: '/pattern/old' }];
    const after = [{ from: 0, to: 6, href: '/pattern/new' }];
    expect(linkChanges('Useful pattern', 'Useful pattern', before, after)).toEqual({
      removed: [{ text: 'Useful', href: '/pattern/old' }],
      added: [{ text: 'Useful', href: '/pattern/new' }],
    });
    expect(linkedDiff('Useful pattern', 'Useful pattern', before, after)[0]).toEqual({
      kind: 'same',
      text: 'Useful',
      href: '/pattern/new',
    });
  });
  it('reports an additional occurrence of the same link', () => {
    const original = [{ from: 0, to: 4, href: '/pattern/example' }];
    expect(
      linkChanges('Read Read', 'Read Read', original, [
        ...original,
        { from: 5, to: 9, href: '/pattern/example' },
      ]).added,
    ).toEqual([{ text: 'Read', href: '/pattern/example' }]);
  });
});
