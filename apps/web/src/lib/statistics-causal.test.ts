import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const data = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../../docs/pattern-packages/statistics-causal-examples.json'),
    'utf8',
  ),
);
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const rmse = (observed: number[], predicted: number[]) =>
  Math.sqrt(mean(observed.map((v, i) => (v - predicted[i]) ** 2)));
type SyntheticCase = {
  pre_periods: number;
  treated: number[];
  donors: Record<string, number[]>;
};
function fitDonorWeight(example: SyntheticCase) {
  const [a, b] = Object.values(example.donors);
  const indices = Array.from({ length: example.pre_periods }, (_, i) => i);
  const w =
    sum(indices.map((i) => (a[i] - b[i]) * (example.treated[i] - b[i]))) /
    sum(indices.map((i) => (a[i] - b[i]) ** 2));
  return Math.max(0, Math.min(1, w));
}

describe('Statistics causal-design worked calculations', () => {
  it('accounts for every event while distinguishing future groups from the landmark population', () => {
    const t = data.timing;
    const eligible = t.badge_n + t.no_badge_survivors;
    expect(t.early_cancellations + eligible).toBe(t.start_n);
    expect(eligible).toBe(60);
    expect(t.landmark_month).toBe(6);
    expect(t.end_month).toBe(12);
    const badgeRisk = t.badge_late_cancellations / t.badge_n;
    const neverBadgeN = t.early_cancellations + t.no_badge_survivors;
    const neverBadgeEvents = t.early_cancellations + t.no_badge_late_cancellations;
    expect([t.badge_n, neverBadgeN]).toEqual([20, 80]);
    expect([t.badge_late_cancellations, neverBadgeEvents]).toEqual([4, 48]);
    expect(badgeRisk - neverBadgeEvents / neverBadgeN).toBeCloseTo(-0.4, 12);
    expect(badgeRisk - t.no_badge_late_cancellations / t.no_badge_survivors).toBe(0);
    // Changing the origin changes who is eligible; early cancellations are not lost events.
    expect(t.badge_late_cancellations + neverBadgeEvents).toBe(52);
    expect(t.badge_late_cancellations + t.no_badge_late_cancellations).toBe(12);
    expect(52 - 12).toBe(t.early_cancellations);
  });

  it('identifies the supported population before calculating a narrower observed contrast', () => {
    const o = data.overlap;
    const supported = o.treated_n.flatMap((n: number, i: number) =>
      n > 0 && o.control_n[i] > 0 ? [i] : [],
    );
    expect(supported).toEqual([o.supported_tier]);
    expect(o.tiers[o.supported_tier]).toBe('Medium');
    const treated = sum(o.treated_retained) / sum(o.treated_n);
    const control = sum(o.control_retained) / sum(o.control_n);
    expect([treated, control]).toEqual([0.85, 0.4]);
    expect(treated - control).toBeCloseTo(0.45, 12);
    const i = o.supported_tier;
    const eligible = o.treated_n[i] + o.control_n[i];
    expect(eligible).toBe(40);
    expect(eligible / (sum(o.treated_n) + sum(o.control_n))).toBe(0.4);
    expect(o.treated_n[i] / sum(o.treated_n)).toBe(0.5);
    expect(o.control_n[i] / sum(o.control_n)).toBeCloseTo(1 / 3, 12);
    expect(
      o.treated_retained[i] / o.treated_n[i] - o.control_retained[i] / o.control_n[i],
    ).toBeCloseTo(0.2, 12);
    expect(o.treated_n.map((n: number, j: number) => n / (n + o.control_n[j]))).toEqual([
      0, 0.5, 1,
    ]);
  });

  it('recovers the cutoff limits rather than the nearest-point or whole-group contrast', () => {
    const t = data.threshold;
    const sides = [false, true].map((above) => {
      const indices = t.scores.flatMap((x: number, i: number) =>
        x >= t.cutoff === above && Math.abs(x - t.cutoff) <= t.display_bandwidth ? [i] : [],
      );
      const x = indices.map((i: number) => t.scores[i] - t.cutoff);
      const y = indices.map((i: number) => t.outcomes[i]);
      const slope =
        sum(x.map((v: number, i: number) => (v - mean(x)) * (y[i] - mean(y)))) /
        sum(x.map((v: number) => (v - mean(x)) ** 2));
      return { intercept: mean(y) - slope * mean(x), slope, indices };
    });
    expect(sides.map((side) => side.slope)).toEqual([2, 2]);
    expect(sides.map((side) => side.intercept)).toEqual([60, 66]);
    expect(sides[1].intercept - sides[0].intercept).toBe(6);
    expect(sides[0].indices).toEqual([1, 2, 3]);
    expect(sides[1].indices).toEqual([4, 5, 6, 7]);
    expect(t.outcomes[4] - t.outcomes[3]).toBe(8);
    expect(mean(t.outcomes.slice(4)) - mean(t.outcomes.slice(0, 4))).toBe(14);
  });

  it('fits convex donor weights using only pre-policy outcomes, then freezes them', () => {
    const s = data.synthetic;
    const weight = fitDonorWeight(s);
    expect(weight).toBeCloseTo(0.6, 12);
    expect(s.weights).toEqual([0.6, 0.4]);
    expect(sum(s.weights)).toBe(1);
    expect(s.weights.every((w: number) => w >= 0)).toBe(true);
    const [a, b] = Object.values(s.donors) as number[][];
    const synthetic = a.map((v, i) => weight * v + (1 - weight) * b[i]);
    expect(synthetic).toEqual([100, 104, 106, 110, 112, 114]);
    expect(rmse(s.treated.slice(0, s.pre_periods), synthetic.slice(0, s.pre_periods))).toBe(0);
    const gaps = s.treated.map((v: number, i: number) => v - synthetic[i]);
    expect(gaps).toEqual([0, 0, 0, 0, 8, 10]);
    expect(mean(gaps.slice(s.pre_periods))).toBe(9);
    const changed = structuredClone(s);
    changed.treated[4] = 1000;
    changed.treated[5] = -1000;
    changed.donors.A[4] = 700;
    changed.donors.B[5] = -700;
    expect(fitDonorWeight(changed)).toBe(weight);
  });

  it('reports poor earlier fit alongside leave-one-donor-out gaps', () => {
    const s = data.synthetic;
    const checks = Object.values(s.donors as Record<string, number[]>).map((donor) => ({
      preRMSE: rmse(s.treated.slice(0, s.pre_periods), donor.slice(0, s.pre_periods)),
      postGaps: s.treated
        .slice(s.pre_periods)
        .map((v: number, i: number) => v - donor[s.pre_periods + i]),
    }));
    expect(checks).toEqual([
      { preRMSE: 10, postGaps: [18, 20] },
      { preRMSE: 15, postGaps: [-7, -5] },
    ]);
    expect(checks.map((c) => mean(c.postGaps))).toEqual([19, -6]);
  });
});
