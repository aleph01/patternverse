import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CompiledCorpus, CompiledEntity } from '@patternverse/compiler';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';
import type { Inspection, StructureStep } from '$lib/pattern-editor/types';
import type { PatternShare, SharedPractice } from '$lib/sharing/types';

let initialized = false;
const inspected = new Map<string, Inspection['structure']>();
const standaloneSteps = new Set([
  'form',
  'ask',
  'timer',
  'loop',
  'repeat',
  'break',
  'rate',
  'choose',
  'multi',
  'rank',
  'derive',
  'collect',
  'each',
  'yield',
  'image',
  'video',
  'show',
  'branch',
  'match',
  'jump',
  'end',
]);

/** Rust validates eligibility, including all branch arms, before an embed is offered. */
export function embeddablePractice(entity: CompiledEntity): SharedPractice | undefined {
  if (
    entity.sourceId !== 'commons' ||
    entity.status !== 'published' ||
    !['pattern', 'practice'].includes(entity.type) ||
    !entity.languagePracticeSource
  )
    return;
  const source = entity.languagePracticeSource;
  if (!inspected.has(source)) {
    if (!initialized) {
      initSync({
        module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
      });
      initialized = true;
    }
    const result = JSON.parse(
      editor(JSON.stringify({ operation: 'inspect', source })),
    ) as Inspection;
    inspected.set(
      source,
      result.diagnostics.some((item) => item.severity === 'Error') ? null : result.structure,
    );
  }
  const structure = inspected.get(source);
  const needsHost = (steps: readonly StructureStep[]): boolean =>
    steps.some((step) => !standaloneSteps.has(step.kind) || needsHost(step.children));
  if (
    !structure ||
    Object.keys(structure.inputs).length ||
    Object.keys(structure.dependencies).length ||
    needsHost(structure.steps)
  )
    return;
  return {
    id: entity.id,
    type: entity.type as 'pattern' | 'practice',
    title: structure.title ?? entity.title,
    summary: entity.summary ?? '',
    ...(entity.type === 'practice' && entity.duration_minutes
      ? { durationMinutes: entity.duration_minutes }
      : {}),
  };
}

export function patternShare(corpus: CompiledCorpus, entity: CompiledEntity): PatternShare | null {
  if (entity.sourceId !== 'commons' || entity.type !== 'pattern' || entity.status !== 'published')
    return null;
  const practices = [
    entity,
    ...entity.implementedByPractices.flatMap((ref) => {
      const practice = corpus.entities.find(
        (candidate) => candidate.id === ref.entityId && candidate.sourceId === ref.sourceId,
      );
      return practice ? [practice] : [];
    }),
  ].flatMap((practice) => {
    const option = embeddablePractice(practice);
    return option ? [option] : [];
  });
  const verse = corpus.entities.find((candidate) =>
    entity.verseMemberships.some(
      (ref) => ref.entityId === candidate.id && ref.sourceId === candidate.sourceId,
    ),
  );
  // Show authored context when present; never manufacture a use case for another author's pattern.
  const context = entity.body
    .match(
      /^## (?:When to use(?: this(?: pattern)?)?|Useful when|When this (?:helps|is useful))\s*\n+([^#]+?)(?:\n\n|$)/im,
    )?.[1]
    ?.trim();
  return {
    pattern: {
      id: entity.id,
      title: entity.title,
      summary: entity.summary ?? '',
      category: verse?.title ?? 'Pattern',
      ...(context
        ? {
            usefulWhen: context
              .replace(
                /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
                (_match, target: string, label?: string) => label ?? target,
              )
              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
              .replace(/[*_`]/g, ''),
          }
        : {}),
    },
    practices,
  };
}
