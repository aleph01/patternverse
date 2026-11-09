import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
const data = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../../docs/pattern-packages/statistics-foundations-examples.json'),
    'utf8',
  ),
);
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const variance = (values: number[]) =>
  values.reduce((a, b) => a + (b - mean(values)) ** 2, 0) / (values.length - 1);

describe('Statistics foundations worked calculations', () => {
  it('updates explicit Beta priors and counts each batch only once', () => {
    const u = data.updating;
    const posteriors = u.priors.map(([a, b]: number[]) => [
      a + u.successes,
      b + u.trials - u.successes,
    ]);
    expect(posteriors).toEqual([
      [10, 4],
      [16, 10],
    ]);
    expect(posteriors.map(([a, b]: number[]) => a / (a + b))).toEqual([10 / 14, 16 / 26]);
    const sequential = [
      posteriors[0][0] + u.next_successes,
      posteriors[0][1] + u.next_trials - u.next_successes,
    ];
    const combined = [
      u.priors[0][0] + u.successes + u.next_successes,
      u.priors[0][1] + u.trials + u.next_trials - u.successes - u.next_successes,
    ];
    expect(sequential).toEqual([17, 7]);
    expect(combined).toEqual(sequential);
  });
  it('rounds precision requirements upward and distinguishes one mean from a contrast', () => {
    const p = data.precision;
    const requirement = ((p.z95 * p.sigma) / p.half_width) ** 2;
    expect(Math.ceil(requirement)).toBe(62);
    expect((p.z95 * p.sigma) / Math.sqrt(61)).toBeGreaterThan(3);
    expect((p.z95 * p.sigma) / Math.sqrt(62)).toBeLessThan(3);
    expect(Math.ceil(62 / p.retention)).toBe(78);
    expect(Math.ceil(2 * requirement)).toBe(123);
    expect(Math.ceil(123 / p.retention)).toBe(154);
    expect(Math.ceil(((p.z95 * 18) / p.half_width) ** 2)).toBe(139);
    expect(p.display_n.map((n: number) => ((p.z95 * p.sigma) / Math.sqrt(n)).toFixed(2))).toEqual([
      '5.88',
      '2.94',
      '1.47',
    ]);
  });
  it('detects a missing curve despite a zero average residual and evaluates fresh observations', () => {
    const m = data.model_check;
    const xbar = mean(m.x),
      ybar = mean(m.y);
    const slope =
      m.x.reduce((s: number, x: number, i: number) => s + (x - xbar) * (m.y[i] - ybar), 0) /
      m.x.reduce((s: number, x: number) => s + (x - xbar) ** 2, 0);
    expect(slope).toBe(0);
    expect(ybar).toBe(5);
    const residuals = m.y.map((y: number) => y - ybar);
    expect(mean(residuals)).toBe(0);
    expect(residuals.reduce((s: number, v: number) => s + v * v, 0)).toBe(84);
    const lineMAE = mean(m.fresh_y.map((y: number) => Math.abs(y - 5)));
    const curveMAE = mean(
      m.fresh_y.map((y: number, i: number) => Math.abs(y - (1 + m.fresh_x[i] ** 2))),
    );
    expect(lineMAE).toBeCloseTo(2.45, 10);
    expect(curveMAE).toBeCloseTo(0.2, 10);
    expect(mean(m.counts)).toBe(2);
    expect(m.counts.filter((n: number) => n === 0).length / m.counts.length).toBe(0.6);
    expect(Math.exp(-mean(m.counts))).toBeCloseTo(0.135335, 5);
  });
  it('uses the matching 90% intervals for the stated TOST criterion', () => {
    const e = data.equivalence;
    const ranges = e.cases.map((c: { estimate: number; se: number }) => [
      c.estimate - e.z90 * c.se,
      c.estimate + e.z90 * c.se,
    ]);
    expect(ranges.map(([lo, hi]: number[]) => lo > -e.margin && hi < e.margin)).toEqual([
      true,
      false,
      false,
    ]);
    expect(ranges[0][0]).toBeCloseTo(-0.42, 2);
    expect(ranges[0][1]).toBeCloseTo(1.22, 2);
    expect(ranges[1][0]).toBeCloseTo(-2.89, 2);
    expect(ranges[1][1]).toBeCloseTo(3.69, 2);
    expect(ranges[2][0]).toBeGreaterThan(e.margin);
    const first = e.cases[0];
    expect(first.estimate - e.z95 * first.se).toBeLessThan(0);
    expect(first.estimate + e.z95 * first.se).toBeGreaterThan(0);
  });
  it('fits each validation partition using only the permitted training observations', () => {
    const v = data.validation;
    const scores = Object.values(v.train as Record<string, number[]>).map((indices) => {
      const fallback = mean(indices.map((i) => v.outcome[i]));
      const predict = (worker: string) => {
        const ys = indices.filter((i) => v.worker[i] === worker).map((i) => v.outcome[i]);
        return ys.length ? mean(ys) : fallback;
      };
      return mean(
        v.outcome.flatMap((y: number, i: number) =>
          indices.includes(i) ? [] : [Math.abs(y - predict(v.worker[i]))],
        ),
      );
    });
    expect(scores).toEqual([1, 2, 20]);
    expect(v.train['Future months'].every((i: number) => v.month[i] <= 2)).toBe(true);
    expect(v.train['New worker'].every((i: number) => v.worker[i] === 'A')).toBe(true);
  });
  it('retains shared calibration uncertainty when averaging repeated readings', () => {
    const m = data.measurement,
      values = m.readings['Stable, biased'];
    const repeatSE = Math.sqrt(variance(values) / values.length);
    const combined = Math.hypot(repeatSE, m.calibration_standard_uncertainty);
    expect(mean(values)).toBe(102);
    expect(mean(values) - m.correction).toBe(m.reference);
    expect(repeatSE).toBeCloseTo(0.081649658, 7);
    expect(combined).toBeCloseTo(0.310913, 5);
    expect(2 * combined).toBeCloseTo(0.62, 2);
    const manyRepeats = Math.hypot(
      Math.sqrt(variance(values) / 400),
      m.calibration_standard_uncertainty,
    );
    expect(manyRepeats).toBeGreaterThan(0.3);
    expect(manyRepeats).toBeLessThan(0.301);
  });
  it('restores known composition without inventing extra observed responses', () => {
    const s = data.sampling;
    const population = s.population.reduce((a: number, b: number) => a + b, 0);
    const responses = s.responded.reduce((a: number, b: number) => a + b, 0);
    const raw =
      s.responded.reduce((a: number, n: number, i: number) => a + n * s.rating_mean[i], 0) /
      responses;
    const weights = s.population.map((n: number, i: number) => n / s.responded[i]);
    const weighted =
      s.responded.reduce(
        (a: number, n: number, i: number) => a + n * weights[i] * s.rating_mean[i],
        0,
      ) / population;
    expect(weights).toEqual([2.5, 40]);
    expect(raw).toBeCloseTo(4.2, 10);
    expect(weighted).toBeCloseTo(3.3, 10);
    expect(population).toBe(1000);
    expect(responses).toBe(100);
  });
});
