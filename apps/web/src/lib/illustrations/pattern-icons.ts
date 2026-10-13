/** Versioned, presentation-independent 3×3 icon grammar. No browser or random globals. */
export const ICON_GENERATOR_VERSION = 1 as const;
export const ICON_CANDIDATE_COUNT = 48;
export type IconRotation = 0 | 90 | 180 | 270;
export type IconColor = 'primary' | 'secondary' | 'accent' | 'purple';
export type PatternIconCell =
  | Readonly<{ shape: 'empty' }>
  | Readonly<{ shape: 'square'; color: IconColor }>
  | Readonly<{ shape: 'quarter'; rotation: IconRotation; color: IconColor }>;

// Small hand-composed starting layouts, not unconstrained per-cell randomness.
// 0/1/2/3 = TL/TR/BR/BL quarter; s = square; . = empty; / separates rows.
export const COMPOSITION_FAMILIES = [
  {
    id: 'flow',
    label: 'Flow',
    description: 'A turning path or wave.',
    layouts: ['.3./.13/.10', '23./.13/..0'],
  },
  {
    id: 'converge',
    label: 'Converge',
    description: 'Forms gather toward a shared region.',
    layouts: ['.3./1s3/.1.', '.3./1s3/...'],
  },
  {
    id: 'diverge',
    label: 'Diverge',
    description: 'Forms open outward from a shared region.',
    layouts: ['.2./1s0/.1.', '2s3/.1./...'],
  },
  {
    id: 'enclose',
    label: 'Enclose',
    description: 'An open container protects negative space.',
    layouts: ['2s3/..s/.10', '23./s../10.'],
  },
  {
    id: 'bridge',
    label: 'Bridge',
    description: 'Two curved clusters meet through a passage.',
    layouts: ['23./1s3/..0', '23./1s./.10'],
  },
  {
    id: 'rhythm',
    label: 'Rhythm',
    description: 'Repeated curves with a controlled change.',
    layouts: ['23./1s3/.10', '23./10./23.'],
  },
  {
    id: 'anchor',
    label: 'Anchor',
    description: 'A square punctuates a curved structure.',
    layouts: ['23./1s./...', 's3./10./...'],
  },
  {
    id: 'contrast',
    label: 'Contrast',
    description: 'One element interrupts an orderly core.',
    layouts: ['23./1s./..0', '23./10./..s'],
  },
  {
    id: 'balance',
    label: 'Balance',
    description: 'Approximate equilibrium with a deviation.',
    layouts: ['23./10./..s', '23./1.3/.10'],
  },
  {
    id: 'figure-ground',
    label: 'FigureGround',
    description: 'The opening is part of the symbol.',
    layouts: ['2s3/1../.10', '23./s../10.'],
  },
] as const;
export type CompositionFamily = (typeof COMPOSITION_FAMILIES)[number]['id'];
export type PatternIcon = Readonly<{
  version: typeof ICON_GENERATOR_VERSION;
  family: CompositionFamily;
  /** Nine row-major cells; unoccupied cells have no color or rotation. */
  cells: readonly PatternIconCell[];
}>;
export type IconOptions = Readonly<{
  version?: typeof ICON_GENERATOR_VERSION;
  familyHint?: CompositionFamily;
  variation?: number;
}>;

export function iconSeed(identity: string): number {
  let hash = 2166136261;
  for (const character of identity.normalize('NFC'))
    hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619) >>> 0;
  return hash;
}
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
const rotations = [0, 90, 180, 270] as const;
const empty = (): PatternIconCell => ({ shape: 'empty' });
const quarter = (rotation: IconRotation): PatternIconCell => ({
  shape: 'quarter',
  rotation,
  color: 'primary',
});
const isFamily = (value: unknown): value is CompositionFamily =>
  COMPOSITION_FAMILIES.some((family) => family.id === value);
export function isPatternIcon(value: unknown): value is PatternIcon {
  if (!value || typeof value !== 'object') return false;
  const icon = value as Record<string, unknown>;
  return (
    icon.version === ICON_GENERATOR_VERSION &&
    isFamily(icon.family) &&
    Array.isArray(icon.cells) &&
    icon.cells.length === 9 &&
    icon.cells.every((cell) => {
      if (!cell || typeof cell !== 'object') return false;
      const c = cell as Record<string, unknown>;
      if (c.shape === 'empty') return c.rotation === undefined && c.color === undefined;
      if (
        typeof c.color !== 'string' ||
        !['primary', 'secondary', 'accent', 'purple'].includes(c.color)
      )
        return false;
      return (
        (c.shape === 'square' && c.rotation === undefined) ||
        (c.shape === 'quarter' && rotations.includes(c.rotation as IconRotation))
      );
    })
  );
}

/** Clockwise turns and horizontal reflection transform both position and corner. */
export function transformIcon(
  icon: PatternIcon,
  rotation: IconRotation = 0,
  mirror = false,
): PatternIcon {
  const cells = Array.from({ length: 9 }, empty);
  icon.cells.forEach((cell, index) => {
    let x = index % 3,
      y = Math.floor(index / 3);
    if (mirror) x = 2 - x;
    for (let turn = 0; turn < rotation / 90; turn++) [x, y] = [2 - y, x];
    cells[y * 3 + x] =
      cell.shape === 'quarter'
        ? {
            ...cell,
            rotation: (((mirror ? 90 - cell.rotation : cell.rotation) + rotation + 360) %
              360) as IconRotation,
          }
        : { ...cell };
  });
  return { ...icon, cells };
}
function layoutIcon(layout: string, family: CompositionFamily): PatternIcon {
  return {
    version: ICON_GENERATOR_VERSION,
    family,
    cells: [...layout.replaceAll('/', '')].map((token) =>
      token === '.'
        ? empty()
        : token === 's'
          ? { shape: 'square', color: 'primary' }
          : quarter(rotations[Number(token)]!),
    ),
  };
}
const neighbors = (index: number): number[] =>
  [
    index - 3,
    index + 3,
    ...(index % 3 > 0 ? [index - 1] : []),
    ...(index % 3 < 2 ? [index + 1] : []),
  ].filter((i) => i >= 0 && i < 9);
// Quarters meet the two edges adjacent to their circle center in full. A point
// touching the opposite edge is deliberately NOT counted as visual connectivity.
function fullEdges(cell: PatternIconCell): readonly number[] {
  if (cell.shape === 'empty') return [];
  if (cell.shape === 'square') return [0, 1, 2, 3];
  return cell.rotation === 0
    ? [0, 3]
    : cell.rotation === 90
      ? [0, 1]
      : cell.rotation === 180
        ? [1, 2]
        : [2, 3];
}
function connected(cells: readonly PatternIconCell[], a: number, b: number): boolean {
  const edge = b === a - 3 ? 0 : b === a + 1 ? 1 : b === a + 3 ? 2 : 3;
  return fullEdges(cells[a]!).includes(edge) && fullEdges(cells[b]!).includes((edge + 2) % 4);
}
function groups(indices: readonly number[], linked: (a: number, b: number) => boolean): number[][] {
  const unseen = new Set(indices),
    result: number[][] = [];
  while (unseen.size) {
    const group = [unseen.values().next().value!];
    unseen.delete(group[0]!);
    for (let cursor = 0; cursor < group.length; cursor++)
      for (const next of neighbors(group[cursor]!))
        if (unseen.has(next) && linked(group[cursor]!, next)) {
          unseen.delete(next);
          group.push(next);
        }
    result.push(group);
  }
  return result;
}

export type IconScore = Readonly<{
  total: number;
  coherence: number;
  connectivity: number;
  simplicity: number;
  negativeSpace: number;
  gesture: number;
  colorHierarchy: number;
  asymmetry: number;
}>;
/** Transparent heuristics, each in [0,1]. Connectivity has the strongest weight. */
export function scorePatternIcon(icon: PatternIcon): IconScore {
  const occupied = icon.cells.flatMap((cell, i) => (cell.shape === 'empty' ? [] : [i]));
  const vacant = icon.cells.flatMap((cell, i) => (cell.shape === 'empty' ? [i] : []));
  const visualGroups = groups(occupied, (a, b) => connected(icon.cells, a, b));
  const largest = Math.max(0, ...visualGroups.map((g) => g.length));
  const connectivity = occupied.length ? largest / occupied.length : 0;
  const coherence = occupied.length
    ? visualGroups.filter((g) => g.length > 1).flat().length / occupied.length
    : 0;
  const squares = icon.cells.filter((cell) => cell.shape === 'square').length;
  const simplicity = Math.max(0, 1 - Math.abs(occupied.length - 5) * 0.12 - squares * 0.06);
  const voids = groups(vacant, () => true);
  const negativeSpace = vacant.length
    ? Math.min(
        1,
        (Math.max(...voids.map((g) => g.length)) / vacant.length) * 0.75 +
          (icon.cells[4]!.shape === 'empty' ? 0.25 : 0.1),
      )
    : 0;
  const family = COMPOSITION_FAMILIES.find((f) => f.id === icon.family)!;
  let gesture = 0;
  for (const layout of family.layouts)
    for (const mirror of [false, true])
      for (const rotation of rotations) {
        const template = transformIcon(layoutIcon(layout, icon.family), rotation, mirror);
        let matched = 0,
          count = 0;
        template.cells.forEach((cell, i) => {
          if (cell.shape === 'empty') return;
          count++;
          const other = icon.cells[i]!;
          if (other.shape === cell.shape)
            matched +=
              cell.shape === 'quarter' &&
              other.shape === 'quarter' &&
              cell.rotation !== other.rotation
                ? 0.45
                : 1;
        });
        gesture = Math.max(gesture, matched / count);
      }
  const accents = occupied.filter(
    (i) =>
      icon.cells[i]!.shape !== 'empty' &&
      (icon.cells[i]!.color === 'accent' || icon.cells[i]!.color === 'purple'),
  );
  const grays = occupied.filter(
    (i) => icon.cells[i]!.shape !== 'empty' && icon.cells[i]!.color === 'secondary',
  );
  const accentColors = accents.map((i) => {
    const cell = icon.cells[i]!;
    return cell.shape === 'empty' ? null : cell.color;
  });
  const colorHierarchy =
    accents.length <= 1 ||
    (accents.length === 2 &&
      neighbors(accents[0]!).includes(accents[1]!) &&
      accentColors[0] === accentColors[1] &&
      connected(icon.cells, accents[0]!, accents[1]!))
      ? grays.length <= 2 && occupied.length > accents.length + grays.length
        ? 1
        : 0.4
      : 0;
  const reflection = transformIcon(icon, 0, true);
  const symmetric =
    icon.cells.filter((cell, i) => sameGeometry(cell, reflection.cells[i]!)).length / 9;
  const asymmetry =
    icon.family === 'balance' || icon.family === 'enclose'
      ? symmetric
      : 1 - Math.abs(symmetric - 0.65);
  const total =
    coherence * 1.5 +
    connectivity * 4 +
    simplicity +
    negativeSpace +
    gesture * 2 +
    colorHierarchy +
    asymmetry * 0.5;
  return {
    total,
    coherence,
    connectivity,
    simplicity,
    negativeSpace,
    gesture,
    colorHierarchy,
    asymmetry,
  };
}
function sameGeometry(a: PatternIconCell, b: PatternIconCell): boolean {
  return (
    a.shape === b.shape &&
    (a.shape !== 'quarter' || (b.shape === 'quarter' && a.rotation === b.rotation))
  );
}
function respectsGeometry(icon: PatternIcon): boolean {
  const occupied = icon.cells.filter((cell) => cell.shape !== 'empty').length;
  return (
    occupied >= 3 &&
    occupied <= 7 &&
    icon.cells.filter((cell) => cell.shape === 'square').length <= 2
  );
}

/** Each candidate keeps a family gesture, with bounded additions/deletions/turns. */
export function generateIconCandidates(
  slug: string,
  options: IconOptions = {},
): readonly PatternIcon[] {
  if (typeof slug !== 'string' || !slug.trim())
    throw new Error('Use a stable, nonempty pattern identifier.');
  if (options.version !== undefined && options.version !== ICON_GENERATOR_VERSION)
    throw new Error('Unsupported icon generator version.');
  if (options.familyHint !== undefined && !isFamily(options.familyHint))
    throw new Error('Unknown composition family.');
  if (
    options.variation !== undefined &&
    (!Number.isInteger(options.variation) || options.variation < 0 || options.variation > 999999)
  )
    throw new Error('Use a whole variation from 0 to 999999.');
  const random = seeded(
    iconSeed(
      `${slug.normalize('NFC')}|icon-${ICON_GENERATOR_VERSION}|${options.variation ?? 0}|${options.familyHint ?? 'auto'}`,
    ),
  );
  const pick = <T>(values: readonly T[]): T => values[Math.floor(random() * values.length)]!;
  const family = options.familyHint
    ? COMPOSITION_FAMILIES.find((f) => f.id === options.familyHint)!
    : pick(COMPOSITION_FAMILIES);
  // Color budgets are chosen once, so scoring does not eliminate rare 0/2-accent icons.
  const accentRoll = random(),
    accentCount = accentRoll < 0.08 ? 0 : accentRoll > 0.92 ? 2 : 1;
  const grayRoll = random(),
    grayCount = grayRoll < 0.2 ? 0 : grayRoll < 0.75 ? 1 : 2;
  // A separate deterministic palette decision preserves candidate geometry.
  // Purple is an occasional alternative accent, never an extra colored cell.
  const accentColor: IconColor =
    iconSeed(
      `${slug.normalize('NFC')}|icon-${ICON_GENERATOR_VERSION}|${options.variation ?? 0}|${options.familyHint ?? 'auto'}|palette`,
    ) %
      5 ===
    0
      ? 'purple'
      : 'accent';
  return Array.from({ length: ICON_CANDIDATE_COUNT }, (_, candidate) => {
    let icon = layoutIcon(
      candidate < family.layouts.length ? family.layouts[candidate]! : pick(family.layouts),
      family.id,
    );
    // Include untouched templates as safe fallbacks, then explore controlled deviations.
    if (candidate >= family.layouts.length) {
      const cells = [...icon.cells];
      for (let edit = 0, edits = 1 + Math.floor(random() * 3); edit < edits; edit++) {
        const index = Math.floor(random() * 9),
          previous = cells[index]!;
        cells[index] =
          previous.shape === 'empty'
            ? quarter(pick(rotations))
            : random() < 0.25
              ? empty()
              : random() < 0.12
                ? { shape: 'square', color: 'primary' }
                : quarter(pick(rotations));
        if (!respectsGeometry({ ...icon, cells })) cells[index] = previous;
      }
      icon = { ...icon, cells };
    }
    icon = transformIcon(icon, pick(rotations), random() < 0.5);
    const occupied = icon.cells.flatMap((cell, i) => (cell.shape === 'empty' ? [] : [i]));
    const cells = [...icon.cells],
      accentIndices: number[] = [];
    if (accentCount === 2) {
      const pairs = occupied.flatMap((a) =>
        neighbors(a)
          .filter((b) => b > a && connected(cells, a, b))
          .map((b) => [a, b]),
      );
      if (pairs.length) accentIndices.push(...pick(pairs));
    } else if (accentCount === 1) accentIndices.push(pick(occupied));
    for (const index of accentIndices)
      cells[index] = { ...cells[index], color: accentColor } as PatternIconCell;
    const available = occupied.filter((i) => !accentIndices.includes(i));
    for (let i = 0, count = Math.min(grayCount, available.length - 1); i < count; i++) {
      const index = available.splice(Math.floor(random() * available.length), 1)[0]!;
      cells[index] = { ...cells[index], color: 'secondary' } as PatternIconCell;
    }
    return { ...icon, cells };
  });
}
const cache = new Map<string, PatternIcon>();
export function generatePatternIcon(slug: string, options: IconOptions = {}): PatternIcon {
  const key = JSON.stringify([slug, options.version, options.familyHint, options.variation]);
  const cached = cache.get(key);
  if (cached) return cached;
  const candidates = generateIconCandidates(slug, options);
  const scored = candidates.map((icon) => ({ icon, score: scorePatternIcon(icon) }));
  const eligible = scored.filter(
    ({ score }) => score.connectivity >= 0.6 && score.colorHierarchy === 1,
  );
  const best = (eligible.length ? eligible : scored).reduce((best, next) =>
    next.score.total > best.score.total ? next : best,
  ).icon;
  const result = Object.freeze({
    ...best,
    cells: Object.freeze(best.cells.map((cell) => Object.freeze(cell))),
  });
  // Bounded memoization only; no catalogue order or previous icon affects generation.
  if (cache.size >= 512) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}

/** Highest similarity over all eight rotations/reflections; 1 = same visual icon. */
export function iconSimilarity(a: PatternIcon, b: PatternIcon): number {
  let best = 0;
  for (const mirror of [false, true])
    for (const rotation of rotations) {
      const transformed = transformIcon(b, rotation, mirror);
      let geometry = 0,
        overlap = 0,
        color = 0,
        union = 0;
      a.cells.forEach((cell, index) => {
        const other = transformed.cells[index]!;
        if (cell.shape === 'empty' && other.shape === 'empty') return;
        union++;
        if (cell.shape === 'empty' || other.shape === 'empty') return;
        overlap++;
        geometry += sameGeometry(cell, other) ? 1 : cell.shape === other.shape ? 0.25 : 0.15;
        if (cell.color === other.color) color++;
      });
      best = Math.max(best, union ? (geometry * 0.65 + overlap * 0.25 + color * 0.1) / union : 1);
    }
  return Math.min(1, best);
}
