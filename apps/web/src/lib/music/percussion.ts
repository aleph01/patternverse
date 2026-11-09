import type { DrumSound } from './model';

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
export function percussionVoice(
  context: BaseAudioContext,
  destination: AudioNode,
  sound: DrumSound,
  start: number,
  level: number,
) {
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  let oscillator: AudioScheduledSourceNode;
  const seconds = sound === 'kick' ? 0.24 : sound === 'snare' ? 0.14 : 0.055;
  if (sound === 'kick' || sound === 'click') {
    const tone = context.createOscillator();
    tone.frequency.setValueAtTime(sound === 'kick' ? 140 : 1100, start);
    tone.frequency.exponentialRampToValueAtTime(sound === 'kick' ? 44 : 700, start + seconds);
    oscillator = tone;
    filter.type = 'lowpass';
    filter.frequency.value = 8000;
  } else {
    let noise = noiseBuffers.get(context);
    if (!noise) {
      noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      noiseBuffers.set(context, noise);
    }
    const source = context.createBufferSource();
    source.buffer = noise;
    oscillator = source;
    filter.type = 'highpass';
    filter.frequency.value = sound === 'snare' ? 1000 : 7000;
  }
  envelope.gain.setValueAtTime(
    Math.max(0.001, level * (sound === 'hat' ? 0.3 : sound === 'kick' ? 2 : 1.1)),
    start,
  );
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  oscillator.connect(filter);
  filter.connect(envelope);
  envelope.connect(destination);
  return { oscillator, filter, envelope, seconds };
}
