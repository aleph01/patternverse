import type { CompiledCorpus } from '@patternverse/compiler';
import type { DefinitionInspection, InspectDefinition } from './definition.js';
import { createPublicLibrary, PublicLibraryError } from './library.js';

export type PublicSnapshot = {
  corpus: CompiledCorpus;
  dependencySources: Record<string, string>;
  definitions: Record<string, DefinitionInspection>;
};

/** Build-time projection, not another parser: validate every exposed practice with Rust. */
export function compilePublicSnapshot(
  original: CompiledCorpus,
  dependencySources: Record<string, string>,
  inspect: InspectDefinition,
): PublicSnapshot {
  const entities = original.entities
    .filter((entry) => entry.sourceId === 'commons' && entry.status === 'published')
    .map((entry) => {
      const publicEntry = { ...entry };
      delete publicEntry.sourcePath;
      return publicEntry;
    });
  const ids = new Set(entities.map((entry) => entry.id));
  const corpus: CompiledCorpus = {
    schemaVersion: 1,
    sources: [],
    entities,
    searchDocuments: original.searchDocuments.filter(
      (entry) =>
        entry.sourceId === 'commons' && entry.status === 'published' && ids.has(entry.ref.entityId),
    ),
    unresolvedReferences: [],
    diagnostics: [],
  };
  const definitions: Record<string, DefinitionInspection> = {};
  const library = createPublicLibrary(corpus, dependencySources, (bundle) => {
    const definition = inspect(bundle);
    definitions[definition.root] = definition;
    return definition;
  });
  for (const entry of entities) {
    if (entry.type !== 'pattern' && entry.type !== 'practice') continue;
    if (entry.type === 'pattern') {
      for (const practice of library.getPattern(entry.id).pattern.practices)
        library.getPractice(entry.id, 'commons', practice.id);
    } else {
      try {
        library.getPractice(entry.id);
      } catch (error) {
        if (!(error instanceof PublicLibraryError) || error.code !== 'NO_PRACTICE') throw error;
      }
    }
  }
  // Retain only source dependencies actually required by published practices.
  const required = new Set(
    Object.values(definitions).flatMap((definition) => Object.keys(definition.sources)),
  );
  return {
    corpus,
    definitions,
    dependencySources: Object.fromEntries(
      Object.entries(dependencySources).filter(([name]) => required.has(name)),
    ),
  };
}

/** Same library semantics; validated immutable definitions replace on-request compilation. */
export function libraryFromSnapshot(snapshot: PublicSnapshot) {
  return createPublicLibrary(snapshot.corpus, snapshot.dependencySources, (bundle) => {
    const definition = snapshot.definitions[bundle.root];
    if (
      !definition ||
      Object.entries(definition.sources).some(([name, source]) => bundle.patterns[name] !== source)
    )
      throw new Error('Snapshot definition mismatch');
    return definition;
  });
}
