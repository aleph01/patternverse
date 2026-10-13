import overrides from './pattern-icon-overrides.json';
import { ICON_GENERATOR_VERSION, generatePatternIcon } from './pattern-icons';
import { generatePatternMark, parseMarkProject, type PatternMarkSpec } from './pattern-marks';
const saved = parseMarkProject(JSON.stringify(overrides)).marks;
/** Defaults use identity only: titles and inferred subject matter never select a family. */
export function defaultPatternMark(patternId: string, title: string): PatternMarkSpec {
  return {
    ...(saved.find((s) => s.patternId === patternId) ?? {
      patternId,
      generatorVersion: ICON_GENERATOR_VERSION,
      variation: 0,
      rotation: 0,
    }),
    title: title.trim().slice(0, 160) || patternId,
  };
}
/** Application IDs follow the content schema, not the more restrictive studio recipe format. */
export function patternIconForPattern(patternId: string, title: string) {
  return saved.some((s) => s.patternId === patternId)
    ? generatePatternMark(defaultPatternMark(patternId, title))
    : generatePatternIcon(patternId);
}
