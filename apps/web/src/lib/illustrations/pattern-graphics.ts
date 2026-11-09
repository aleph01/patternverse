import registry from './pattern-graphics.json' with { type: 'json' };
import type { IconColor } from './pattern-icons';

export type GraphicPath = Readonly<{
  d: string;
  fill: IconColor | 'none';
  stroke?: IconColor;
  strokeWidth?: number;
  linecap?: 'round' | 'butt' | 'square';
  linejoin?: 'round' | 'miter' | 'bevel';
}>;

export type PatternGraphic = Readonly<{
  version: 2;
  id: string;
  title: string;
  mechanism: string;
  motif: string;
  reading: string;
  paths: readonly GraphicPath[];
}>;

/** Saved authoring decisions, never inferred from a slug, title, or catalog order at runtime. */
export const PATTERN_GRAPHICS: readonly PatternGraphic[] = Object.freeze(
  registry.graphics.map((spec) =>
    Object.freeze({
      ...spec,
      version: 2 as const,
      paths: Object.freeze(spec.paths.map((path) => Object.freeze(path as GraphicPath))),
    }),
  ),
);
const byId = new Map(PATTERN_GRAPHICS.map((graphic) => [graphic.id, graphic]));

/** An unassigned/private pattern gets a shared neutral mark, not invented semantic artwork. */
export const UNASSIGNED_GRAPHIC: PatternGraphic = Object.freeze({
  version: 2,
  id: 'unassigned',
  title: 'Pattern',
  mechanism: 'A pattern without an authored graphic.',
  motif: 'unassigned',
  reading: 'An open frame awaiting a concept-specific graphic.',
  paths: Object.freeze([
    Object.freeze({
      d: 'M31 16H16V80H80V65',
      fill: 'none',
      stroke: 'secondary',
      strokeWidth: 6,
      linecap: 'round',
      linejoin: 'round',
    } as const),
    Object.freeze({ d: 'M38 38H58V58H38Z', fill: 'primary' } as const),
  ]),
});

export function findPatternGraphic(id: string): PatternGraphic | undefined {
  return byId.get(id.normalize('NFC'));
}

export function patternGraphicForPattern(id: string): PatternGraphic {
  return findPatternGraphic(id) ?? UNASSIGNED_GRAPHIC;
}

const colors = new Set(['primary', 'secondary', 'accent', 'purple']);
/** The authoring format has only paths and presentation attributes, no markup or transforms. */
export function isPatternGraphic(value: unknown): value is PatternGraphic {
  if (!value || typeof value !== 'object') return false;
  const g = value as PatternGraphic;
  return (
    g.version === 2 &&
    [g.id, g.title, g.mechanism, g.motif, g.reading].every(
      (s) => typeof s === 'string' && s.trim().length > 0,
    ) &&
    Array.isArray(g.paths) &&
    g.paths.length > 0 &&
    g.paths.length <= 32 &&
    g.paths.every(
      (p) =>
        p &&
        typeof p.d === 'string' &&
        p.d.length > 0 &&
        p.d.length <= 2000 &&
        /^[MmZzLlHhVvCcSsQqTtAaEe0-9,.\s+-]+$/.test(p.d) &&
        (p.fill === 'none' || colors.has(p.fill)) &&
        (p.stroke === undefined || colors.has(p.stroke)) &&
        (p.strokeWidth === undefined ||
          (Number.isFinite(p.strokeWidth) && p.strokeWidth >= 1 && p.strokeWidth <= 8)) &&
        (p.linecap === undefined || ['round', 'butt', 'square'].includes(p.linecap)) &&
        (p.linejoin === undefined || ['round', 'miter', 'bevel'].includes(p.linejoin)) &&
        Object.keys(p).every((key) =>
          ['d', 'fill', 'stroke', 'strokeWidth', 'linecap', 'linejoin'].includes(key),
        ),
    )
  );
}

const exportColors = {
  primary: '#181814',
  secondary: '#898983',
  accent: '#05ce78',
  purple: '#7259b8',
  none: 'none',
} as const;
const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );

export function patternGraphicSvg(graphic: PatternGraphic, title = graphic.title): string {
  if (!isPatternGraphic(graphic)) throw new Error('Invalid concept graphic.');
  const paths = graphic.paths
    .map(
      (p) =>
        `<path d="${p.d}" fill="${exportColors[p.fill]}"${p.stroke ? ` stroke="${exportColors[p.stroke]}"` : ''}${p.strokeWidth ? ` stroke-width="${p.strokeWidth}"` : ''}${p.linecap ? ` stroke-linecap="${p.linecap}"` : ''}${p.linejoin ? ` stroke-linejoin="${p.linejoin}"` : ''}/>`,
    )
    .join('');
  const label = escapeXml(title.slice(0, 160));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${label}"><title>${label}</title><desc>${escapeXml(graphic.reading)}</desc>${paths}</svg>`;
}
