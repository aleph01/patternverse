import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
const data = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../../docs/pattern-packages/statistics-final-examples.json'),
    'utf8',
  ),
);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const mean = (values: number[]) => sum(values) / values.length;
const interval = (estimate: number, se: number, z: number) => [
  estimate - z * se,
  estimate + z * se,
];

describe('Final statistics illustrations: worked calculations', () => {
  it('distinguishes the stated target, a different horizon, and a selected denominator', () => {
    const t = data.target;
    const paid = t.paid_day90.map((n: number, i: number) => n / t.assigned[i]);
    const active = t.active_day7.map((n: number, i: number) => n / t.assigned[i]);
    expect(paid).toEqual([0.6, 0.65]);
    expect(paid[1] - paid[0]).toBeCloseTo(0.05, 12);
    expect(paid[1] / paid[0]).toBeCloseTo(1.0833333333, 9);
    expect(active[1] - active[0]).toBeCloseTo(0.1, 12);
    const openers = t.new_openers_paid90 / t.new_openers;
    expect(openers).toBe(0.8);
    expect(openers - paid[0]).toBeCloseTo(0.2, 12);
    const otherN = t.assigned[1] - t.new_openers;
    const otherPaid = t.paid_day90[1] - t.new_openers_paid90;
    expect([otherN, otherPaid, otherPaid / otherN]).toEqual([500, 250, 0.5]);
    expect((t.new_openers_paid90 + otherPaid) / t.assigned[1]).toBe(paid[1]);
  });
  it('keeps the influential order unless a different analysis or verified correction is specified', () => {
    const e = data.extremes,
      values = e.orders;
    const sorted = [...values].sort((a, b) => a - b);
    expect(sum(values)).toBe(532);
    expect(mean(values)).toBe(53.2);
    expect((sorted[4] + sorted[5]) / 2).toBe(29);
    expect(values[9] / sum(values)).toBeCloseTo(0.5263157895, 9);
    const omitted = values.slice(0, -1);
    const corrected = [...omitted, e.corrected_last_if_verified];
    expect([omitted.length, sum(omitted), mean(omitted)]).toEqual([9, 252, 28]);
    expect([corrected.length, sum(corrected), mean(corrected)]).toEqual([10, 280, 28]);
    expect((mean(values) - mean(omitted)) / mean(values)).toBeCloseTo(0.4736842105, 9);
    expect(values[9]).toBe(280);
    expect(10 * 29).not.toBe(sum(values));
  });
  it('separates the point-estimate tipping point from a conditional interval crossing', () => {
    const s = data.sensitivity;
    const biases = s.prevalence_differences.map((d: number) => d * s.outcome_difference_u);
    expect(biases).toEqual([0, 2, 5, 7, 9]);
    expect(biases.map((b: number) => s.estimate - b)).toEqual([7, 5, 2, 0, -2]);
    expect(s.prevalence_differences.every((d: number) => s.control_u_prevalence + d <= 1)).toBe(
      true,
    );
    const original = interval(s.estimate, s.known_se, s.z95);
    expect(original[0]).toBeCloseTo(5.0400360155, 9);
    expect(original[1]).toBeCloseTo(8.9599639845, 9);
    expect(original[0] - (s.estimate - s.z95 * s.known_se)).toBe(0);
    const fixedBiasFive = original.map((endpoint) => endpoint - 5);
    expect(fixedBiasFive[0]).toBeCloseTo(0.0400360155, 9);
    const fixedBiasSeven = original.map((endpoint) => endpoint - 7);
    expect(fixedBiasSeven[0]).toBeCloseTo(-s.z95, 12);
    expect(fixedBiasSeven[1]).toBeCloseTo(s.z95, 12);
  });
  it('keeps the independent-null search calculation separate from the fresh interval', () => {
    const c = data.confirmation;
    expect(1 - (1 - c.alpha) ** c.searches).toBeCloseTo(0.6415140776, 9);
    const discovery = interval(c.discovery.estimate, c.discovery.known_se, c.z95);
    const fresh = interval(c.fresh.estimate, c.fresh.known_se, c.z95);
    expect(discovery[0]).toBeCloseTo(2.1201080464, 9);
    expect(discovery[1]).toBeCloseTo(13.8798919536, 9);
    expect(fresh[0]).toBeCloseTo(-0.9199279691, 9);
    expect(fresh[1]).toBeCloseTo(6.9199279691, 9);
    expect(c.fresh.estimate).toBeGreaterThan(c.meaningful_effect);
    expect(fresh[0]).toBeLessThan(0);
    expect(fresh[0]).toBeLessThan(c.meaningful_effect);
    expect(fresh[1]).toBeGreaterThan(c.meaningful_effect);
    expect(Math.max(discovery[0], fresh[0])).toBeLessThan(Math.min(discovery[1], fresh[1]));
  });
  it('compares current action, test-contingent action, and perfect information under the stated utilities', () => {
    const d = data.decision,
      p = d.probability,
      benefit = d.benefit_if_present,
      cost = d.action_cost;
    expect(cost / benefit).toBe(0.2);
    expect(d.alternative_action_cost / benefit).toBe(0.4);
    const immediate = Math.max(0, benefit * p - cost);
    expect(immediate).toBe(5);
    expect(benefit * p - d.alternative_action_cost).toBe(-5);
    const positive = p * d.test_sensitivity + (1 - p) * (1 - d.test_specificity);
    const positiveIssue = (p * d.test_sensitivity) / positive;
    const negativeIssue = (p * (1 - d.test_sensitivity)) / (1 - positive);
    expect(positive).toBeCloseTo(0.31, 12);
    expect(positiveIssue).toBeCloseTo(0.7741935484, 9);
    expect(negativeIssue).toBeCloseTo(0.0869565217, 9);
    expect(positiveIssue).toBeGreaterThan(cost / benefit);
    expect(negativeIssue).toBeLessThan(cost / benefit);
    expect(positive * positiveIssue + (1 - positive) * negativeIssue).toBeCloseTo(p, 12);
    const gross =
      positive * Math.max(0, benefit * positiveIssue - cost) +
      (1 - positive) * Math.max(0, benefit * negativeIssue - cost);
    const net = gross - d.test_cost;
    const perfect = p * Math.max(0, benefit - cost);
    expect(gross).toBeCloseTo(8.9, 12);
    expect(net).toBeCloseTo(6.9, 12);
    expect(net - immediate).toBeCloseTo(1.9, 12);
    expect(perfect).toBe(12);
    expect(perfect - immediate).toBe(7);
    expect(gross).toBeLessThan(perfect);
    expect(net - 2).toBeLessThan(immediate);
  });
  it('calculates the invitation ratio on the proportion scale without identifying individual compliers', () => {
    const i = data.instrument;
    const attendance = i.attended.map((n: number, j: number) => n / i.group_n[j]);
    const firstStage = attendance[1] - attendance[0];
    const outcomeContrast = i.outcome_mean[1] - i.outcome_mean[0];
    expect(firstStage).toBeCloseTo(0.4, 12);
    expect(outcomeContrast).toBe(4);
    expect(outcomeContrast / firstStage).toBeCloseTo(10, 12);
    const estimatedShares = [attendance[0], firstStage, 1 - attendance[1]];
    expect(estimatedShares[0]).toBe(0.2);
    expect(estimatedShares[1]).toBeCloseTo(0.4, 12);
    expect(estimatedShares[2]).toBe(0.4);
    expect(sum(estimatedShares)).toBeCloseTo(1, 12);
    expect(firstStage * 10).toBeCloseTo(outcomeContrast, 12);
    expect(outcomeContrast / i.hypothetical_weak_first_stage).toBe(200);
  });
});
