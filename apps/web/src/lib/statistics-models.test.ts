import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const data = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../../docs/pattern-packages/statistics-model-examples.json'),
    'utf8',
  ),
);
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const variance = (values: number[]) =>
  values.reduce((sum, v) => sum + (v - mean(values)) ** 2, 0) / (values.length - 1);
const predict = (row: number[], slopes: number[]) =>
  row.reduce((sum, value, j) => sum + value * slopes[j], 0);
const mse = (x: number[][], y: number[], slopes: number[]) =>
  mean(x.map((row, i) => (predict(row, slopes) - y[i]) ** 2));

function ridgeFit(x: number[][], y: number[], lambda: number) {
  // Solve the 2-by-2 normal equations rather than use the figure's special shrinkage formula.
  const gram = [0, 1].map((j) =>
    [0, 1].map((k) => x.reduce((sum, row) => sum + row[j] * row[k], 0)),
  );
  const rhs = [0, 1].map((j) => x.reduce((sum, row, i) => sum + row[j] * y[i], 0));
  const a = gram[0][0] + lambda,
    b = gram[0][1],
    c = gram[1][0],
    d = gram[1][1] + lambda;
  return [(d * rhs[0] - b * rhs[1]) / (a * d - b * c), (a * rhs[1] - c * rhs[0]) / (a * d - b * c)];
}

describe('Statistics effects, outcome models, regularization and blocking calculations', () => {
  it('keeps event rates, absolute and relative effects, and the interval denominator distinct', () => {
    const a = data.absolute_effects;
    const rates = a.events.map((events: number, i: number) => events / a.group_n[i]);
    const diff = rates[1] - rates[0];
    const se = Math.sqrt(
      rates.reduce((sum: number, p: number, i: number) => sum + (p * (1 - p)) / a.group_n[i], 0),
    );
    expect(rates).toEqual([0.002, 0.003]);
    expect(rates.map((p: number) => p * a.display_denominator)).toEqual([2, 3]);
    expect(diff * a.display_denominator).toBe(1);
    expect(diff * 100).toBe(0.1);
    expect(rates[1] / rates[0]).toBe(1.5);
    expect((rates[1] - rates[0]) / rates[0]).toBe(0.5);
    expect(se).toBeCloseTo(0.000223315919719, 14);
    const interval = [diff - a.z95 * se, diff + a.z95 * se].map((v) => v * a.display_denominator);
    expect(interval[0]).toBeCloseTo(0.5623088402, 9);
    expect(interval[1]).toBeCloseTo(1.4376911598, 9);
    const smallSampleSE = Math.sqrt(
      rates.reduce((sum: number, p: number) => sum + (p * (1 - p)) / a.display_denominator, 0),
    );
    expect(smallSampleSE / se).toBeCloseTo(10, 12);
  });

  it('distinguishes logistic probability, discrete count mass, and continuous density', () => {
    const o = data.outcomes;
    const probabilities = o.linear_predictors.map((eta: number) => 1 / (1 + Math.exp(-eta)));
    expect(probabilities.every((p: number) => p > 0 && p < 1)).toBe(true);
    expect(probabilities[1]).toBeCloseTo(0.119202922, 8);
    expect(probabilities[2]).toBe(0.5);
    expect(probabilities[3]).toBeCloseTo(0.880797078, 8);
    expect(probabilities[1] + probabilities[3]).toBeCloseTo(1, 12);
    expect(Math.exp(-o.poisson_mean)).toBeCloseTo(0.1353352832, 9);
    const masses = [Math.exp(-o.poisson_mean)];
    for (let k = 1; k < 30; k++) masses.push((masses[k - 1] * o.poisson_mean) / k);
    expect(masses.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    const density = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    expect(density(0)).toBeCloseTo(0.3989422804, 9);
    const step = 2 / 10000;
    let intervalProbability = (density(-1) + density(1)) / 2;
    for (let i = 1; i < 10000; i++) intervalProbability += density(-1 + i * step);
    expect(intervalProbability * step).toBeCloseTo(0.6826894921, 7);
  });

  it('reverses the count comparison after exposure normalization and reconstructs the offset means', () => {
    const o = data.outcomes;
    const rates = o.complaints.map((n: number, i: number) => n / o.transactions[i]);
    expect(o.complaints[1] / o.complaints[0]).toBe(1.5);
    expect(rates).toEqual([0.02, 0.01]);
    expect(rates.map((p: number) => p * 1000)).toEqual([20, 10]);
    expect(rates[1] / rates[0]).toBe(0.5);
    const alpha = Math.log(rates[0]),
      beta = Math.log(rates[1] / rates[0]);
    const expected = o.transactions.map((exposure: number, i: number) =>
      Math.exp(Math.log(exposure) + alpha + beta * i),
    );
    expect(expected[0]).toBeCloseTo(20, 10);
    expect(expected[1]).toBeCloseTo(30, 10);
    expect(beta).toBeCloseTo(-0.69314718056, 10);
  });

  it('solves the stated ridge objective and uses validation rather than perfect training fit to tune', () => {
    const r = data.regularization;
    const results = r.lambdas.map((lambda: number) => {
      const slopes = ridgeFit(r.training_x, r.training_y, lambda);
      for (let j = 0; j < 2; j++) {
        const gradient =
          r.training_x.reduce(
            (sum: number, row: number[], i: number) =>
              sum + row[j] * (predict(row, slopes) - r.training_y[i]),
            0,
          ) +
          lambda * slopes[j];
        expect(gradient).toBeCloseTo(0, 12);
      }
      return {
        slopes,
        training: mse(r.training_x, r.training_y, slopes),
        validation: mse(r.validation_x, r.validation_y, slopes),
      };
    });
    expect(results.map((r: { slopes: number[] }) => r.slopes)).toEqual([
      [2, 3],
      [1, 1.5],
      [0.5, 0.75],
      [0.2, 0.3],
    ]);
    [0, 3.25, 7.3125, 10.53].forEach((expected, i) =>
      expect(results[i].training).toBeCloseTo(expected, 12),
    );
    [9, 3.25, 2.8125, 3.33].forEach((expected, i) =>
      expect(results[i].validation).toBeCloseTo(expected, 12),
    );
    const chosenIndex = results.reduce(
      (best: number, result: { validation: number }, i: number) =>
        result.validation < results[best].validation ? i : best,
      0,
    );
    expect(r.lambdas[chosenIndex]).toBe(12);
    // The plotted continuous curve has a lower minimum between the marked grid choices.
    expect(
      mse(r.validation_x, r.validation_y, ridgeFit(r.training_x, r.training_y, 9)),
    ).toBeCloseTo(36 / 13, 12);
    expect(
      mse(r.validation_x, r.validation_y, ridgeFit(r.training_x, r.training_y, 9)),
    ).toBeLessThan(results[chosenIndex].validation);
    expect(mse(r.validation_x, r.validation_y, [0, 0])).toBe(4);
    expect(results[chosenIndex].validation).toBeLessThan(4);
    expect(results[3].validation).toBeGreaterThan(results[2].validation);
  });

  it('preserves both treatments in every randomization and uses the covariance of block comparisons', () => {
    const b = data.blocking;
    let allocations: string[][][] = [[]];
    for (let batch = 0; batch < b.batches.length; batch++)
      allocations = allocations.flatMap((prefix) => [
        [...prefix, ['A', 'B']],
        [...prefix, ['B', 'A']],
      ]);
    expect(allocations).toHaveLength(16);
    expect(
      allocations.every((allocation) =>
        allocation.every((pair) => [...pair].sort().join('') === 'AB'),
      ),
    ).toBe(true);
    expect(allocations).toContainEqual(b.position_assignment);
    const differences = b.b.map((value: number, i: number) => value - b.a[i]);
    expect(differences).toEqual([4, 3, 5, 4]);
    expect(mean(differences)).toBe(4);
    expect(mean(b.b) - mean(b.a)).toBe(4);
    expect(variance(differences)).toBeCloseTo(2 / 3, 12);
    const covariance =
      b.a.reduce(
        (sum: number, value: number, i: number) => sum + (value - mean(b.a)) * (b.b[i] - mean(b.b)),
        0,
      ) /
      (b.batches.length - 1);
    expect(variance(b.a) + variance(b.b) - 2 * covariance).toBeCloseTo(variance(differences), 10);
    expect(Math.sqrt(variance(differences) / b.batches.length)).toBeCloseTo(0.4082482905, 9);
    expect(Math.sqrt((variance(b.a) + variance(b.b)) / b.batches.length)).toBeCloseTo(
      18.3530197334,
      9,
    );
    expect(b.b[3] - b.a[0]).toBe(64);
  });
});
