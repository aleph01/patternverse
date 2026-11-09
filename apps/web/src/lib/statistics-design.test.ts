import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const data = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../../docs/pattern-packages/statistics-design-examples.json'),
    'utf8',
  ),
);
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const populationVariance = (values: number[]) => mean(values.map((v) => (v - mean(values)) ** 2));
const sampleVariance = (values: number[]) =>
  (populationVariance(values) * values.length) / (values.length - 1);

describe('Statistics design and diagnostic worked calculations', () => {
  it('distinguishes score changes under different assessment blueprints', () => {
    const v = data.validity;
    const weighted = (scores: number[], recallWeight: number) =>
      recallWeight * scores[0] + (1 - recallWeight) * scores[1];
    const weight = v.recall_items / (v.recall_items + v.application_items);
    expect([weighted(v.before, weight), weighted(v.after, weight)]).toEqual([58, 83]);
    expect([weighted(v.before, 0.5), weighted(v.after, 0.5)]).toEqual([55, 72.5]);
    expect(v.after[1] - v.before[1]).toBe(5);
    expect(weighted(v.after, weight) - weighted(v.before, weight)).toBe(25);
  });

  it('enumerates whole-worker replicates and preserves repeated worker copies', () => {
    const r = data.resampling;
    const units = r.units as Record<string, number[]>;
    const workerMeans = Object.values(units).map(mean);
    const bootstrap = workerMeans.flatMap((a) =>
      workerMeans.flatMap((b) => workerMeans.map((c) => (a + b + c) / 3)),
    );
    expect(bootstrap).toHaveLength(27);
    expect(mean(bootstrap)).toBeCloseTo(21, 12);
    expect(Math.min(...bootstrap)).toBe(11);
    expect(Math.max(...bootstrap)).toBe(31);
    expect(Math.sqrt(populationVariance(bootstrap))).toBeCloseTo(4.7140452079, 9);
    const copiedRows = (r.replicate as string[]).flatMap((id) => units[id]);
    expect(copiedRows).toEqual([10, 12, 10, 12, 30, 32]);
    expect(mean(copiedRows)).toBeCloseTo(17.6666666667, 9);
    const rows = Object.values(units).flat();
    // Independent empirical draws have Var(mean) = Var(draw) / number drawn.
    expect(Math.sqrt(populationVariance(rows) / rows.length)).toBeCloseTo(3.3582402799, 9);
  });

  it('uses subgroup-mean variation and distinguishes pointwise from repeated false alarms', () => {
    const m = data.monitoring;
    const se = m.individual_sigma / Math.sqrt(m.subgroup_n);
    const limits = [m.baseline_mean - 3 * se, m.baseline_mean + 3 * se];
    expect(se).toBe(2);
    expect(limits).toEqual([94, 106]);
    expect(
      m.means.flatMap((value: number, i: number) =>
        value < limits[0] || value > limits[1] ? [i + 1] : [],
      ),
    ).toEqual([11, 12]);
    expect(1 - (1 - m.single_false_alarm_probability) ** 20).toBeCloseTo(0.0526332088, 9);
  });

  it('keeps randomized-cluster counts distinct from variance-equivalent person counts', () => {
    const a = data.assignment;
    const total = a.clusters * a.members;
    const designEffect = (members: number, icc = a.icc) => 1 + (members - 1) * icc;
    expect(total).toBe(500);
    expect(designEffect(a.members)).toBe(2.92);
    expect(Math.sqrt(designEffect(a.members))).toBeCloseTo(1.708800749, 8);
    expect(total / designEffect(a.members)).toBeCloseTo(171.2328767, 6);
    expect(
      a.alternatives.map(([clusters, members]: number[]) => {
        expect(clusters * members).toBe(total);
        return Math.round(total / designEffect(members));
      }),
    ).toEqual([102, 260]);
    expect(designEffect(a.members, 0)).toBe(1);
    expect(designEffect(a.members, 1)).toBe(a.members);
    expect(a.clusters).toBe(20);
  });

  it('finds the missing-outcome tipping point and respects bounded-outcome extremes', () => {
    const m = data.missingness;
    const absent = m.enrolled - m.observed;
    const fullMean = (missingMean: number) =>
      (m.observed * m.observed_mean + absent * missingMean) / m.enrolled;
    expect(m.missing_means.map(fullMean)).toEqual([80, 74, 70, 64]);
    const tipping = (m.enrolled * m.benchmark - m.observed * m.observed_mean) / absent;
    expect(tipping).toBe(55);
    expect(fullMean(54.9)).toBeLessThan(m.benchmark);
    expect(fullMean(55.1)).toBeGreaterThan(m.benchmark);
    expect([fullMean(0), fullMean(100)]).toEqual([48, 88]);
  });

  it('shows why uncorrelated features can produce a dominant scale-dependent component', () => {
    const s = data.structure;
    const covariance = (x: number[], y: number[]) =>
      x.reduce((sum, value, i) => sum + (value - mean(x)) * (y[i] - mean(y)), 0) / (x.length - 1);
    const vx = sampleVariance(s.x),
      vy = sampleVariance(s.y);
    expect(covariance(s.x, s.y)).toBe(0);
    expect(vx / vy).toBeCloseTo(10000, 9);
    expect(vx / (vx + vy)).toBeCloseTo(0.99990001, 8);
    const zx = s.x.map((v: number) => (v - mean(s.x)) / Math.sqrt(vx));
    const zy = s.y.map((v: number) => (v - mean(s.y)) / Math.sqrt(vy));
    expect(sampleVariance(zx)).toBeCloseTo(1, 12);
    expect(sampleVariance(zy)).toBeCloseTo(1, 12);
    expect(covariance(zx, zy)).toBe(0);
    // Identity covariance: equal eigenvalues and no distinguished first direction.
    expect(sampleVariance(zx) / (sampleVariance(zx) + sampleVariance(zy))).toBeCloseTo(0.5, 12);
  });

  it('compares seeded coverage counts against independent analytic references', () => {
    const s = data.simulation;
    const se = s.sigma / Math.sqrt(s.n);
    expect(se).toBe(1);
    expect(s.mean_estimate - s.true_mean).toBeCloseTo(0.0145133455, 9);
    expect(s.results['Correct SE'].covered).toBe(1892);
    expect(s.results['Half SE'].covered).toBe(1347);
    for (const [name, target] of [
      ['Correct SE', 0.95],
      ['Half SE', 0.672904992],
    ] as const) {
      const r = s.results[name];
      expect(r.coverage).toBe(r.covered / s.replications);
      const mcse = Math.sqrt((r.coverage * (1 - r.coverage)) / s.replications);
      expect(r.mcse).toBeCloseTo(mcse, 12);
      expect(Math.abs(r.coverage - target)).toBeLessThan(3 * mcse);
    }
    const good = s.results['Correct SE'],
      bad = s.results['Half SE'];
    expect(good.coverage - s.z95 * good.mcse).toBeCloseTo(0.9360945, 6);
    expect(good.coverage + s.z95 * good.mcse).toBeCloseTo(0.9559055, 6);
    expect(bad.coverage - s.z95 * bad.mcse).toBeCloseTo(0.6529485, 6);
    expect(bad.coverage + s.z95 * bad.mcse).toBeCloseTo(0.6940515, 6);
    expect(Math.ceil((0.95 * 0.05) / 0.0025 ** 2)).toBe(7600);
    expect(Math.ceil(0.25 / 0.0025 ** 2)).toBe(40000);
  });
});
