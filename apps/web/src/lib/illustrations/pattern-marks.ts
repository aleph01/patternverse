/** Safe studio recipes. Geometry lives in pattern-icons; SVG rendering is separate. */
import {
  COMPOSITION_FAMILIES,
  ICON_GENERATOR_VERSION,
  generatePatternIcon,
  iconSimilarity,
  transformIcon,
  type CompositionFamily,
  type IconRotation,
  type PatternIcon,
} from './pattern-icons.js';
import { patternIconSvg } from './pattern-icon-svg.js';

export type PatternMarkSpec = Readonly<{
  patternId: string;
  title: string;
  generatorVersion: typeof ICON_GENERATOR_VERSION;
  familyHint?: CompositionFamily;
  variation: number;
  rotation: IconRotation;
}>;
export type MarkProject = Readonly<{
  kind: 'patternverse-marks';
  version: 2;
  marks: readonly PatternMarkSpec[];
  draft?: PatternMarkSpec;
}>;
export const MAX_SAVED_MARKS = 200;
export const MAX_MARK_PROJECT_BYTES = 262_144;
const validIdentity = (s: Record<string, unknown>) =>
  typeof s.patternId === 'string' &&
  s.patternId.length <= 120 &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.patternId) &&
  typeof s.title === 'string' &&
  s.title.trim().length > 0 &&
  s.title.length <= 160 &&
  typeof s.variation === 'number' &&
  Number.isInteger(s.variation) &&
  s.variation >= 0 &&
  s.variation <= 999999 &&
  typeof s.rotation === 'number' &&
  [0, 90, 180, 270].includes(s.rotation);
export function isPatternMarkSpec(value: unknown): value is PatternMarkSpec {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    validIdentity(s) &&
    s.generatorVersion === ICON_GENERATOR_VERSION &&
    (s.familyHint === undefined || COMPOSITION_FAMILIES.some((f) => f.id === s.familyHint))
  );
}
function clean(s: PatternMarkSpec): PatternMarkSpec {
  return {
    patternId: s.patternId,
    title: s.title,
    generatorVersion: s.generatorVersion,
    variation: s.variation,
    rotation: s.rotation,
    ...(s.familyHint ? { familyHint: s.familyHint } : {}),
  };
}
/** Bounded whitelist, no arbitrary SVG/code. Legacy imports require an explicit opt-in. */
export function parseMarkProject(text: string, allowLegacy = false): MarkProject {
  if (new TextEncoder().encode(text).byteLength > MAX_MARK_PROJECT_BYTES)
    throw new Error('The project is too large.');
  const p = JSON.parse(text) as Record<string, unknown>;
  if (
    !p ||
    p.kind !== 'patternverse-marks' ||
    (p.version !== 1 && p.version !== 2) ||
    !Array.isArray(p.marks) ||
    p.marks.length > MAX_SAVED_MARKS
  )
    throw new Error('This is not a valid Patternverse icon project (version 2).');
  if (p.version === 1) {
    if (!allowLegacy)
      throw new Error(
        'Import this legacy project explicitly to regenerate its icons with the new grammar.',
      );
    const convert = (value: unknown): PatternMarkSpec => {
      if (!value || typeof value !== 'object') throw new Error('Invalid legacy recipe.');
      const s = value as Record<string, unknown>;
      if (
        !validIdentity(s) ||
        ![
          'progression',
          'balance',
          'connection',
          'containment',
          'separation',
          'branching',
        ].includes(String(s.motif)) ||
        !['mixed', 'round', 'angular'].includes(String(s.style)) ||
        typeof s.accent !== 'boolean'
      )
        throw new Error('Invalid legacy recipe.');
      // Preserve identity, variation and orientation, not old shape/style semantics.
      return clean({ ...s, generatorVersion: ICON_GENERATOR_VERSION } as PatternMarkSpec);
    };
    p.marks = p.marks.map(convert);
    if (p.draft !== undefined) p.draft = convert(p.draft);
  }
  const imported = p.marks as unknown[];
  if (!imported.every(isPatternMarkSpec) || (p.draft !== undefined && !isPatternMarkSpec(p.draft)))
    throw new Error('This is not a valid Patternverse icon project (version 2).');
  const marks = imported as PatternMarkSpec[];
  if (new Set(marks.map((m) => m.patternId)).size !== marks.length)
    throw new Error('The project contains duplicate pattern IDs.');
  return {
    kind: 'patternverse-marks',
    version: 2,
    marks: marks.map(clean),
    ...(p.draft ? { draft: clean(p.draft as PatternMarkSpec) } : {}),
  };
}
export function generatePatternMark(spec: PatternMarkSpec): PatternIcon {
  if (!isPatternMarkSpec(spec)) throw new Error('Invalid icon recipe.');
  return transformIcon(
    generatePatternIcon(spec.patternId, {
      version: spec.generatorVersion,
      familyHint: spec.familyHint,
      variation: spec.variation,
    }),
    spec.rotation,
  );
}
export const patternMarkSvg = (spec: PatternMarkSpec, transparent = true): string =>
  patternIconSvg(generatePatternMark(spec), spec.title, transparent);
export function similarSavedMarks(
  draft: PatternMarkSpec,
  saved: readonly PatternMarkSpec[],
): readonly PatternMarkSpec[] {
  const icon = generatePatternMark(draft);
  return saved.filter(
    (s) => s.patternId !== draft.patternId && iconSimilarity(icon, generatePatternMark(s)) >= 0.86,
  );
}
