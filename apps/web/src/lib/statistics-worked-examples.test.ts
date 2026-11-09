import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
const examples = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../../docs/pattern-packages/statistics-worked-examples.json'),
    'utf8',
  ),
);
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const variance = (values: number[]) =>
  values.reduce((a, b) => a + (b - mean(values)) ** 2, 0) / (values.length - 1);

describe('Published statistics worked examples', () => {
  it('gives a two-minute paired improvement and uses variation among changes', () => {
    const { before, after, t_critical_df3: t } = examples.pairing;
    const changes = after.map((v: number, i: number) => v - before[i]);
    expect(changes).toEqual([-2, -1, -3, -2]);
    const se = Math.sqrt(variance(changes) / changes.length);
    expect(mean(changes)).toBe(-2);
    expect(se).toBeCloseTo(0.408248, 5);
    expect(mean(changes) - t * se).toBeCloseTo(-3.3, 2);
    expect(mean(changes) + t * se).toBeCloseTo(-0.7, 2);
    expect(Math.sqrt((variance(before) + variance(after)) / before.length)).toBeCloseTo(9.05, 2);
  });
  it('retains censored customers until removal, including the event-time tie', () => {
    const { months, event } = examples.censoring;
    const eventTimes = [
      ...new Set<number>(months.filter((_: number, i: number) => event[i])),
    ].sort();
    const risk = eventTimes.map((t) => months.filter((v: number) => v >= t).length);
    expect(risk).toEqual([6, 4, 2]);
    let survival = 1;
    const estimates = eventTimes.map(
      (t, i) =>
        (survival *=
          1 - months.filter((v: number, j: number) => v === t && event[j]).length / risk[i]),
    );
    expect(estimates).toEqual([5 / 6, 5 / 8, 5 / 16]);
  });
  it('distinguishes the stated 80% and 95% prediction bands and their observed coverage', () => {
    const f = examples.forecast;
    expect(f.mean[0] - f.z80 * f.sd[0]).toBeCloseTo(74.4, 1);
    expect(f.mean[0] + f.z95 * f.sd[0]).toBeCloseTo(139.2, 1);
    const inside = (z: number) =>
      f.observed.filter((v: number, i: number) => Math.abs(v - f.mean[i]) <= z * f.sd[i]).length;
    expect(inside(f.z80)).toBe(5);
    expect(inside(f.z95)).toBe(6);
    expect(f.mean[3] + f.z80 * f.sd[3]).toBeCloseTo(139.3, 1);
  });
  it('pools by precision rather than counting significance labels', () => {
    const s = examples.synthesis;
    const weights = s.se.map((v: number) => 1 / v ** 2);
    const total = weights.reduce((a: number, b: number) => a + b, 0);
    const pooled =
      weights.reduce((a: number, w: number, i: number) => a + w * s.effect[i], 0) / total;
    expect(pooled).toBeCloseTo(4.285714, 5);
    expect(pooled - s.z95 * Math.sqrt(1 / total)).toBeCloseTo(2.57, 2);
    expect(pooled + s.z95 * Math.sqrt(1 / total)).toBeCloseTo(6.0, 2);
    expect(weights[0] / weights[1]).toBe(16);
  });
  it('separates the raw causal comparison from the explicit target composition', () => {
    const c = examples.causal;
    const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);
    const raw =
      sum(c.trained_passed) / sum(c.trained_n) - sum(c.comparison_passed) / sum(c.comparison_n);
    const standardized = c.target_weights.reduce(
      (s: number, w: number, i: number) =>
        s + w * (c.trained_passed[i] / c.trained_n[i] - c.comparison_passed[i] / c.comparison_n[i]),
      0,
    );
    expect(raw).toBeCloseTo(0.34, 10);
    expect(standardized).toBeCloseTo(0.1, 10);
  });
});
