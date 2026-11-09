import { pianoVoice } from './piano';
import type { Part } from './examples';

export const instruments = [
  { id: 'piano', name: 'Piano' },
  { id: 'guitar', name: 'Guitar' },
  { id: 'bass-guitar', name: 'Bass guitar' },
] as const;
export type Instrument = (typeof instruments)[number]['id'];
export type Instrumentation = Record<Part, Instrument>;
export const defaultInstrumentation: Readonly<Instrumentation> = {
  melody: 'piano',
  chords: 'guitar',
  bass: 'bass-guitar',
};

// Piano uses recorded samples; guitar and bass remain original synthesized timbres.
// Keep note pitch and duration independent of the chosen instrument.
const timbres = {
  guitar: {
    harmonics: [0, 1, 0.65, 0.3, 0.12, 0.03, -0.025, -0.035, -0.025],
    attack: 0.003,
    decay: 0.65,
    brightness: 10,
    tailBrightness: 2,
    gain: 0.9,
  },
  'bass-guitar': {
    harmonics: [0, 1, 0.3, 0.08, 0.035, 0.015],
    attack: 0.009,
    decay: 1.1,
    brightness: 5,
    tailBrightness: 1.5,
    gain: 1.1,
  },
} as const;
const waves = new WeakMap<BaseAudioContext, Map<Instrument, PeriodicWave>>();

export function instrumentVoice(
  context: BaseAudioContext,
  destination: AudioNode,
  instrument: Instrument,
  frequency: number,
  start: number,
  seconds: number,
  level: number,
) {
  if (instrument === 'piano')
    return pianoVoice(context, destination, frequency, start, seconds, level);
  const timbre = timbres[instrument];
  let bank = waves.get(context);
  if (!bank) {
    bank = new Map();
    waves.set(context, bank);
  }
  let wave = bank.get(instrument);
  if (!wave) {
    const harmonics = new Float32Array(timbre.harmonics);
    wave = context.createPeriodicWave(new Float32Array(harmonics.length), harmonics);
    bank.set(instrument, wave);
  }
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  oscillator.setPeriodicWave(wave);
  oscillator.frequency.value = frequency;
  filter.type = 'lowpass';
  filter.Q.value = 0.5;
  const attack = Math.min(timbre.attack, seconds * 0.15);
  const release = Math.min(0.04, seconds * 0.15);
  const decayTime = seconds - release;
  const decay = timbre.decay * Math.min(2, Math.max(0.5, (220 / frequency) ** 0.25));
  const peak = level * timbre.gain;
  const cutoff = (multiple: number) => Math.min(context.sampleRate * 0.45, frequency * multiple);
  filter.frequency.setValueAtTime(cutoff(timbre.brightness), start);
  filter.frequency.exponentialRampToValueAtTime(
    cutoff(timbre.tailBrightness),
    start + Math.min(0.5, decayTime),
  );
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(peak, start + attack);
  envelope.gain.exponentialRampToValueAtTime(
    peak * Math.max(0.025, Math.exp(-decayTime / decay)),
    start + decayTime,
  );
  envelope.gain.linearRampToValueAtTime(0, start + seconds);
  oscillator.connect(filter);
  filter.connect(envelope);
  envelope.connect(destination);
  return { oscillator, filter, envelope };
}
