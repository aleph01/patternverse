import { normalizeCorpusPath } from './path.js';
import type { CorpusFile, CorpusSnapshot } from './types.js';

export const cloneCorpusFile = (file: CorpusFile, path = file.path): CorpusFile => ({
  path: normalizeCorpusPath(path),
  contentHash: file.contentHash,
  content: new Uint8Array(file.content),
});

export const createCorpusSnapshot = (snapshot: CorpusSnapshot): CorpusSnapshot => {
  const filesByPath = new Map<string, CorpusFile>();

  for (const candidate of snapshot.files) {
    const file = cloneCorpusFile(candidate);
    if (filesByPath.has(file.path)) {
      throw new Error(`Corpus snapshot contains duplicate path "${file.path}".`);
    }
    filesByPath.set(file.path, file);
  }

  return {
    revision: snapshot.revision,
    files: [...filesByPath.values()].sort((left, right) => left.path.localeCompare(right.path)),
  };
};

export const indexCorpusSnapshot = (snapshot: CorpusSnapshot): ReadonlyMap<string, CorpusFile> =>
  new Map(createCorpusSnapshot(snapshot).files.map((file) => [file.path, file]));
