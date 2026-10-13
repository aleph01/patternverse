import { entityIdSchema, entityRefSchema, type EntityRef } from '@patternverse/schema';

/** Private run data, never a public article or a source of executable semantics. */
export type PracticeResponse = Readonly<{ id: string; prompt: string; answer: string }>;
export type PracticeRunInput = Readonly<{
  id: string;
  patternRef: EntityRef;
  patternType: 'pattern' | 'practice';
  patternTitle: string;
  title: string;
  verseIds: readonly string[];
  origin: 'patternverse' | 'chatgpt';
  status: 'in-progress' | 'completed' | 'stopped';
  revision: number;
  responses: readonly PracticeResponse[];
  /** Source checkpoints are replay-validated by the existing runtime before resuming. */
  checkpoint?: string;
}>;
export type SavedPracticeRun = PracticeRunInput &
  Readonly<{
    workspaceId: string;
    createdAt: string;
    updatedAt: string;
  }>;
export const MAX_PRACTICE_ARCHIVE_BYTES = 3 * 1024 * 1024;

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid practice response file.');
  return value as Record<string, unknown>;
};
const text = (value: unknown, limit: number, allowEmpty = false): string => {
  if (typeof value !== 'string' || value.length > limit || (!allowEmpty && !value.trim()))
    throw new Error('Invalid or oversized practice text.');
  return value;
};
const member = <T extends string>(value: unknown, options: readonly T[]): T => {
  if (typeof value !== 'string' || !options.includes(value as T))
    throw new Error('Invalid practice metadata.');
  return value as T;
};

/** Explicit projection drops unknown fields, workspace ownership and device identity. */
export function parsePracticeRun(value: unknown): PracticeRunInput {
  const r = record(value);
  if (!Number.isSafeInteger(r.revision) || Number(r.revision) < 0)
    throw new Error('Invalid practice revision.');
  if (
    !Array.isArray(r.responses) ||
    r.responses.length > 2000 ||
    !Array.isArray(r.verseIds) ||
    r.verseIds.length > 100
  )
    throw new Error('Invalid practice responses or verses.');
  const responses = r.responses.map((value) => {
    const a = record(value);
    return {
      id: text(a.id, 300),
      prompt: text(a.prompt, 100000, true),
      answer: text(a.answer, 100000, true),
    };
  });
  if (new Set(responses.map((a) => a.id)).size !== responses.length)
    throw new Error('Duplicate practice response IDs.');
  const result: PracticeRunInput = {
    id: text(r.id, 120),
    patternRef: entityRefSchema.parse(r.patternRef),
    patternType: member(r.patternType, ['pattern', 'practice']),
    patternTitle: text(r.patternTitle, 300),
    title: text(r.title, 120),
    verseIds: [...new Set(r.verseIds.map((id) => entityIdSchema.parse(id)))],
    origin: member(r.origin, ['patternverse', 'chatgpt']),
    status: member(r.status, ['in-progress', 'completed', 'stopped']),
    revision: Number(r.revision),
    responses,
    ...(r.checkpoint === undefined ? {} : { checkpoint: text(r.checkpoint, 2 * 1024 * 1024) }),
  };
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > MAX_PRACTICE_ARCHIVE_BYTES)
    throw new Error('Practice response file is too large.');
  return result;
}

export function serializePracticeArchive(run: PracticeRunInput): string {
  const serialized = JSON.stringify(
    { format: 'patternverse-practice-run', version: 1, run: parsePracticeRun(run) },
    null,
    2,
  );
  if (new TextEncoder().encode(serialized).byteLength > MAX_PRACTICE_ARCHIVE_BYTES)
    throw new Error('Practice response file is too large.');
  return serialized;
}
export function parsePracticeArchive(serialized: string): PracticeRunInput {
  if (new TextEncoder().encode(serialized).byteLength > MAX_PRACTICE_ARCHIVE_BYTES)
    throw new Error('Practice response file is too large.');
  const archive = record(JSON.parse(serialized));
  if (archive.format !== 'patternverse-practice-run' || archive.version !== 1)
    throw new Error('Choose a Patternverse practice response file (version 1).');
  return parsePracticeRun(archive.run);
}
export function practiceRunText(run: PracticeRunInput): string {
  return [
    run.title,
    run.patternTitle,
    '',
    ...run.responses.flatMap((r) => [r.prompt, r.answer, '']),
  ].join('\n');
}
export function searchPracticeRuns(
  runs: readonly SavedPracticeRun[],
  query: string,
  verseId = '',
  status = '',
): readonly SavedPracticeRun[] {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return runs
    .filter(
      (run) =>
        (!verseId || run.verseIds.includes(verseId)) &&
        (!status || run.status === status) &&
        terms.every((term) => practiceRunText(run).toLocaleLowerCase().includes(term)),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
}
