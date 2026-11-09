import type { CompiledEntity } from '@patternverse/compiler';
import { legacyPracticeSource } from '@patternverse/compiler/practice';
import type { EntityRef } from '@patternverse/schema';
import type { WorksheetDefinition } from '$lib/worksheet/export';
import { THERAPY_LIBRARY } from '$lib/mira/therapy-library';
import { REFRAMING_LIBRARY } from '$lib/pattern-run/reframing-library';
import { sourcePracticeNeedsAi } from '$lib/pattern-run/source-practice';

export type PracticeOption = Readonly<{
  ref: EntityRef;
  title: string;
  summary: string;
  durationMinutes?: number;
  runPath?: `/pattern/${string}/run` | `/practice/${string}/run`;
  articlePath: `/pattern/${string}` | `/practice/${string}`;
  worksheetDefinition?: WorksheetDefinition;
  needsAi: boolean;
  isTherapy: boolean;
}>;

export type PracticeAction = PracticeOption &
  Readonly<{
    tryHref?: string;
    miraHref?: string;
  }>;

/** Embedded, bundled and linked practices are alternative exercises for the same article. */
export function patternPracticeOptions(
  pattern: CompiledEntity,
  related: readonly CompiledEntity[],
): readonly PracticeOption[] {
  if (pattern.type !== 'pattern') return [];
  const catalog = [...THERAPY_LIBRARY, ...REFRAMING_LIBRARY].find(
    (item) => item.slug === pattern.id,
  );
  const isTherapy = pattern.verseMemberships.some((ref) => ref.entityId === 'therapy');
  const source =
    pattern.languagePracticeSource ??
    (pattern.practice ? legacyPracticeSource(pattern.practice) : undefined);
  const embedded: PracticeOption[] =
    source || catalog
      ? [
          {
            ref: pattern.ref,
            title: pattern.practice?.title ?? pattern.title,
            summary: '',
            runPath: `/pattern/${pattern.id}/run`,
            articlePath: `/pattern/${pattern.id}`,
            worksheetDefinition: source
              ? { source }
              : catalog
                ? { techniqueId: catalog.id }
                : undefined,
            needsAi:
              sourcePracticeNeedsAi(pattern) ||
              Boolean(catalog && 'needsAi' in catalog && catalog.needsAi),
            isTherapy,
          },
        ]
      : [];
  const linked = related
    .filter((entity) => entity.type === 'practice')
    .map((practice): PracticeOption => {
      const source =
        practice.languagePracticeSource ??
        (practice.practice ? legacyPracticeSource(practice.practice) : undefined);
      return {
        ref: practice.ref,
        title: practice.title,
        summary: practice.summary ?? '',
        durationMinutes: practice.type === 'practice' ? practice.duration_minutes : undefined,
        runPath: source ? `/practice/${practice.id}/run` : undefined,
        articlePath: `/practice/${practice.id}`,
        worksheetDefinition: source ? { source } : undefined,
        needsAi: sourcePracticeNeedsAi(practice),
        isTherapy: isTherapy || practice.verseMemberships.some((ref) => ref.entityId === 'therapy'),
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
  return [...embedded, ...linked];
}
