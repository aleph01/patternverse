export const SIZES = [
  { name: 'S', points: 1 },
  { name: 'M', points: 2 },
  { name: 'L', points: 3 },
  { name: 'XL', points: 5 },
] as const;
export const SPECIES = [
  {
    id: 'clover',
    name: 'Cloud clover',
    price: 2,
    value: 5,
    minutes: 720,
    material: 'fibre',
    habitat: 0,
    color: 0,
    form: 0,
  },
  {
    id: 'birch',
    name: 'Paper birch',
    price: 3,
    value: 7,
    minutes: 1440,
    material: 'wood',
    habitat: 0,
    color: 1,
    form: 1,
  },
  {
    id: 'poppy',
    name: 'Lantern poppy',
    price: 4,
    value: 9,
    minutes: 2160,
    material: 'petals',
    habitat: 1,
    color: 2,
    form: 0,
  },
  {
    id: 'reed',
    name: 'Moon reed',
    price: 3,
    value: 7,
    minutes: 1080,
    material: 'fibre',
    habitat: 1,
    color: 3,
    form: 2,
  },
  {
    id: 'pine',
    name: 'Little pine',
    price: 4,
    value: 9,
    minutes: 4320,
    material: 'wood',
    habitat: 2,
    color: 0,
    form: 1,
  },
  {
    id: 'aster',
    name: 'Dusk aster',
    price: 4,
    value: 9,
    minutes: 2880,
    material: 'petals',
    habitat: 2,
    color: 3,
    form: 0,
  },
] as const;
export const COLORS = ['#68866b', '#b49a54', '#c56651', '#9488a8'];
export const COLOR_NAMES = ['moss', 'gold', 'coral', 'lilac'];
export const FORM_NAMES = ['round', 'tiered', 'slender'];
export type Seed = { species: string; color: number; form: number };
export type Plant = Seed & { id: number; plantedAt: number; boost: number };
export type Priority = { key: string; title: string; sourceId: string; entityId: string };
export type Material = 'fibre' | 'wood' | 'petals';
export const RECIPES = [
  {
    id: 'bench',
    name: 'Quiet bench',
    description: 'A little place to pause.',
    cost: { fibre: 1, wood: 3, petals: 0 },
  },
  {
    id: 'lantern',
    name: 'Paper lantern',
    description: 'A warm light for this shore.',
    cost: { fibre: 2, wood: 1, petals: 2 },
  },
  {
    id: 'gate',
    name: 'Garden gate',
    description: 'An entrance to somewhere yours.',
    cost: { fibre: 2, wood: 4, petals: 0 },
  },
] as const;
export const BRIDGE_MATERIALS = { fibre: 3, wood: 2, petals: 0 };
export const materialCost = (cost: Record<Material, number>) =>
  Object.entries(cost)
    .filter(([, n]) => n)
    .map(([k, n]) => `${n} ${k}`)
    .join(' + ');
export const canCraft = (g: Game, cost: Record<Material, number>) =>
  (Object.keys(cost) as Material[]).every((key) => g.materials[key] >= cost[key]);
export const duration = (minutes: number): string => {
  if (minutes >= 1440)
    return `${Math.floor(minutes / 1440)}d${minutes % 1440 >= 60 ? ` ${Math.floor((minutes % 1440) / 60)}h` : ''}`;
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`
    : `${minutes}m`;
};
export type Garden = { island: number; plants: (Plant | null)[] };
export type Game = {
  version: 1;
  points: number;
  materials: Record<Material, number>;
  structures: { island: number; recipe: string }[];
  coins: number;
  frontier: number;
  current: number;
  serial: number;
  nursery: (Plant | null)[];
  seeds: Seed[];
  gardens: Garden[];
  priorities: Priority[];
  discoveries: string[];
  recognitions: { title: string; points: number; at: number }[];
};
export type Action =
  | { type: 'recognize'; key: string; points: number }
  | { type: 'add-priority'; priority: Priority }
  | { type: 'remove-priority'; key: string }
  | { type: 'reorder'; key: string; direction: -1 | 1 }
  | { type: 'buy'; species: string }
  | { type: 'plant'; plot: number; seed: number }
  | { type: 'boost'; plot: number }
  | { type: 'trade'; plot: number }
  | { type: 'harvest'; plot: number }
  | { type: 'harvest-garden'; slot: number }
  | { type: 'craft'; recipe: string }
  | { type: 'keep'; plot: number; slot: number }
  | { type: 'return'; slot: number; plot: number }
  | { type: 'breed'; first: number; second: number }
  | { type: 'bridge' }
  | { type: 'visit'; island: number };

export const speciesFor = (id: string) => {
  const species = SPECIES.find((s) => s.id === id);
  if (!species) throw new Error('This seed is not in the catalogue.');
  return species;
};
export const seedKey = (s: Seed) => `${s.species}:${s.color}:${s.form}`;
export const seedName = (s: Seed) =>
  `${speciesFor(s.species).name} · ${COLOR_NAMES[s.color]} · ${FORM_NAMES[s.form]}`;
export const emptyPlots = (): (Plant | null)[] => Array.from({ length: 6 }, () => null);
export function newGame(now: number): Game {
  const starter = { species: 'clover', color: 0, form: 0 };
  return {
    version: 1,
    points: 0,
    materials: { fibre: 0, wood: 0, petals: 0 },
    structures: [],
    coins: 12,
    frontier: 0,
    current: 0,
    serial: 1,
    nursery: [{ ...starter, id: 1, plantedAt: now, boost: 0 }, null, null, null, null, null],
    seeds: [starter, { species: 'birch', color: 1, form: 1 }],
    gardens: [],
    priorities: [],
    discoveries: [seedKey(starter)],
    recognitions: [],
  };
}
export function remainingMinutes(plant: Plant, now: number): number {
  return Math.max(
    0,
    Math.ceil(
      (speciesFor(plant.species).minutes * 60_000 * (1 - plant.boost * 0.25) -
        Math.max(0, now - plant.plantedAt)) /
        60_000,
    ),
  );
}
export function stage(plant: Plant, now: number): number {
  if (remainingMinutes(plant, now) === 0) return 2;
  return now - plant.plantedAt >= speciesFor(plant.species).minutes * 30_000 ? 1 : 0;
}
export function islandInfo(index: number) {
  const habitats = [
    { name: 'Moss garden', sky: '#e4e9dc', ground: '#648074', mist: '#c7d3c5' },
    { name: 'Stillwater', sky: '#e0e8e7', ground: '#587978', mist: '#c0d3d2' },
    { name: 'Amber grove', sky: '#eee5d5', ground: '#897e5b', mist: '#ded0b5' },
  ];
  return { ...habitats[index % 3], number: index + 1 };
}
export const bridgeCost = (frontier: number) => 18 + (frontier % 3) * 4;
export const gardenAt = (game: Game) =>
  game.gardens.find((g) => g.island === game.current)?.plants ?? emptyPlots();

/** A single transition owns every resource change; invalid actions leave the save untouched. */
export function act(previous: Game, action: Action, now: number): Game {
  const g = structuredClone(previous);
  const require = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
  };
  const spend = (currency: 'points' | 'coins', count: number) => {
    require(g[currency] >= count, `You need ${count} ${currency} for this.`);
    g[currency] -= count;
  };
  const useMaterials = (cost: Record<Material, number>) => {
    require(canCraft(g, cost), 'Harvest more materials before building this.');
    for (const key of Object.keys(cost) as Material[]) g.materials[key] -= cost[key];
  };
  const plotIndex = (i: number) =>
    require(Number.isInteger(i) && i >= 0 && i < 6, 'Choose a nursery plot.');
  const plantAt = (i: number) => {
    plotIndex(i);
    const p = g.nursery[i];
    if (!p) throw new Error('Choose a planted plot.');
    return p;
  };
  const mature = (i: number) => {
    const p = plantAt(i);
    require(stage(p, now) === 2, 'Let this plant mature first.');
    return p;
  };
  const discover = (p: Seed) => {
    if (!g.discoveries.includes(seedKey(p))) g.discoveries.push(seedKey(p));
  };
  switch (action.type) {
    case 'recognize': {
      const priority = g.priorities.find((p) => p.key === action.key);
      require(priority, 'Choose a focus pattern first.');
      require(SIZES.some((s) => s.points === action.points), 'Choose one of the four sizes.');
      g.points += action.points;
      g.recognitions = [
        { title: priority!.title, points: action.points, at: now },
        ...g.recognitions,
      ].slice(0, 30);
      break;
    }
    case 'add-priority':
      require(action.priority.title.trim() &&
        action.priority.title.length <= 300 &&
        action.priority.key ===
          `${action.priority.sourceId}:${action.priority.entityId}`, 'Choose a valid pattern.');
      if (!g.priorities.some((p) => p.key === action.priority.key))
        g.priorities.push(action.priority);
      break;
    case 'remove-priority':
      g.priorities = g.priorities.filter((p) => p.key !== action.key);
      break;
    case 'reorder': {
      const from = g.priorities.findIndex((p) => p.key === action.key);
      const to = from + action.direction;
      if (from >= 0 && to >= 0 && to < g.priorities.length)
        [g.priorities[from], g.priorities[to]] = [g.priorities[to], g.priorities[from]];
      break;
    }
    case 'buy': {
      const s = speciesFor(action.species);
      require(s.habitat <= g.frontier, 'Explore another island to find this seed.');
      spend('coins', s.price);
      g.seeds.push({ species: s.id, color: s.color, form: s.form });
      break;
    }
    case 'plant': {
      plotIndex(action.plot);
      require(!g.nursery[action.plot], 'This plot already has a plant.');
      require(Number.isInteger(action.seed) &&
        action.seed >= 0 &&
        action.seed < g.seeds.length, 'Choose a seed from your pouch.');
      const [seed] = g.seeds.splice(action.seed, 1);
      g.nursery[action.plot] = { ...seed, id: ++g.serial, plantedAt: now, boost: 0 };
      discover(seed);
      break;
    }
    case 'boost': {
      const p = plantAt(action.plot);
      require(stage(p, now) < 2, 'This plant is already mature.');
      require(p.boost === 0, 'This plant has already been tended for this harvest.');
      spend('points', 1);
      p.boost += 1;
      break;
    }
    case 'harvest': {
      const p = mature(action.plot);
      g.materials[speciesFor(p.species).material] += 2;
      p.plantedAt = now;
      p.boost = 0;
      break;
    }
    case 'harvest-garden': {
      plotIndex(action.slot);
      const p = g.gardens.find((garden) => garden.island === g.current)?.plants[action.slot];
      require(p && stage(p, now) === 2, 'Let this garden plant mature first.');
      g.materials[speciesFor(p!.species).material] += 2;
      p!.plantedAt = now;
      p!.boost = 0;
      break;
    }
    case 'craft': {
      const recipe = RECIPES.find((r) => r.id === action.recipe);
      require(recipe, 'Choose a building recipe.');
      require(!g.structures.some(
        (s) => s.island === g.current && s.recipe === action.recipe,
      ), 'This garden already has one.');
      useMaterials(recipe!.cost);
      g.structures.push({ island: g.current, recipe: action.recipe });
      break;
    }
    case 'trade': {
      const p = mature(action.plot);
      g.coins += speciesFor(p.species).value;
      g.nursery[action.plot] = null;
      break;
    }
    case 'keep': {
      const p = mature(action.plot);
      plotIndex(action.slot);
      let garden = g.gardens.find((x) => x.island === g.current);
      if (!garden) {
        garden = { island: g.current, plants: emptyPlots() };
        g.gardens.push(garden);
      }
      require(!garden.plants[action.slot], 'Choose an empty garden spot.');
      garden.plants[action.slot] = p;
      g.nursery[action.plot] = null;
      break;
    }
    case 'return': {
      plotIndex(action.slot);
      plotIndex(action.plot);
      const garden = g.gardens.find((x) => x.island === g.current);
      require(garden?.plants[action.slot], 'Choose a garden plant.');
      require(!g.nursery[action.plot], 'Choose an empty nursery plot.');
      g.nursery[action.plot] = garden!.plants[action.slot];
      garden!.plants[action.slot] = null;
      break;
    }
    case 'breed': {
      require(action.first !== action.second, 'Choose two different mature plants.');
      const a = mature(action.first);
      const b = mature(action.second);
      spend('coins', 4);
      // Deterministic inheritance with a regular colour mutation; parents stay in their plots.
      const n = ++g.serial;
      const seed = {
        species: n % 2 ? a.species : b.species,
        color: n % 3 ? a.color : (b.color + 1) % 4,
        form: n % 2 ? b.form : a.form,
      };
      g.seeds.push(seed);
      discover(seed);
      break;
    }
    case 'bridge':
      require(g.current === g.frontier, 'Visit your furthest island to build a bridge.');
      useMaterials(BRIDGE_MATERIALS);
      spend('coins', bridgeCost(g.frontier));
      g.frontier += 1;
      g.current = g.frontier;
      break;
    case 'visit':
      require(Number.isSafeInteger(action.island) &&
        action.island >= 0 &&
        action.island <= g.frontier, 'That island is not connected yet.');
      g.current = action.island;
      break;
  }
  return g;
}

/** Reject unsupported or damaged saves instead of silently resetting a person's garden. */
export function parseGame(value: unknown): Game {
  const g = value as Game;
  const integer = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
  const seed = (v: Seed) =>
    v &&
    SPECIES.some((s) => s.id === v.species) &&
    integer(v.color) &&
    v.color < 4 &&
    integer(v.form) &&
    v.form < 3;
  const plant = (p: Plant | null) =>
    p === null ||
    (seed(p) && integer(p.id) && Number.isFinite(p.plantedAt) && integer(p.boost) && p.boost <= 1);
  const plots = (p: (Plant | null)[]) => Array.isArray(p) && p.length === 6 && p.every(plant);
  if (
    !g ||
    g.version !== 1 ||
    ![g.points, g.coins, g.frontier, g.current, g.serial].every(integer) ||
    g.current > g.frontier ||
    !g.materials ||
    !(['fibre', 'wood', 'petals'] as const).every((k) => integer(g.materials[k])) ||
    !Array.isArray(g.structures) ||
    !g.structures.every(
      (s) =>
        s && integer(s.island) && s.island <= g.frontier && RECIPES.some((r) => r.id === s.recipe),
    ) ||
    !plots(g.nursery) ||
    !Array.isArray(g.seeds) ||
    !g.seeds.every(seed) ||
    !Array.isArray(g.gardens) ||
    !g.gardens.every((x) => x && integer(x.island) && x.island <= g.frontier && plots(x.plants)) ||
    !Array.isArray(g.priorities) ||
    !g.priorities.every(
      (p) =>
        p &&
        typeof p.title === 'string' &&
        typeof p.sourceId === 'string' &&
        typeof p.entityId === 'string' &&
        p.key === `${p.sourceId}:${p.entityId}`,
    ) ||
    !Array.isArray(g.discoveries) ||
    !g.discoveries.every(
      (k) =>
        typeof k === 'string' &&
        SPECIES.some((s) => s.id === k.split(':')[0]) &&
        /^[^:]+:[0-3]:[0-2]$/.test(k),
    ) ||
    !Array.isArray(g.recognitions) ||
    !g.recognitions.every(
      (r) =>
        r &&
        typeof r.title === 'string' &&
        SIZES.some((s) => s.points === r.points) &&
        Number.isFinite(r.at),
    )
  ) {
    throw new Error('Your garden could not be read. Its saved data has been left untouched.');
  }
  return g;
}
