import type { MusicExample } from './model';

export type Measure = {
  index: number;
  start: number;
  end: number;
  numerator: number;
  denominator: number;
};

export function measuresFor(example: MusicExample): Measure[] {
  const meters = [
    { beat: 0, numerator: example.beatsPerBar, denominator: example.beatUnit ?? 4 },
    ...(example.meters ?? []),
  ].sort((a, b) => a.beat - b.beat);
  const measures: Measure[] = [];
  let start = 0;
  while (start < example.beats - 1e-7 && measures.length < 4096) {
    const meter = meters.findLast((entry) => entry.beat <= start + 1e-7)!;
    const next = meters.find((entry) => entry.beat > start + 1e-7)?.beat ?? example.beats;
    const end = Math.min(example.beats, next, start + (meter.numerator * 4) / meter.denominator);
    measures.push({
      index: measures.length,
      start,
      end,
      numerator: meter.numerator,
      denominator: meter.denominator,
    });
    start = end;
  }
  return measures;
}

/** Integrate tempo events once; looping repeats the complete authored tempo map. */
export function clockFor(example: MusicExample, tempo = example.tempo) {
  const events = [{ beat: 0, bpm: example.tempo }, ...(example.tempos ?? [])].sort(
    (a, b) => a.beat - b.beat,
  );
  const map: { beat: number; seconds: number; bpm: number }[] = [];
  for (const event of events) {
    const prev = map.at(-1);
    const seconds = prev ? prev.seconds + ((event.beat - prev.beat) * 60) / prev.bpm : 0;
    if (prev?.beat === event.beat) map.pop();
    map.push({ ...event, seconds });
  }
  const ratio = tempo / example.tempo;
  const localSeconds = (beat: number) => {
    const event = map.findLast((entry) => entry.beat <= beat)!;
    return event.seconds + ((beat - event.beat) * 60) / event.bpm;
  };
  const length = localSeconds(example.beats);
  return {
    seconds(beat: number) {
      const cycle = Math.floor(beat / example.beats);
      return (cycle * length + localSeconds(beat - cycle * example.beats)) / ratio;
    },
    beat(seconds: number) {
      seconds = Math.max(0, seconds * ratio);
      const cycle = Math.floor(seconds / length);
      const local = seconds - cycle * length;
      const event = map.findLast((entry) => entry.seconds <= local)!;
      return cycle * example.beats + event.beat + ((local - event.seconds) * event.bpm) / 60;
    },
  };
}

export function positionLabel(example: MusicExample, beat: number) {
  if (beat >= example.beats)
    return `End · ${example.beats} ${example.beats === 1 ? 'beat' : 'beats'}`;
  const measure = measuresFor(example).find((bar) => beat >= bar.start && beat < bar.end)!;
  return `Bar ${measure.index + 1} · beat ${(((beat - measure.start) * measure.denominator) / 4 + 1).toFixed(1)}`;
}
