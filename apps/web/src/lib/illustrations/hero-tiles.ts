import type { IconRotation } from './pattern-icons';
import { iconCellPath, ICON_CELL_SIZE } from './pattern-icon-svg';

export const HERO_TILE_SIZE = 40;
export type HeroTone = 'mist' | 'stone' | 'green' | 'purple';
export type HeroTile = Readonly<{
  x: number;
  y: number;
  transform: string;
  path: string;
  tone: HeroTone;
}>;
export type HeroBird = Readonly<{
  transform: string;
  tone: HeroTone;
}>;

// Intersecting circular arcs make a wing; mirroring it makes a pair.
// The flock follows the same circle-based grammar as the tiled field.
export const HERO_WING_PATH = 'M0 0A24 24 0 0 1 24 24A24 24 0 0 1 0 0Z';

// Authored rhythms: dots are white space, o a circle, s a square,
// and 0–3 the native quarter disk's rotations. No lettering or randomness.
const landscapeRows = [
  '...............2........',
  '..0.....3...............',
  '............o...........',
  '.....2.........3........',
  '...........2............',
  '.........o.1.3..........',
  '......3...20..2.........',
  '.........s.10.3..o......',
  '........2.30.2.1........',
  '......o..2o30.2..3......',
  '.........1032o.1.2.3....',
  '.......2.301o.23.10.....',
  '........o.103230.o.2...',
  '......3.2o301.230.10.2..',
  '........10.23o1023.30o..',
  '......2.301230o.1023.10.',
] as const;
const portraitRows = [
  '............',
  '........3...',
  '............',
  '.......2....',
  '............',
  '..........3.',
  '............',
  '........2...',
  '............',
  '...........1',
  '.........3..',
  '............',
  '.......2....',
  '..........0.',
  '........3...',
  '......2o.1..',
  '.....230.2..',
  '......10o.3.',
  '....o230.2.1',
  '.....10.23o.',
  '...2.301o.23',
  '....10.23010',
] as const;

type BirdSpec = readonly [x: number, y: number, scale: number, angle: number, tone: HeroTone];
const landscapeBirds: readonly BirdSpec[] = [
  [850, 18, 0.95, -12, 'purple'],
  [720, 55, 0.8, -18, 'green'],
  [595, 102, 0.9, 10, 'stone'],
  [800, 138, 1, 14, 'stone'],
  [895, 212, 0.6, -10, 'stone'],
  [675, 226, 0.7, -24, 'purple'],
  [555, 248, 0.65, -15, 'stone'],
  [770, 310, 0.75, 8, 'green'],
  [905, 365, 0.65, -18, 'stone'],
  [645, 362, 0.6, 18, 'stone'],
];
const portraitBirds: readonly BirdSpec[] = [
  [395, 30, 0.9, -15, 'green'],
  [365, 120, 0.85, 10, 'purple'],
  [410, 240, 0.65, -20, 'stone'],
  [365, 360, 0.8, -12, 'stone'],
  [405, 475, 0.75, 12, 'green'],
  [345, 585, 0.6, -18, 'stone'],
];

function compose(
  columns: number,
  rows: readonly string[],
  accents: Readonly<Record<string, HeroTone>>,
  birds: readonly BirdSpec[],
) {
  const tiles: HeroTile[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((value, x) => {
      if (value === '.') return;
      const path =
        value === 'o'
          ? 'M0 12A12 12 0 1 0 24 12A12 12 0 1 0 0 12Z'
          : iconCellPath(
              {
                shape: value === 's' ? 'square' : 'quarter',
                rotation: (Number(value) * 90 || 0) as IconRotation,
                color: 'secondary',
              },
              0,
            );
      tiles.push({
        x: x * HERO_TILE_SIZE,
        y: y * HERO_TILE_SIZE,
        transform: `translate(${x * HERO_TILE_SIZE} ${y * HERO_TILE_SIZE}) scale(${HERO_TILE_SIZE / ICON_CELL_SIZE})`,
        path,
        tone:
          accents[`${x}:${y}`] ?? (x < columns * 0.55 || y < rows.length * 0.4 ? 'mist' : 'stone'),
      });
    });
  });
  return {
    width: columns * HERO_TILE_SIZE,
    height: rows.length * HERO_TILE_SIZE,
    tiles,
    birds: birds.map(([x, y, scale, angle, tone]) => ({
      transform: `translate(${x} ${y}) rotate(${angle} 24 24) scale(${scale})`,
      tone,
    })),
  };
}

export const heroLandscape = compose(
  24,
  landscapeRows,
  {
    '11:5': 'green',
    '15:10': 'purple',
    '12:13': 'green',
    '20:14': 'purple',
  },
  landscapeBirds,
);
export const heroPortrait = compose(
  12,
  portraitRows,
  {
    '6:16': 'green',
    '9:19': 'purple',
  },
  portraitBirds,
);
