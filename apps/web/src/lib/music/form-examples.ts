import { midiPitch } from './examples';
import type { MusicExample, Note } from './model';

const event = (pitch: string, start: number, duration: number, part: string): Note => ({
  pitch,
  midi: midiPitch(pitch),
  start,
  duration,
  part,
  velocity: 0.6,
});
const full: Note[] = Array.from({ length: 8 }, (_, bar) => [
  ...['D4', 'F4', 'A4', 'F4'].map((pitch, i) => event(pitch, bar * 4 + i, 0.85, 'figure')),
  ...[0, 2].map((i) => event('D2', bar * 4 + i, 1.8, 'low')),
  ...['D3', 'A3'].map((pitch) => event(pitch, bar * 4, 4, 'sustain')),
  ...Array.from({ length: 8 }, (_, i) => ({
    ...event('F#2', bar * 4 + i / 2, 0.08, 'pulse'),
    drum: 'hat' as const,
    velocity: 0.35,
  })),
])
  .flat()
  .sort((a, b) => a.start - b.start);
export const layeredEntrances: Record<string, number> = {
  figure: 0,
  low: 8,
  sustain: 16,
  pulse: 24,
};
const build = full.filter((n) => n.start >= layeredEntrances[n.part]);
export const formExample: MusicExample = {
  id: 'form-layered-entry',
  title: 'Form · build by layered entry',
  description:
    'Form is how a piece unfolds through time. A section is a larger span; a layer is one sounding part. Here the same four-note figure repeats for eight bars. Compare a full texture throughout with parts entering one at a time.',
  key: 'D-centered original sketch',
  tempo: 112,
  beatsPerBar: 4,
  beats: 32,
  notes: build,
  chords: [],
  defaultView: 'form',
  tracks: [
    { id: 'figure', label: 'Repeating figure', instrument: 'piano' },
    { id: 'low', label: 'Bass', instrument: 'piano' },
    { id: 'sustain', label: 'Sustained tones', instrument: 'piano' },
    { id: 'pulse', label: 'Pulse', drum: 'hat' },
  ],
  sections: ['Figure', '+ Bass', '+ Sustained tones', '+ Pulse'].map((label, i) => ({
    label,
    start: i * 8,
    end: (i + 1) * 8,
  })),
  comparison: {
    changed:
      'Only when each supporting layer first enters. A starts full; B adds bass, sustained tones, then pulse.',
    invariant:
      'The repeating figure, each part’s notes after its entrance, sounds, velocities, tempo, meter and eight-bar length.',
    effect:
      'B makes each arrival a new event around familiar material. More notes need not mean more emotional intensity.',
    useWhen:
      'A loop needs a longer trajectory while its main idea should remain recognizable. Reserve a useful entrance; leave room for later subtraction or release.',
  },
  source: {
    label: 'Original Patternverse form study · not a transcription of a listening reference',
  },
  variants: [
    {
      id: 'a',
      label: 'Constant texture',
      description:
        'All four layers begin together. The four spans are reference windows, not four new musical sections.',
      notes: full,
      sections: Array.from({ length: 4 }, (_, i) => ({
        label: i === 0 ? 'Full texture' : 'Continue',
        start: i * 8,
        end: (i + 1) * 8,
      })),
    },
    {
      id: 'b',
      label: 'Layered entry',
      description:
        'Follow each entrance while the four-note figure stays unchanged. This miniature demonstrates accumulation; it does not demonstrate a complete climax-and-release form.',
      notes: build,
    },
  ],
};
