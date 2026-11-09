import type { Note } from './model';

/** Choose the coarsest grid that can represent this bar's actual drum attacks. */
export function drumSubdivision(notes: Note[], start: number, end: number): number {
  const hits = notes.filter((n) => n.drum && n.start >= start && n.start < end);
  return (
    [2, 3, 4, 6, 8, 12].find((divisions) =>
      hits.every(
        (n) =>
          Math.abs(n.start - start - Math.round((n.start - start) * divisions) / divisions) < 0.015,
      ),
    ) ?? 12
  );
}
export function subdivisionLabel(divisions: number): string {
  return (
    {
      2: 'Eighth-note steps',
      3: 'Triplet grid',
      4: 'Sixteenth-note steps',
      6: 'Sixteenth-note triplets',
      8: 'Thirty-second-note steps',
      12: 'Mixed sixteenths & triplets',
    } as Record<number, string>
  )[divisions];
}
export function subdivisionCount(position: number, divisions: number): string {
  const step = Math.round(position * divisions);
  if (step % divisions === 0) return String(Math.floor(position) + 1);
  if (divisions === 2) return '&';
  if (divisions === 4) return ['', 'e', '&', 'a'][step % 4];
  if (divisions === 3) return step % 3 === 1 ? '⅓' : '⅔';
  const twelfths: Record<number, string> = {
    2: '⅙',
    3: '¼',
    4: '⅓',
    6: '½',
    8: '⅔',
    9: '¾',
    10: '⅚',
  };
  if (divisions === 12) return twelfths[step % 12] ?? '·';
  if (divisions === 6) return twelfths[(step % 6) * 2];
  return ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞'][step % 8];
}
