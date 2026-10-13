/** Fixed vocabulary and palette for Patternverse's geometric illustration tool. */
export const COLORS = {
  ink: '#181814',
  white: '#ffffff',
  green: '#05ce78',
  mint: '#dff8ea',
  blue: '#4169e1',
  'blue-soft': '#dfe9ff',
  coral: '#ff6b50',
  yellow: '#f3c84b',
} as const;
export type IllustrationColor = keyof typeof COLORS;
export const SHAPES = ['circle', 'semicircle', 'quarter-circle', 'square', 'line'] as const;
export type ShapeKind = (typeof SHAPES)[number];
export const COMPOSITIONS = [
  { id: 'reframe', label: 'A different perspective' },
  { id: 'steps', label: 'Small steps' },
  { id: 'connection', label: 'Connection' },
  { id: 'balance', label: 'Balance' },
  { id: 'play', label: 'Open composition' },
] as const;
export type Composition = (typeof COMPOSITIONS)[number]['id'];
export const PALETTES = {
  mint: { label: 'Mint & green', background: 'mint', primary: 'green', secondary: 'ink' },
  coral: { label: 'Coral & white', background: 'coral', primary: 'white', secondary: 'ink' },
  blue: { label: 'Blue & yellow', background: 'blue-soft', primary: 'blue', secondary: 'yellow' },
  white: { label: 'White & ink', background: 'white', primary: 'ink', secondary: 'green' },
} as const;
export type Palette = keyof typeof PALETTES;
export const FORMATS = {
  landscape: { label: 'Landscape · 4:3', width: 400, height: 300 },
  square: { label: 'Square · 1:1', width: 400, height: 400 },
  wide: { label: 'Wide · 16:9', width: 480, height: 270 },
} as const;
export type Format = keyof typeof FORMATS;
export type IllustrationShape = Readonly<{
  kind: ShapeKind;
  x: number;
  y: number;
  size: number;
  rotation: 0 | 45 | 90 | 180 | 270;
  color: IllustrationColor;
}>;
export type Illustration = Readonly<{
  width: number;
  height: number;
  background: IllustrationColor;
  shapes: readonly IllustrationShape[];
}>;

/** Stable seeds make a variation reproducible without a service, AI, or saved user data. */
export function generateIllustration(
  composition: Composition,
  palette: Palette,
  format: Format,
  seed: number,
): Illustration {
  const scheme = PALETTES[palette];
  const canvas = FORMATS[format];
  const normalizedSeed = (Number.isFinite(seed) ? Math.trunc(seed) : 1) >>> 0;
  let value = normalizedSeed;
  const random = () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
  const size = 64 + (Math.floor(normalizedSeed / 3) % 3) * 8;
  // Consecutive variation numbers must visibly change even in the simpler compositions.
  const offset = (normalizedSeed % 3) * 8;
  const primary = scheme.primary;
  const secondary = scheme.secondary;
  const shape = (
    kind: ShapeKind,
    x: number,
    y: number,
    size: number,
    color: IllustrationColor,
    rotation: IllustrationShape['rotation'] = 0,
  ): IllustrationShape => ({ kind, x, y, size, color, rotation });
  let shapes: IllustrationShape[];
  switch (composition) {
    case 'reframe':
      shapes = [
        shape('semicircle', 64 + offset, 64, 160, primary, 180),
        shape('line', 112, 40, 216, 'ink'),
        shape('semicircle', 256, 144 - offset, 88, 'white'),
        shape('semicircle', 256, 144 - offset, 88, secondary, 180),
      ];
      break;
    case 'steps':
      shapes = [
        shape('square', 136, 192, size, primary),
        shape('square', 136 + size, 192 - size, size, primary),
        shape('square', 136 + size * 2, 192 - size * 2, size, primary),
        shape('circle', 48, 104 + offset, 64, secondary),
      ];
      break;
    case 'connection':
      shapes = [
        shape('semicircle', 80 - offset, 72, 152, primary),
        shape('semicircle', 144 + offset, 72, 152, secondary, 180),
        shape('circle', 168, 128, 48, palette === 'white' ? 'green' : 'white'),
      ];
      break;
    case 'balance':
      shapes = [
        shape('line', 80, 104, 240, 'ink', 90),
        shape('circle', 72 + offset, 104, 104, primary),
        shape('quarter-circle', 240 - offset, 136, 72, secondary, 180),
      ];
      break;
    default:
      shapes = [
        shape(SHAPES[Math.floor(random() * SHAPES.length)], 56, 104, size + 32, primary),
        shape(SHAPES[Math.floor(random() * SHAPES.length)], 208, 56 + offset, size, secondary, 90),
        shape(SHAPES[Math.floor(random() * SHAPES.length)], 272, 176, 56, 'ink', 180),
      ];
  }
  // Uniformly fit the 400×300 composition to any format, retaining a clear safe margin.
  const scale = Math.min(canvas.width / 400, canvas.height / 300) * 0.92;
  const left = (canvas.width - 400 * scale) / 2;
  const top = (canvas.height - 300 * scale) / 2;
  return {
    ...canvas,
    background: scheme.background,
    shapes: shapes.map((item) => ({
      ...item,
      x: left + item.x * scale,
      y: top + item.y * scale,
      size: item.size * scale,
    })),
  };
}

const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!,
  );

/** Standalone export uses real palette values, not CSS variables or embedded HTML. */
export function illustrationSvg(
  illustration: Illustration,
  title = 'Patternverse illustration',
): string {
  const shapes = illustration.shapes
    .map((shape) => {
      const geometry =
        shape.kind === 'circle'
          ? '<circle cx="32" cy="32" r="32" />'
          : shape.kind === 'semicircle'
            ? '<path d="M32 0 A32 32 0 0 0 32 64 Z" />'
            : shape.kind === 'quarter-circle'
              ? '<path d="M0 0 H64 A64 64 0 0 1 0 64 Z" />'
              : shape.kind === 'square'
                ? '<rect width="64" height="64" />'
                : `<line x1="32" y1="0" x2="32" y2="64" stroke="${COLORS[shape.color]}" stroke-width="2" vector-effect="non-scaling-stroke" />`;
      return `<g transform="translate(${shape.x} ${shape.y}) scale(${shape.size / 64}) rotate(${shape.rotation} 32 32)" fill="${COLORS[shape.color]}">${geometry}</g>`;
    })
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${illustration.width}" height="${illustration.height}" viewBox="0 0 ${illustration.width} ${illustration.height}" role="img"><title>${escapeXml(title.slice(0, 160))}</title><rect width="100%" height="100%" fill="${COLORS[illustration.background]}" />\n${shapes}\n</svg>`;
}
