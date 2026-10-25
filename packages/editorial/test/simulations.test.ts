import { expect, it } from 'vitest';
import { thermostat, signalLab, signalMetrics } from '../src/simulations.js';
import { simulationHtml } from '../src/simulation-assets.js';
const base = {
  gain: 0.25,
  inertia: 15,
  delay: 2,
  limit: 1,
  band: 0.6,
  mode: 'proportional' as const,
  window: false,
  feedforward: false,
};
it('unheated room tends toward outdoors and idealized feedforward removes steady offset', () => {
  expect(thermostat({ ...base, gain: 0 }).at(-1)!.truth).toBeCloseTo(5, 0);
  expect(thermostat({ ...base, feedforward: true, delay: 0 }).at(-1)!.truth).toBeCloseTo(21, 1);
});
it('respects actuator bounds and exposes unreachable setpoints', () => {
  const limited = thermostat({ ...base, gain: 3, limit: 0.2 });
  expect(limited.every((s) => s.power >= 0 && s.power <= 0.2 && Number.isFinite(s.truth))).toBe(
    true,
  );
  expect(limited.at(-1)!.truth).toBeLessThan(21);
});
it('delay plus high gain can produce more overshoot than gentle tuning in this model', () => {
  const maximum = (gain: number) =>
    Math.max(...thermostat({ ...base, gain, delay: 4 }).map((s) => s.truth));
  expect(maximum(1)).toBeGreaterThan(maximum(0.1));
});
it('window disturbance lowers temperature for the same feedback settings', () => {
  const closed = thermostat(base),
    open = thermostat({ ...base, window: true });
  expect(open.find((s) => s.time === 40)!.truth).toBeLessThan(
    closed.find((s) => s.time === 40)!.truth,
  );
});
it('a low-pass filter reduces steady synthetic noise while adding response delay', () => {
  const raw = signalMetrics(signalLab({ noise: 0.3, interval: 0.1, filter: 0 }));
  const filtered = signalMetrics(signalLab({ noise: 0.3, interval: 0.1, filter: 1 }));
  expect(filtered.filteredRmse).toBeLessThan(raw.rawRmse);
  expect(filtered.riseTime).toBeGreaterThan(raw.riseTime);
});
it('renders self-contained shared widgets without external scripts or tracking', async () => {
  for (const id of ['control-thermostat', 'control-signals'] as const) {
    const html = await simulationHtml(id);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Model and limitations');
    expect(html).not.toContain('script src=');
    expect(html).not.toContain('fetch(');
    expect(html).toContain('Reset experiment');
  }
});

it('changing thermal inertia preserves the closed-window proportional equilibrium', () => {
  const final = [5, 15, 40].map(
    (inertia) => thermostat({ ...base, inertia, delay: 0 }).at(-1)!.truth,
  );
  // T_eq = (5 + 30*Kp*21)/(1 + 30*Kp), independent of thermal capacity.
  const expected = (5 + 30 * base.gain * 21) / (1 + 30 * base.gain);
  for (const temperature of final) expect(Math.abs(temperature - expected)).toBeLessThan(0.1);
});
