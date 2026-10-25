import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { thermostat, signalLab, signalMetrics } from './simulations.js';
export async function simulationContext() {
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
  const thermal = (gain: number, delay: number) => {
    const samples = thermostat({ ...base, gain, delay });
    return {
      parameters: { ...base, gain, delay },
      final_temperature: samples.at(-1)!.truth,
      peak_temperature: Math.max(...samples.map((s) => s.truth)),
      duration_minutes: 72,
    };
  };
  return {
    kind: 'authored-educational-models',
    warning:
      'These are computed outputs of the authored toy models, not empirical observations or validation of physical equipment. Source code and model assumptions are authoritative for these assets only.',
    model_source: await readFile(
      fileURLToPath(new URL('./simulations.ts', import.meta.url)),
      'utf8',
    ),
    thermostat: {
      id: 'control-thermostat',
      target_c: 21,
      initial_c: 18,
      outside_c: 5,
      controls: {
        gain: '0..3 power/C in steps of 0.05',
        inertia: '5..40 minutes, integer steps',
        delay: '0..8 minutes, steps of 0.2',
        limit: '0.2..1 fraction in steps of 0.05',
        band: '0..2 C in steps of 0.1',
        mode: ['proportional', 'relay'],
        window: 'boolean: doubled heat loss at 30..45 min',
        feedforward: 'boolean: exact toy-model loss compensation in proportional mode',
      },
      sample_results: [thermal(0.1, 2), thermal(1, 2), thermal(1, 0)],
      notes:
        'Power trace is not plotted. Room temperature and target are plotted; final power, highest temperature and relay on/off transitions are reported. No settling-time metric is exposed. Hysteresis thresholds are 21 +/- band/2; heater lag is 2 minutes. Relay starts off; heater starts at zero. The time constant scales both heating and cooling; increasing it changes dynamics, not the closed-window equilibrium for fixed power. The window changes heat-loss conductance; it is not a change in thermal capacity.',
    },
    signals: {
      id: 'control-signals',
      controls: {
        noise: '0..0.6, steps of 0.02',
        interval: '0.05..2 seconds, steps of 0.05',
        filter: '0..5 seconds, steps of 0.1',
      },
      sample_results: [0, 0.8, 2].map((filter) => ({
        parameters: { noise: 0.3, interval: 0.1, filter },
        ...signalMetrics(signalLab({ noise: 0.3, interval: 0.1, filter })),
      })),
      notes:
        'Signal steps at 10 seconds. Plots show true signal, sampled/held measurement and causal filtered output. RMSE uses samples at t>=20 seconds; first 90% crossing is noise-sensitive. No anti-alias prefilter is simulated; low-pass filtering after sampling cannot undo aliasing.',
    },
  };
}
