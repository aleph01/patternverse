import type {
  EntityRef,
  PatternverseSource,
  PatternverseSourceManifest,
  RawEntity,
  PracticeDefinition,
} from '@patternverse/schema';

export type DiagnosticSeverity = 'error' | 'warning';

export type DiagnosticCode =
  | 'io-error'
  | 'invalid-manifest'
  | 'missing-content-directory'
  | 'empty-content-directory'
  | 'missing-frontmatter'
  | 'invalid-frontmatter'
  | 'invalid-entity'
  | 'unknown-field'
  | 'invalid-wiki-link'
  | 'invalid-practice-block'
  | 'multiple-practice-blocks'
  | 'practice-block-on-non-practice'
  | 'duplicate-id'
  | 'unresolved-reference'
  | 'wrong-reference-type'
  | 'collection-cycle';

export type CompilerDiagnostic = {
  readonly code: DiagnosticCode;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly file?: string;
  readonly entity?: EntityRef;
  readonly field?: string;
  readonly reference?: string;
  readonly suggestion?: string;
  readonly line?: number;
};

export type AuthoredWikiLink = {
  readonly raw: string;
  readonly entityId: string;
  readonly sourceId?: string;
  readonly label?: string;
  readonly line?: number;
};

export type ParsedEntity = RawEntity & {
  readonly wikiLinks: readonly AuthoredWikiLink[];
  /** Import-only legacy data; execution must use languagePracticeSource. */
  readonly practice?: PracticeDefinition;
  readonly languagePracticeSource?: string;
};

export type ResolvedWikiLink = AuthoredWikiLink & {
  readonly target: EntityRef;
  readonly resolvedLabel: string;
};

export type CompiledEntity = ParsedEntity & {
  readonly ref: EntityRef;
  readonly links: readonly ResolvedWikiLink[];
  readonly backlinks: readonly EntityRef[];
  readonly collectionItems: readonly EntityRef[];
  readonly collectionMemberships: readonly EntityRef[];
  readonly verseMemberships: readonly EntityRef[];
  readonly verseMembers: readonly EntityRef[];
  readonly implementsPatterns: readonly EntityRef[];
  readonly implementedByPractices: readonly EntityRef[];
};

export type UnresolvedReference = {
  readonly from: EntityRef;
  readonly field: 'body' | 'items' | 'verses' | 'implements';
  readonly reference: string;
};

export type SearchDocument = {
  readonly id: string;
  readonly ref: EntityRef;
  readonly type: RawEntity['type'];
  readonly sourceId: string;
  readonly status: RawEntity['status'];
  readonly title: string;
  readonly aliases: readonly string[];
  readonly tags?: readonly string[];
  readonly summary: string;
  readonly body: string;
  readonly verseNames: readonly string[];
  readonly collectionNames: readonly string[];
};

export type CompiledCorpus = {
  readonly schemaVersion: 1;
  readonly sources: readonly PatternverseSource[];
  readonly entities: readonly CompiledEntity[];
  readonly searchDocuments: readonly SearchDocument[];
  readonly unresolvedReferences: readonly UnresolvedReference[];
  readonly diagnostics: readonly CompilerDiagnostic[];
};

export type LoadedCorpus = {
  readonly manifest?: PatternverseSourceManifest;
  readonly source?: PatternverseSource;
  readonly entities: readonly ParsedEntity[];
  readonly diagnostics: readonly CompilerDiagnostic[];
};

export type ParseEntityOptions = {
  readonly sourceId: string;
  readonly sourcePath: string;
  readonly unknownFieldPolicy?: 'error' | 'warning';
};

export type ParseEntityResult = {
  readonly entity?: ParsedEntity;
  readonly diagnostics: readonly CompilerDiagnostic[];
};

export type CompileOptions = {
  readonly includeDrafts?: boolean;
  readonly personalSourceId?: string;
  readonly commonsSourceId?: string;
};
