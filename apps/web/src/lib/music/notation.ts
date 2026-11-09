import type * as Vex from 'vexflow';
import type { MusicExample } from './model';
import { tracksFor } from './model';
import type { Measure } from './timing';
import { scoreVoices, splitRhythm } from './score';

export type ScoreMarker = {
  start: number;
  end: number;
  line: SVGLineElement;
  xs: number[];
  starts: number[];
  right: number;
};

/** VexFlow exclusively owns the contents of this otherwise empty rendering node. */
export function drawNotation(
  container: HTMLDivElement,
  VF: typeof Vex,
  data: MusicExample,
  measures: Measure[],
  enabled: string[],
  width: number,
): ScoreMarker[] {
  container.replaceChildren();
  const tracks = tracksFor(data).filter((track) => enabled.includes(track.id));
  if (!tracks.length) return [];
  if (tracks.length > 8)
    throw new Error(
      'Isolate up to eight parts for a readable score. All parts remain available in the piano roll.',
    );
  const columns = width >= 620 ? 2 : 1,
    staffHeight = 116,
    rowHeight = tracks.length * staffHeight + 24;
  const height = Math.ceil(measures.length / columns) * rowHeight,
    cellWidth = (width - 12) / columns;
  const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();
  ctx.setFillStyle('currentColor').setStrokeStyle('currentColor');
  const markers: ScoreMarker[] = [],
    pendingTies = new Map<string, { note: Vex.StaveNote; index: number; end: number }>();
  for (const [index, bar] of measures.entries()) {
    const x = 6 + (index % columns) * cellWidth,
      y = Math.floor(index / columns) * rowHeight;
    const entries = tracks.map((track, trackIndex) => {
      const cy = y + trackIndex * staffHeight,
        pitched = data.notes.filter((n) => n.part === track.id);
      const clef = track.drum
        ? 'percussion'
        : pitched.reduce((sum, n) => sum + n.midi, 0) / Math.max(1, pitched.length) < 60
          ? 'bass'
          : 'treble';
      const stave = new VF.Stave(x, cy, cellWidth);
      if (index % columns === 0)
        stave.addClef(clef).addTimeSignature(`${bar.numerator}/${bar.denominator}`);
      else if (
        measures[index - 1].numerator !== bar.numerator ||
        measures[index - 1].denominator !== bar.denominator
      )
        stave.addTimeSignature(`${bar.numerator}/${bar.denominator}`);
      const tuplets: Vex.Tuplet[] = [],
        ties: Vex.StaveTie[] = [],
        beams: Vex.Beam[] = [],
        positions: { note: Vex.StaveNote; start: number }[] = [];
      const voices = scoreVoices(data, track, bar).map((events, voiceIndex) => {
        const pieces = events.flatMap(splitRhythm),
          notes: Vex.StaveNote[] = [],
          triplets: Vex.StaveNote[] = [];
        let tripletDuration = 0;
        for (const piece of pieces) {
          const keys = piece.pitches.length
            ? piece.pitches.map((pitch) => {
                const match = /^([A-G])([#b]*)(-?\d+)$/.exec(pitch);
                if (!match) throw new Error('This pitch spelling needs review before notation.');
                return `${match[1].toLowerCase()}${match[2]}/${match[3]}${track.drum === 'hat' ? '/x2' : ''}`;
              })
            : [clef === 'bass' ? 'd/3' : 'b/4'];
          const note = new VF.StaveNote({
            clef,
            keys,
            duration: piece.value + (piece.pitches.length ? '' : 'r'),
            stem_direction: voiceIndex % 2 ? -1 : 1,
          }).setStave(stave);
          for (let dot = 0; dot < piece.dots; dot++) VF.Dot.buildAndAttach([note], { all: true });
          // Chords can change size, and MIDI voice assignment can change at a barline.
          // Match the actual continuing pitch rather than tying whole voice/chord indices.
          for (const [pitchIndex, pitch] of piece.pitches.entries()) {
            const key = `${track.id}:${pitch}`,
              prev = pendingTies.get(key);
            if (piece.tieFrom && prev && Math.abs(prev.end - piece.start) < 0.002) {
              if (prev.note.getStave()?.getY() !== stave.getY()) {
                ties.push(
                  new VF.StaveTie({
                    first_note: prev.note,
                    first_indices: [prev.index],
                    last_indices: [pitchIndex],
                  }),
                  new VF.StaveTie({
                    last_note: note,
                    first_indices: [prev.index],
                    last_indices: [pitchIndex],
                  }),
                );
              } else
                ties.push(
                  new VF.StaveTie({
                    first_note: prev.note,
                    last_note: note,
                    first_indices: [prev.index],
                    last_indices: [pitchIndex],
                  }),
                );
            }
            if (piece.tieTo)
              pendingTies.set(key, { note, index: pitchIndex, end: piece.start + piece.duration });
            else pendingTies.delete(key);
          }
          notes.push(note);
          positions.push({ note, start: piece.start });
          if (piece.triplet) {
            triplets.push(note);
            tripletDuration += piece.duration;
            if (Math.abs(tripletDuration - Math.round(tripletDuration)) < 0.002) {
              tuplets.push(new VF.Tuplet([...triplets], { num_notes: 3, notes_occupied: 2 }));
              triplets.length = 0;
              tripletDuration = 0;
            }
          } else if (triplets.length)
            throw new Error(
              'This incomplete tuplet needs reviewed score annotation. Follow the piano roll for now.',
            );
        }
        if (triplets.length)
          throw new Error(
            'This incomplete tuplet needs reviewed score annotation. Follow the piano roll for now.',
          );
        beams.push(
          ...VF.Beam.generateBeams(notes, {
            maintain_stem_directions: true,
            groups: [new VF.Fraction(bar.denominator === 8 ? 3 : 1, bar.denominator === 8 ? 8 : 4)],
          }),
        );
        return new VF.Voice({ num_beats: bar.numerator, beat_value: bar.denominator })
          .setMode(VF.Voice.Mode.SOFT)
          .addTickables(notes);
      });
      if (!track.drum) VF.Accidental.applyAccidentals(voices, 'C');
      return { track, stave, cy, voices, tuplets, ties, beams, positions };
    });
    // All staves share tick contexts: equal musical times must align vertically.
    const noteStart = Math.max(...entries.map((entry) => entry.stave.getNoteStartX()));
    const formatter = new VF.Formatter();
    for (const entry of entries) {
      entry.stave.setNoteStartX(noteStart);
      entry.stave.setContext(ctx).draw();
      formatter.joinVoices(entry.voices);
    }
    formatter.formatToStave(
      entries.flatMap((entry) => entry.voices),
      entries[0].stave,
    );
    for (const entry of entries) {
      if (index % columns === 0) {
        ctx.setFont('Arial', 11);
        ctx.fillText(entry.track.label, x + 4, entry.cy + 13);
      }
      entry.voices.forEach((voice) => voice.draw(ctx, entry.stave));
      entry.beams.forEach((beam) => beam.setContext(ctx).draw());
      entry.tuplets.forEach((tuplet) => tuplet.setContext(ctx).draw());
      entry.ties.forEach((tie) => tie.setContext(ctx).draw());
    }
    const positions = [
      ...new Map(
        entries.flatMap((entry) => entry.positions).map((entry) => [entry.start, entry]),
      ).values(),
    ].sort((a, b) => a.start - b.start);
    const svg = container.querySelector('svg')!,
      line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('score-playhead');
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('opacity', '.45');
    line.setAttribute('y1', String(y + 25));
    line.setAttribute('y2', String(y + tracks.length * staffHeight - 20));
    line.setAttribute('visibility', 'hidden');
    svg.appendChild(line);
    markers.push({
      start: bar.start,
      end: bar.end,
      line,
      xs: positions.map((p) => p.note.getAbsoluteX()),
      starts: positions.map((p) => p.start),
      right: entries[0].stave.getNoteEndX(),
    });
  }
  const svg = container.querySelector('svg')!;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute(
    'aria-label',
    `${data.title}, bars ${measures[0].index + 1} to ${measures.at(-1)!.index + 1}, musical notation`,
  );
  return markers;
}
