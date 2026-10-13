import type { Action } from './game';

export const SOUND_PREFERENCE = 'patternverse-tender-wilds-sound';
type Cue = 'step' | 'select' | 'plant' | 'water' | 'harvest' | 'reward' | 'build' | 'travel';

/** Quiet, locally synthesized effects. No downloads or audio context until a user gesture. */
export function createGardenAudio() {
  let enabled = false;
  try {
    enabled = localStorage.getItem(SOUND_PREFERENCE) === 'on';
  } catch {
    /* Sound still works when preference storage is unavailable. */
  }
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let disposed = false;
  const voices = new Set<OscillatorNode>();
  let lastStep = -Infinity;

  function silence() {
    for (const voice of voices) {
      voice.stop();
      voice.disconnect();
    }
    voices.clear();
  }
  async function unlock() {
    if (!enabled || disposed) return;
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.6;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') await context.resume();
  }
  async function setEnabled(value: boolean) {
    enabled = value;
    if (!value) silence();
    try {
      if (value) await unlock();
    } catch {
      enabled = false;
      throw new Error('Sound could not start in this browser. You can still play quietly.');
    }
    if (disposed) return;
    try {
      localStorage.setItem(SOUND_PREFERENCE, value ? 'on' : 'off');
    } catch {
      /* Keep the current session usable even without persistent settings. */
    }
  }
  function tone(
    frequency: number,
    delay: number,
    duration: number,
    volume = 0.08,
    type: OscillatorType = 'sine',
    end = frequency,
  ) {
    if (!context || !master || voices.size >= 16) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const start = context.currentTime + delay + 0.005;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(end, start + duration);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    voices.add(oscillator);
    oscillator.onended = () => {
      voices.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
  function play(cue: Cue) {
    if (!enabled || disposed || !context || context.state !== 'running' || document.hidden) return;
    switch (cue) {
      case 'step':
        if (context.currentTime - lastStep < 0.12) return;
        lastStep = context.currentTime;
        tone(240, 0, 0.055, 0.035, 'triangle', 130);
        break;
      case 'select':
        tone(660, 0, 0.09, 0.035);
        break;
      case 'plant':
        tone(320, 0, 0.12, 0.075, 'triangle', 180);
        tone(523, 0.06, 0.18, 0.045);
        break;
      case 'water':
        tone(740, 0, 0.15, 0.06, 'sine', 440);
        tone(988, 0.11, 0.19, 0.05, 'sine', 660);
        break;
      case 'harvest':
        [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.28));
        break;
      case 'reward':
        [659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.36, 0.065));
        break;
      case 'build':
        tone(180, 0, 0.08, 0.08, 'triangle');
        tone(220, 0.1, 0.08, 0.07, 'triangle');
        tone(523, 0.2, 0.4, 0.07);
        tone(784, 0.2, 0.4, 0.05);
        break;
      case 'travel':
        tone(392, 0, 0.3, 0.06);
        tone(587, 0.12, 0.4, 0.06);
        break;
    }
  }
  function action(type: Action['type']) {
    switch (type) {
      case 'plant':
      case 'keep':
      case 'return':
        play('plant');
        break;
      case 'boost':
        play('water');
        break;
      case 'harvest':
      case 'harvest-garden':
      case 'trade':
        play('harvest');
        break;
      case 'recognize':
      case 'breed':
        play('reward');
        break;
      case 'craft':
      case 'bridge':
        play('build');
        break;
      case 'visit':
        play('travel');
        break;
      default:
        play('select');
    }
  }
  return {
    get enabled() {
      return enabled;
    },
    unlock,
    setEnabled,
    play,
    action,
    silence,
    dispose() {
      disposed = true;
      enabled = false;
      silence();
      void context?.close().catch(() => {});
    },
  };
}
