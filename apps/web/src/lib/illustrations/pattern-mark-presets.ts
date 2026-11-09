import overrides from './pattern-icon-overrides.json';
import { ICON_GENERATOR_VERSION } from './pattern-icons';
import { parseMarkProject, type PatternMarkSpec } from './pattern-marks';
import { patternGraphicForPattern, type PatternGraphic } from './pattern-graphics';
const saved = parseMarkProject(JSON.stringify(overrides)).marks;
/** Archived grid-tool recipes; public graphics are authored in pattern-graphics.json. */
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
/** The optional title is retained for existing callers; renaming cannot change the artwork. */
export const patternIconForPattern: (patternId: string, title?: string) => PatternGraphic =
  patternGraphicForPattern;
