import { describe, expect, it } from 'vitest';

import {
  createCorpusFile,
  createCorpusSnapshot,
  hashCorpusContent,
  normalizeCorpusPath,
} from '../src/index.js';

const encoder = new TextEncoder();

describe('corpus paths and snapshots', () => {
  it.each([
    ['./patterns/focus.md', 'patterns/focus.md'],
    ['patterns\\focus.md', 'patterns/focus.md'],
    ['patterns//focus.md', 'patterns/focus.md'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeCorpusPath(input)).toBe(expected);
  });

  it.each(['', '.', '..', '../secrets', 'patterns/../../secrets', '/absolute.md', '\\absolute.md'])(
    'rejects unsafe path %j',
    (input) => {
      expect(() => normalizeCorpusPath(input)).toThrow();
    },
  );

  it('rejects duplicate normalized paths', () => {
    expect(() =>
      createCorpusSnapshot({
        revision: null,
        files: [
          {
            path: './patterns/focus.md',
            contentHash: 'sha256:A',
            content: encoder.encode('A'),
          },
          {
            path: 'patterns/focus.md',
            contentHash: 'sha256:A',
            content: encoder.encode('A'),
          },
        ],
      }),
    ).toThrow(/duplicate/i);
  });

  it('sorts files and clones mutable content at the snapshot boundary', () => {
    const bytes = encoder.encode('A');
    const result = createCorpusSnapshot({
      revision: 'r1',
      files: [
        { path: 'verses/z.md', contentHash: 'sha256:Z', content: encoder.encode('Z') },
        { path: 'assets/a.bin', contentHash: 'sha256:A', content: bytes },
      ],
    });
    bytes[0] = 90;

    expect(result.files.map(({ path }) => path)).toEqual(['assets/a.bin', 'verses/z.md']);
    expect(new TextDecoder().decode(result.files[0]?.content)).toBe('A');
  });

  it('hashes exact bytes with SHA-256 and creates a canonical file', async () => {
    const content = encoder.encode('Patternverse');

    await expect(hashCorpusContent(content)).resolves.toBe(
      'sha256:95bd0ef0b03e5bf262a0cbc7651a987dd1f6df2cf58fef47745c39034685c5c7',
    );
    await expect(createCorpusFile('./patterns/focus.md', content)).resolves.toMatchObject({
      path: 'patterns/focus.md',
      contentHash: 'sha256:95bd0ef0b03e5bf262a0cbc7651a987dd1f6df2cf58fef47745c39034685c5c7',
    });
  });
});
