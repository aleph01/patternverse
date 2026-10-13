import type { RawEntity } from '@patternverse/schema';
import { legacyRelationshipIndex } from './library.js';

/** Creation policy, not schema support: older concepts/practices remain readable/editable. */
export const PERSONAL_CREATION_TYPES = ['pattern', 'collection', 'verse'] as const;
export type PersonalCreationType = (typeof PERSONAL_CREATION_TYPES)[number];
export const isPersonalCreationType = (type: string | null): type is PersonalCreationType =>
  PERSONAL_CREATION_TYPES.some((candidate) => candidate === type);

export function assertPersonal(entity: { sourceId: string }): void {
  if (entity.sourceId !== 'personal') throw new Error('commons content is read-only.');
}

export type VerseCatalog = readonly { id: string; type: string; sourceId: string }[];

/** Resolve before filtering: a private non-verse also shadows a public verse's bare ID. */
export function validVerseIds(personal: readonly RawEntity[], commons: VerseCatalog): Set<string> {
  return new Set(
    [...legacyRelationshipIndex(personal, commons).values()]
      .filter((entity) => entity.type === 'verse')
      .map((entity) => entity.id),
  );
}

/** Explicit authoring rule; do not impose it on older imports or low-level storage reads. */
export function assertVerseHome(
  entity: RawEntity,
  personal: readonly RawEntity[],
  commons: VerseCatalog,
): void {
  assertPersonal(entity);
  if (entity.type !== 'pattern' && entity.type !== 'collection') return;
  const ids = validVerseIds(personal, commons);
  if (!entity.verses?.length || entity.verses.some((id) => !ids.has(id))) {
    throw new Error(
      'Choose an existing verse for this pattern or collection. A collection is optional; a verse is its home.',
    );
  }
}
