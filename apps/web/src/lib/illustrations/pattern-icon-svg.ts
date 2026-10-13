import {
  isPatternIcon,
  type IconRotation,
  type PatternIcon,
  type PatternIconCell,
} from './pattern-icons.js';

export const ICON_CELL_SIZE = 24;
export const ICON_VIEWBOX_SIZE = ICON_CELL_SIZE * 3;
/** Exact quarter disk centered at TL with radius equal to one complete cell. */
export const QUARTER_CIRCLE_PATH = 'M0 0 H24 A24 24 0 0 1 0 24 Z';
export function quarterTransform(rotation: IconRotation): string {
  return `rotate(${rotation} 12 12)`;
}
export const ICON_COLOR_VARIABLES = {
  primary: 'var(--pattern-icon-primary, #181814)',
  secondary: 'var(--pattern-icon-secondary, #898983)',
  accent: 'var(--pattern-icon-accent, #05ce78)',
  purple: 'var(--pattern-icon-purple, #7259b8)',
} as const;
const EXPORT_COLORS = {
  primary: '#181814',
  secondary: '#898983',
  accent: '#05ce78',
  purple: '#7259b8',
} as const;
const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );

/** Exact, absolute cell contours. Combining like-colored contours in one fill
 * removes antialias hairlines along internal edges; no geometry is enlarged. */
export function iconCellPath(cell: PatternIconCell, index: number): string {
  if (cell.shape === 'empty') return '';
  const x = (index % 3) * ICON_CELL_SIZE,
    y = Math.floor(index / 3) * ICON_CELL_SIZE;
  if (cell.shape === 'square') return `M${x} ${y}h24v24h-24Z`;
  const corners = [
    [x, y],
    [x + 24, y],
    [x + 24, y + 24],
    [x, y + 24],
  ] as const;
  const [cx, cy] = corners[cell.rotation / 90]!;
  const radialEnds = [
    [x + 24, y],
    [x + 24, y + 24],
    [x, y + 24],
    [x, y],
  ] as const;
  const [ax, ay] = radialEnds[cell.rotation / 90]!;
  const arcEnds = [
    [x, y + 24],
    [x, y],
    [x + 24, y],
    [x + 24, y + 24],
  ] as const;
  const [bx, by] = arcEnds[cell.rotation / 90]!;
  return `M${cx} ${cy}L${ax} ${ay}A24 24 0 0 1 ${bx} ${by}Z`;
}
export function coloredIconPaths(icon: PatternIcon) {
  return (['primary', 'secondary', 'accent', 'purple'] as const)
    .map((color) => ({
      color,
      d: icon.cells
        .map((cell, index) =>
          cell.shape !== 'empty' && cell.color === color ? iconCellPath(cell, index) : '',
        )
        .join(''),
    }))
    .filter((path) => path.d);
}
/** Standalone export bakes the token fallbacks for editors without CSS-variable support. */
export function patternIconSvg(
  icon: PatternIcon,
  title = 'Pattern icon',
  transparent = true,
): string {
  if (!isPatternIcon(icon)) throw new Error('Invalid pattern icon.');
  const geometry = coloredIconPaths(icon)
    .map((path) => `<path d="${path.d}" fill="${EXPORT_COLORS[path.color]}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" role="img" aria-label="${escapeXml(title.slice(0, 160))}"><title>${escapeXml(title.slice(0, 160))}</title>${transparent ? '' : '<rect width="72" height="72" fill="#fff"/>'}${geometry}</svg>`;
}
