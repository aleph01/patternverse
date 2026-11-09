import type { Harmony, MusicExample, Note } from './model';

export type ChordLayer = {
  kind: 'base' | 'seventh' | 'ninth' | 'other';
  label: string;
  notes: string[];
};
export type DisplayChord = {
  start: number;
  kind?: 'tonal-centre';
  duration: number;
  root?: string;
  /** Root-relative identity, without inversion figures. */
  roman: string;
  romanLabel: string;
  name: string;
  bass?: string;
  inversion?: number;
  position: string;
  layers: ChordLayer[];
  source: 'notes' | 'symbol' | 'unknown';
  family: 'home' | 'preparation' | 'tension' | 'other';
  functionLabel: string;
};

const mod = (n: number) => ((n % 12) + 12) % 12;
const naturals: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pretty = (s: string) => s.replaceAll('#', '♯').replaceAll('b', '♭');
const plain = (s: string) => s.replaceAll('♯', '#').replaceAll('♭', 'b');
const pitchName = (s: string) => pretty(s.replace(/-?\d+$/, ''));
export function chordPitchClass(s: string): number | undefined {
  const match = /^([A-G])([#b♯♭]*)$/.exec(pitchName(s));
  if (!match) return;
  return mod(
    naturals[match[1]] + [...plain(match[2])].reduce((n, a) => n + (a === '#' ? 1 : -1), 0),
  );
}

/** Spell extensions by letter as well as sound (C7 needs B-flat, not A-sharp). */
function spell(root: string, steps: number, semitones: number): string {
  const letters = Object.keys(naturals);
  const letter = letters[(letters.indexOf(root[0]) + steps) % 7];
  let delta = mod(chordPitchClass(root)! + semitones - naturals[letter]);
  if (delta > 6) delta -= 12;
  return pretty(letter + (delta > 0 ? '#'.repeat(delta) : 'b'.repeat(-delta)));
}

/** Only these unambiguous symbols get a fallback spelling; unknown symbols stay unexpanded. */
function symbolNotes(root: string, suffix: string): string[] {
  const definitions: Record<string, number[]> = {
    '': [0, 4, 7],
    m: [0, 3, 7],
    min: [0, 3, 7],
    dim: [0, 3, 6],
    '°': [0, 3, 6],
    aug: [0, 4, 8],
    '+': [0, 4, 8],
    maj7: [0, 4, 7, 11],
    M7: [0, 4, 7, 11],
    '7': [0, 4, 7, 10],
    m7: [0, 3, 7, 10],
    min7: [0, 3, 7, 10],
    maj9: [0, 4, 7, 11, 2],
    M9: [0, 4, 7, 11, 2],
    '9': [0, 4, 7, 10, 2],
    m9: [0, 3, 7, 10, 2],
    add9: [0, 4, 7, 2],
    madd9: [0, 3, 7, 2],
  };
  return (definitions[suffix] ?? []).map((interval, i) =>
    spell(root, i < 3 ? i * 2 : interval === 2 ? 1 : 6, interval),
  );
}

function functionFor(roman: string, key: string): Pick<DisplayChord, 'family' | 'functionLabel'> {
  if (/^V\//.test(roman)) return { family: 'tension', functionLabel: 'Secondary dominant' };
  switch (roman) {
    case 'I':
    case 'i':
      return { family: 'home', functionLabel: 'Tonic' };
    case 'vi':
      return {
        family: 'home',
        functionLabel: key.includes('major') ? 'Relative minor' : 'Submediant',
      };
    case 'IV':
    case 'iv':
      return {
        family: 'preparation',
        functionLabel:
          roman === 'iv' && key.includes('major') ? 'Borrowed subdominant' : 'Subdominant',
      };
    case '♭VII':
      return {
        family: 'other',
        functionLabel: key.includes('major') ? 'Borrowed subtonic' : 'Subtonic',
      };
    case 'ii':
    case 'ii°':
      return { family: 'preparation', functionLabel: 'Supertonic' };
    case 'III':
      return { family: 'other', functionLabel: 'Mediant' };
    case 'VI':
      return { family: 'other', functionLabel: 'Submediant' };
    case 'VII':
      return { family: 'other', functionLabel: 'Subtonic' };
    case 'V':
    case 'v':
      return { family: 'tension', functionLabel: 'Dominant' };
    case 'vii°':
      return { family: 'tension', functionLabel: 'Leading-tone chord' };
    default:
      return { family: 'other', functionLabel: '' };
  }
}

function resolveChord(h: Harmony, duration: number, example: MusicExample): DisplayChord {
  if (h.kind === 'tonal-centre')
    return {
      start: h.start,
      duration,
      kind: h.kind,
      root: h.root,
      roman: h.roman,
      romanLabel: h.roman,
      name: h.name,
      position: 'Tonal centre',
      layers: [],
      source: 'unknown',
      family: 'home',
      functionLabel: 'Tonal centre',
    };
  const match = /^([A-G][#b♯♭]*)([^/]*)(?:\/([A-G][#b♯♭]*))?$/.exec(h.name);
  const root = h.root ? pitchName(h.root) : match ? pretty(match[1]) : undefined;
  const rootPc = root ? chordPitchClass(root) : undefined;
  const scope = h.parts ?? ['chords', 'accompaniment', 'bass'];
  // Read the voicing sounding at the chord onset, never a melody or percussion track.
  const sounding = example.notes
    .filter(
      (n) =>
        !n.drum &&
        !example.tracks?.find((t) => t.id === n.part)?.drum &&
        scope.includes(n.part) &&
        n.start <= h.start + 1e-7 &&
        n.start + n.duration > h.start + 1e-7,
    )
    .sort((a, b) => a.midi - b.midi);
  const fallback = root && rootPc !== undefined && match ? symbolNotes(root, match[2]) : [];
  const voicing =
    h.voicingWindow && h.voicingWindow > 0
      ? example.notes.filter(
          (n) =>
            !n.drum &&
            !example.tracks?.find((t) => t.id === n.part)?.drum &&
            scope.includes(n.part) &&
            (!fallback.length || fallback.some((tone) => chordPitchClass(tone) === mod(n.midi))) &&
            n.start >= h.start - 1e-7 &&
            n.start < h.start + Math.min(duration, h.voicingWindow!) - 1e-7,
        )
      : sounding;
  const tones = voicing.length
    ? [...new Map(voicing.map((n: Note) => [mod(n.midi), pitchName(n.pitch)])).values()]
    : fallback;
  const interval = (n: string) => mod(chordPitchClass(n)! - rootPc!);
  const sorted =
    rootPc === undefined ? tones : [...tones].sort((a, b) => interval(a) - interval(b));
  const has = (i: number) => sorted.some((n) => interval(n) === i);
  const third = has(4) ? 4 : has(3) ? 3 : undefined;
  const fifth = has(7) ? 7 : has(6) ? 6 : has(8) ? 8 : undefined;
  const seventh = has(11) ? 11 : has(10) ? 10 : undefined;
  const hasTriad = rootPc !== undefined && has(0) && third !== undefined && fifth !== undefined;
  const base = sorted.filter((n) => [0, third, fifth].includes(interval(n)));
  const sevenths = sorted.filter((n) => [10, 11].includes(interval(n)));
  // A suspended second is not automatically an added ninth: require a third.
  const ninths = third !== undefined ? sorted.filter((n) => interval(n) === 2) : [];
  const other = sorted.filter((n) => ![...base, ...sevenths, ...ninths].includes(n));
  let symbol = h.name.split('/')[0];
  if (hasTriad && !other.length && fifth === 7) {
    const quality = third === 3 ? 'm' : '';
    const extension =
      seventh === 11
        ? 'maj' + (ninths.length ? '9' : '7')
        : seventh === 10
          ? ninths.length
            ? '9'
            : '7'
          : ninths.length
            ? 'add9'
            : '';
    symbol = root + quality + extension;
  }
  const bassNotes = h.bassPart
    ? example.notes
        .filter(
          (n) =>
            n.part === h.bassPart &&
            !n.drum &&
            n.start <= h.start + 1e-7 &&
            n.start + n.duration > h.start + 1e-7,
        )
        .sort((a, b) => a.midi - b.midi)
    : sounding;
  const bass = bassNotes.length
    ? pitchName(bassNotes[0].pitch)
    : h.bassPart
      ? undefined
      : match?.[3]
        ? pretty(match[3])
        : root;
  const bassInterval = bass && rootPc !== undefined ? interval(bass) : undefined;
  const inversion = hasTriad
    ? [0, third, fifth, seventh].findIndex((n) => n !== undefined && n === bassInterval)
    : -1;
  const position =
    bass === undefined
      ? 'Bass not sounding'
      : inversion === 0
        ? 'Root position'
        : inversion === 1
          ? 'First inversion'
          : inversion === 2
            ? 'Second inversion'
            : inversion === 3
              ? 'Third inversion'
              : hasTriad
                ? bassInterval === 2 && ninths.length
                  ? 'Ninth in bass'
                  : bassInterval === 9 && has(9)
                    ? 'Added sixth in bass'
                    : 'Non-chord bass'
                : 'Inversion not determined';
  // Keep identity independent of the bass and replace any legacy inversion figures.
  const [primary, ...secondary] = h.roman.split('/');
  const romanRoot = /^([♭♯b#]*[ivIV]+[°ø+]?)/.exec(primary)?.[1] ?? primary;
  const applied = secondary.length ? `/${secondary.join('/')}` : '';
  const roman = romanRoot + applied;
  const hasNinth = ninths.length > 0;
  const figure = hasNinth
    ? seventh !== undefined
      ? '⁹'
      : '(add9)'
    : seventh !== undefined
      ? (['⁷', '⁶₅', '⁴₃', '⁴₂'][inversion] ?? '⁷')
      : (['', '⁶', '⁶₄'][inversion] ?? '');
  const layers: ChordLayer[] = [];
  if (base.length)
    layers.push({ kind: 'base', label: hasTriad ? 'Base triad' : 'Base notes', notes: base });
  if (sevenths.length)
    layers.push({
      kind: 'seventh',
      label: seventh === 11 ? 'Major seventh' : 'Minor seventh',
      notes: sevenths,
    });
  if (ninths.length) layers.push({ kind: 'ninth', label: 'Added ninth', notes: ninths });
  if (other.length) layers.push({ kind: 'other', label: 'Other notes', notes: other });
  return {
    start: h.start,
    duration,
    root,
    roman,
    romanLabel: romanRoot ? romanRoot + (seventh === 11 ? 'maj' : '') + figure + applied : '',
    name:
      pretty(symbol) +
      (bass && rootPc !== undefined && chordPitchClass(bass) !== rootPc ? `/${bass}` : ''),
    bass,
    inversion: inversion >= 0 ? inversion : undefined,
    position,
    layers,
    source: voicing.length ? 'notes' : fallback.length ? 'symbol' : 'unknown',
    ...functionFor(roman, example.key),
  };
}

/** One derived model serves the compact ribbon and piano-roll chord lane. */
export function displayChords(example: MusicExample): DisplayChord[] {
  const harmony = [...(example.harmony ?? [])].sort((a, b) => a.start - b.start);
  return harmony
    .filter((h) => Number.isFinite(h.start) && h.start >= 0 && h.start < example.beats)
    .map((h, i, valid) => {
      const boundary = valid[i + 1]?.start ?? example.beats;
      const duration =
        Number.isFinite(h.duration) && h.duration! > 0 ? h.duration! : boundary - h.start;
      return resolveChord(h, Math.min(duration, example.beats - h.start), example);
    })
    .filter((h) => h.duration > 0);
}

/** All rows stretch together, keeping short chords readable without falsifying their duration. */
export function chordTimelineMinimum(chords: DisplayChord[], start: number, end: number): number {
  const lengths = chords
    .filter((h) => h.start < end && h.start + h.duration > start)
    .map((h) => Math.min(end, h.start + h.duration) - Math.max(start, h.start));
  return lengths.length ? Math.ceil(((end - start) / Math.min(...lengths)) * 100) : 0;
}
