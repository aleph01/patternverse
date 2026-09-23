import { normalizeCorpusPath } from './path.js';
import type { ContentHash, CorpusFile } from './types.js';

const asHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export const hashCorpusContent = async (content: Uint8Array): Promise<ContentHash> => {
  const copied = new Uint8Array(content);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', copied.buffer);
  return `sha256:${asHex(new Uint8Array(digest))}`;
};

export const createCorpusFile = async (path: string, content: Uint8Array): Promise<CorpusFile> => {
  const copied = new Uint8Array(content);
  return {
    path: normalizeCorpusPath(path),
    contentHash: await hashCorpusContent(copied),
    content: copied,
  };
};
