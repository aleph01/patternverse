import { base } from '$app/paths';

/** Unmodified Salamander recordings, sampled every minor third from A0 through C8. */
export const pianoSamples = Array.from({ length: 30 }, (_, i) => {
  const midi = 21 + i * 3;
  const names = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
  return { midi, file: `${names[midi % 12]}${Math.floor(midi / 12) - 1}.mp3` };
});
export const nearestPianoSample = (midi: number) =>
  pianoSamples.reduce((closest, sample) =>
    Math.abs(sample.midi - midi) < Math.abs(closest.midi - midi) ? sample : closest,
  );
const encoded = new Map<number, Promise<ArrayBuffer>>();
const decoded = new WeakMap<BaseAudioContext, Map<number, Promise<AudioBuffer>>>();
const ready = new WeakMap<BaseAudioContext, Map<number, AudioBuffer>>();

class PianoSampleError extends Error {
  constructor() {
    super('The piano recordings could not load. Press Play to try again.');
    this.name = 'PianoSampleError';
  }
}
function bytes(midi: number): Promise<ArrayBuffer> {
  let pending = encoded.get(midi);
  if (!pending) {
    const sample = nearestPianoSample(midi),
      controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    pending = fetch(`${base}/audio/piano/salamander/${sample.file}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new PianoSampleError();
        return response.arrayBuffer();
      })
      .finally(() => clearTimeout(timeout))
      .catch(() => {
        encoded.delete(midi);
        throw new PianoSampleError();
      });
    encoded.set(midi, pending);
  }
  return pending;
}

/** Fetch only the notes this example needs, once Play has unlocked browser audio. */
export async function preparePiano(context: BaseAudioContext, pitches: number[]) {
  let bank = decoded.get(context);
  if (!bank) {
    bank = new Map();
    decoded.set(context, bank);
  }
  let buffers = ready.get(context);
  if (!buffers) {
    buffers = new Map();
    ready.set(context, buffers);
  }
  await Promise.all(
    [...new Set(pitches.map((midi) => nearestPianoSample(midi).midi))].map(async (midi) => {
      let pending = bank!.get(midi);
      if (!pending) {
        pending = bytes(midi)
          .then((data) => context.decodeAudioData(data.slice(0)))
          .catch(() => {
            bank!.delete(midi);
            encoded.delete(midi);
            throw new PianoSampleError();
          });
        bank!.set(midi, pending);
      }
      buffers!.set(midi, await pending);
    }),
  );
}

export function pianoVoice(
  context: BaseAudioContext,
  destination: AudioNode,
  frequency: number,
  start: number,
  seconds: number,
  level: number,
) {
  const midi = 69 + 12 * Math.log2(frequency / 440),
    sample = nearestPianoSample(midi),
    buffer = ready.get(context)?.get(sample.midi);
  if (!buffer) throw new PianoSampleError();
  const oscillator = context.createBufferSource(),
    filter = context.createBiquadFilter(),
    envelope = context.createGain();
  oscillator.buffer = buffer;
  oscillator.playbackRate.value = 2 ** ((midi - sample.midi) / 12);
  filter.type = 'allpass';
  filter.frequency.value = 10000;
  const release = 0.12,
    peak = Math.max(0.0001, level * 2);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(peak, start + Math.min(0.003, seconds / 4));
  envelope.gain.setValueAtTime(peak, start + seconds);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + seconds + release);
  oscillator.connect(filter);
  filter.connect(envelope);
  envelope.connect(destination);
  return { oscillator, filter, envelope, seconds: seconds + release };
}
