# Compatibility boundaries

This inventory describes current source boundaries, not deployment status. Cleanup must
preserve imported content and private historical runs; a `legacy` name is not evidence
that a path is unused.

## Practice imports

New executable content uses one `patternverse-language` fence. Rust `pattern-core`
owns parsing, validation and transitions. Article YAML frontmatter and the corpus YAML
manifest are unrelated formats and remain supported.

`packages/compiler/src/legacy-practice.ts` owns the old `PracticeDefinition` YAML
import validator, fence helpers, compatibility serializer, and source converter.
Both the Markdown corpus reader and editor import helper call the same validator.
The corpus reader retains structured diagnostics with file/line/field context; the
editor retains its existing string errors. They deliberately use different fence
discovery mechanisms (Markdown AST versus editable-body offsets), not different
validation or execution rules. `practice-fences.ts` shares article slicing only.

The compiler root and `/practice` entry points re-export the old helpers unchanged.
`serializePracticeDefinition` and `upsertPracticeFence` remain for old callers,
fixtures, and removal of old fences; they are deprecated for new authoring. The
read-only `scripts/migrate-legacy-practices.mjs` planner still imports the built
`dist/practice.js` entry. It emits a patch for review, not an automatic data migration.

Opening valid old personal content prepares a converted editor draft. Saving writes
Pattern Language. Malformed and mixed-format content remains intact with diagnostics;
it is not silently repaired. No storage write occurs just from opening a record.
See [interactive practices](practices.md).

## Historical executable sources

`packages/therapy-patterns/legacy/` is a checkpoint compatibility archive, not a
public or new-run catalog. `crates/pattern-host/src/legacy_library.rs` pins exact
retired source text for replay-validated restoration. Other older revisions live
under the archive's readiness/worry-time directories. Do not edit or remove them
to reduce file count: existing private answers depend on their exact definitions.
Retired ACT sources remain unavailable for new runs and discovery.

The active bundled CBT host catalog and public article collection are related but
not identical inventories. The original ten host exercises remain; the public CBT
collection also contains the Double Standard Technique and Semantic Method.
Import tests should not freeze an unrelated collection's size at a historical count.

## Stored names and identities

- `favorites` in IndexedDB and the backup envelope means saved library references.
  `WorkspaceFavorite` and old workspace favorite methods are compatibility aliases,
  not a separate user feature. Preserve them without renaming stored keys.
- `published` and `deprecated` remain schema values. Private labels such as ready
  and archived do not publish content; old records remain readable.
- Source-qualified identities retain the existing `sourceId:entityId` encoding.
  The compiler's `entityRefKey` export aliases the schema helper. Old personal bare-ID
  relationships use the explicit private-first `legacyRelationshipIndex`; public
  qualified references do not.
- The existing database name and upgrade chain remain unchanged. Current upgrades
  add practice runs, recovery backups and situations; do not bypass migrations for
  old profiles.
- Binary workspace backups use CBOR with the existing version-1 envelope. Supported
  older JSON envelopes and absent older optional lists remain readable through the
  same validator. Mira archives and Dropbox protection modes are separate formats.

## Routes and bridge exports

Old pattern `/practice` and standalone practice `/run` routes remain compatible.
Shared source-run operations/types live in `apps/web/src/lib/pattern-runtime`;
older editor/Mira bridge and type imports remain aliases. Do not delete an alias
solely because current internal imports have moved to the neutral boundary.

## Documentation policy

[Architecture](architecture.md), [practices](practices.md),
[practice history](practice-history.md) and [sync](sync/README.md) describe current
boundaries. The local workspace foundation and retired therapy package notes are
explicitly historical. Keep past scope and safety decisions distinguishable from
implemented behavior. Updating docs never enables a flag or publishes a release.

Removal of a compatibility surface needs an inventory of callers/archives, a supported
migration or deliberate deprecation decision, and regression tests. This refactor
does not change language semantics, checkpoints, database or archive versions, URLs,
release flags, or public content.
