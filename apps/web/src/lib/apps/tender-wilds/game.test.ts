import { describe, expect, it } from 'vitest';
import { act, newGame, parseGame, stage, remainingMinutes, bridgeCost, type Game } from './game';
const start = 1_000_000;
const hour = 6 * 3_600_000;
const focus = {
  key: 'commons:learn',
  entityId: 'learn',
  sourceId: 'commons',
  title: 'Learn something',
};
const focused = () => act(newGame(start), { type: 'add-priority', priority: focus }, start);
function matureGarden(): Game {
  let g = newGame(start);
  g = act(g, { type: 'plant', plot: 1, seed: 1 }, start);
  return g;
}

describe('Tender Wilds growth and economy', () => {
  it('grows offline with no decay even after a long absence', () => {
    const p = newGame(start).nursery[0]!;
    expect(stage(p, start)).toBe(0);
    expect(stage(p, start + hour)).toBe(1);
    expect(stage(p, start + 2 * hour)).toBe(2);
    expect(stage(p, start + 365 * 24 * hour)).toBe(2);
    expect(remainingMinutes(p, start - hour)).toBe(720);
  });
  it('allows self-assigned sizes and a single modest boost per harvest', () => {
    let g = act(focused(), { type: 'recognize', key: focus.key, points: 5 }, start);
    g = act(g, { type: 'boost', plot: 0 }, start);
    expect(g.points).toBe(4);
    expect(remainingMinutes(g.nursery[0]!, start)).toBe(540);
    expect(stage(g.nursery[0]!, start)).toBe(0);
    expect(() => act(g, { type: 'boost', plot: 0 }, start)).toThrow('already been tended');
    expect(() => act(g, { type: 'recognize', key: focus.key, points: 100 }, start)).toThrow();
  });
  it('harvests materials once and resets the plant for another timed crop', () => {
    let g = newGame(start);
    expect(() => act(g, { type: 'harvest', plot: 0 }, start)).toThrow('mature');
    g = act(g, { type: 'harvest', plot: 0 }, start + 2 * hour);
    expect(g.materials.fibre).toBe(2);
    expect(stage(g.nursery[0]!, start + 2 * hour)).toBe(0);
    expect(() => act(g, { type: 'harvest', plot: 0 }, start + 2 * hour)).toThrow();
    g = act(g, { type: 'harvest', plot: 0 }, start + 4 * hour);
    expect(g.materials.fibre).toBe(4);
  });
  it('crafts permanent objects per island without allowing duplicate spending', () => {
    const g = newGame(start);
    g.materials = { fibre: 5, wood: 5, petals: 2 };
    const next = act(g, { type: 'craft', recipe: 'bench' }, start);
    expect(next.materials).toEqual({ fibre: 4, wood: 2, petals: 2 });
    expect(next.structures).toEqual([{ island: 0, recipe: 'bench' }]);
    expect(() => act(next, { type: 'craft', recipe: 'bench' }, start)).toThrow('already has');
    expect(g.materials.wood).toBe(5);
  });
  it('consumes both coins and materials for bridges and preserves previous gardens', () => {
    let g = matureGarden();
    g = act(g, { type: 'keep', plot: 0, slot: 3 }, start + 4 * hour);
    g.coins = 100;
    g.materials = { fibre: 6, wood: 4, petals: 0 };
    g = act(g, { type: 'bridge' }, start);
    expect(g.current).toBe(1);
    expect(g.frontier).toBe(1);
    expect(g.coins).toBe(82);
    expect(g.materials.fibre).toBe(3);
    g = act(g, { type: 'visit', island: 0 }, start);
    expect(g.gardens[0].plants[3]?.species).toBe('clover');
    expect(() => act(g, { type: 'bridge' }, start)).toThrow('furthest');
    expect(() => act(g, { type: 'visit', island: 2 }, start)).toThrow();
    expect(bridgeCost(100_000)).toBeLessThanOrEqual(26);
  });
  it('rolls back every resource if a bridge cannot be afforded', () => {
    const g = newGame(start);
    g.materials = { fibre: 3, wood: 2, petals: 0 };
    expect(() => act(g, { type: 'bridge' }, start)).toThrow('coins');
    expect(g.materials.wood).toBe(2);
    expect(g.frontier).toBe(0);
  });
  it('trades a mature plant only once and spends coins only for unlocked seeds', () => {
    let g = newGame(start);
    expect(() => act(g, { type: 'buy', species: 'pine' }, start)).toThrow('Explore');
    g = act(g, { type: 'trade', plot: 0 }, start + 2 * hour);
    expect(g.coins).toBe(17);
    expect(g.nursery[0]).toBeNull();
    expect(() => act(g, { type: 'trade', plot: 0 }, start)).toThrow();
    g = act(g, { type: 'buy', species: 'birch' }, start);
    expect(g.coins).toBe(14);
    expect(g.seeds).toHaveLength(3);
  });
  it('breeds a seed while keeping parents and saves discoveries', () => {
    const g = matureGarden();
    const next = act(g, { type: 'breed', first: 0, second: 1 }, start + 4 * hour);
    expect(next.nursery).toEqual(g.nursery);
    expect(next.seeds).toHaveLength(g.seeds.length + 1);
    expect(next.coins).toBe(g.coins - 4);
    expect(parseGame(next)).toEqual(next);
    expect(() => act(g, { type: 'breed', first: 0, second: 0 }, start + 4 * hour)).toThrow();
  });
  it('can return and rearrange permanent plants without duplicating them', () => {
    let g = act(newGame(start), { type: 'keep', plot: 0, slot: 2 }, start + 2 * hour);
    g = act(g, { type: 'return', slot: 2, plot: 4 }, start + 5 * hour);
    expect(g.gardens[0].plants[2]).toBeNull();
    expect(g.nursery[4]?.id).toBe(1);
    g = act(g, { type: 'keep', plot: 4, slot: 5 }, start + 5 * hour);
    expect(g.gardens[0].plants[5]?.id).toBe(1);
  });
  it('reorders focus and retains earned points after removing a pattern', () => {
    let g = act(focused(), { type: 'recognize', key: focus.key, points: 3 }, start);
    const other = { ...focus, key: 'personal:learn', sourceId: 'personal' };
    g = act(g, { type: 'add-priority', priority: other }, start);
    g = act(g, { type: 'reorder', key: other.key, direction: -1 }, start);
    expect(g.priorities[0].key).toBe(other.key);
    g = act(g, { type: 'remove-priority', key: focus.key }, start);
    expect(g.points).toBe(3);
    expect(g.recognitions).toHaveLength(1);
  });
  it('refuses unsupported or damaged saves rather than resetting them', () => {
    for (const value of [
      null,
      {},
      { ...newGame(start), coins: -1 },
      { ...newGame(start), version: 2 },
      { ...newGame(start), nursery: [] },
    ])
      expect(() => parseGame(value)).toThrow();
  });
});

it('harvests a permanent garden plant and waits for it to regrow', () => {
  const ready = start + 24 * 3_600_000;
  let g = act(newGame(start), { type: 'keep', plot: 0, slot: 2 }, ready);
  g = act(g, { type: 'harvest-garden', slot: 2 }, ready);
  expect(g.materials.fibre).toBe(2);
  expect(stage(g.gardens[0].plants[2]!, ready)).toBe(0);
  expect(() => act(g, { type: 'harvest-garden', slot: 2 }, ready)).toThrow();
  g = act(g, { type: 'harvest-garden', slot: 2 }, ready + 12 * 3_600_000);
  expect(g.materials.fibre).toBe(4);
});
