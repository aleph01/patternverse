import type { CorpusPath } from './types.js';

export const normalizeCorpusPath = (input: string): CorpusPath => {
  if (input.includes('\0')) throw new Error('Corpus paths cannot contain null bytes.');

  const withForwardSlashes = input.replaceAll('\\', '/');
  if (withForwardSlashes.startsWith('/')) {
    throw new Error(`Corpus paths must be relative: "${input}".`);
  }

  const segments = withForwardSlashes.split('/').filter((segment) => segment !== '');
  while (segments[0] === '.') segments.shift();

  if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error(`Corpus path is empty or unsafe: "${input}".`);
  }

  return segments.join('/');
};
