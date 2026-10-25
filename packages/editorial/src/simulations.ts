/** Educational models, not identified physical systems or controller-design tools. */
export type ThermostatOptions = {
  gain: number;
  inertia: number;
  delay: number;
  limit: number;
  band: number;
  mode: 'proportional' | 'relay';
  window: boolean;
  feedforward: boolean;
};
export type Sample = {
  time: number;
  truth: number;
  measured: number;
  output: number;
  power: number;
};
export function thermostat(options: ThermostatOptions): Sample[] {
  const dt = 0.02,
    target = 21,
    outdoor = 5,
    heaterLift = 30,
    heaterLag = 2;
  let temperature = 18,
    heater = 0,
    relay = 0;
  const samples: Sample[] = [];
  const delaySteps = Math.round(Math.max(0, options.delay) / dt);
  for (let step = 0; step <= 3600; step++) {
    const time = step * dt;
    const old = samples[Math.max(0, step - delaySteps)];
    // A deterministic bounded perturbation, not a statistical sensor model.
    const measured = (old?.truth ?? temperature) + 0.08 * Math.sin(step * 1.91);
    const leak = options.window && time >= 30 && time < 45 ? 2 : 1;
    if (measured < target - options.band / 2) relay = 1;
    else if (measured > target + options.band / 2) relay = 0;
    const feedforward = options.feedforward ? (leak * (target - outdoor)) / heaterLift : 0;
    const demand =
      options.mode === 'relay' ? relay : feedforward + options.gain * (target - measured);
    const power = Math.max(0, Math.min(options.limit, demand));
    samples.push({ time, truth: temperature, measured, output: temperature, power });
    // Forward Euler, dt=0.02 min; parameter controls keep the integration step small relative to dynamics.
    temperature += (dt * (leak * (outdoor - temperature) + heaterLift * heater)) / options.inertia;
    heater += (dt * (power - heater)) / heaterLag;
  }
  return samples;
}
export type SignalOptions = { noise: number; interval: number; filter: number };
export function signalLab(options: SignalOptions): Sample[] {
  const dt = 0.01;
  const sampleSteps = Math.max(1, Math.round(options.interval / dt));
  const interval = sampleSteps * dt;
  const alpha = options.filter <= 0 ? 1 : 1 - Math.exp(-interval / options.filter);
  let measured = 0,
    filtered = 0;
  const samples: Sample[] = [];
  for (let step = 0; step <= 4000; step++) {
    const time = step * dt,
      truth = time >= 10 ? 1 : 0;
    if (step % sampleSteps === 0) {
      const noise =
        options.noise *
        (0.65 * Math.sin(2 * Math.PI * 3.7 * time) +
          0.35 * Math.sin(2 * Math.PI * 11.3 * time + 0.8));
      measured = truth + noise;
      filtered += alpha * (measured - filtered);
    }
    samples.push({ time, truth, measured, output: filtered, power: 0 });
  }
  return samples;
}
export function signalMetrics(samples: Sample[]) {
  const steady = samples.filter((s) => s.time >= 20);
  const rmse = (key: 'measured' | 'output') =>
    Math.sqrt(steady.reduce((sum, s) => sum + (s[key] - s.truth) ** 2, 0) / steady.length);
  return {
    rawRmse: rmse('measured'),
    filteredRmse: rmse('output'),
    riseTime: (samples.find((s) => s.time >= 10 && s.output >= 0.9)?.time ?? NaN) - 10,
  };
}
