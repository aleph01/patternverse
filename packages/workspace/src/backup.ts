import {
  entityRefKey,
  entityRefSchema,
  rawEntitySchema,
  usefulnessSchema,
} from '@patternverse/schema';
import { decode, encode } from 'cborg';
import type { LocalWorkspaceData } from './ownership.js';
import { parseSituation } from './situations.js';
import { parsePracticeRun } from './practice-history.js';

export const MAX_WORKSPACE_BACKUP_BYTES = 50 * 1024 * 1024;
export const WORKSPACE_BACKUP_FILENAME = 'patternverse-workspace-backup.cbor';
export type WorkspaceBackup = LocalWorkspaceData &
  Readonly<{
    format: 'patternverse-local-workspace';
    version: 1;
    exportedAt: string;
  }>;

const record = (value: unknown): Record<string, unknown> => {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
  )
    throw new Error('Invalid workspace backup object.');
  return value as Record<string, unknown>;
};
const text = (value: unknown, limit = 120): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > limit)
    throw new Error('Invalid workspace backup text.');
  return value;
};
const date = (value: unknown): string => {
  const result = text(value, 40);
  if (!Number.isFinite(Date.parse(result))) throw new Error('Invalid backup date.');
  return result;
};
const rows = (value: unknown): unknown[] => {
  if (!Array.isArray(value) || value.length > 10000)
    throw new Error('Invalid or oversized backup list (maximum 10,000 records per list).');
  return value;
};
const unique = (keys: readonly string[]) => {
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate records in workspace backup.');
};

/** One validator for file preview and database replacement. Never imports device identity or secrets. */
export function parseWorkspaceBackup(value: unknown): WorkspaceBackup {
  const r = record(value);
  if (r.format !== 'patternverse-local-workspace' || r.version !== 1)
    throw new Error('Choose a supported Patternverse workspace backup (version 1).');
  const w = record(r.workspace);
  if (w.kind !== 'personal' || w.visibility !== 'private')
    throw new Error('Only private personal workspace backups can be restored.');
  const workspace: LocalWorkspaceData['workspace'] = {
    id: text(w.id),
    name: text(w.name),
    kind: 'personal',
    visibility: 'private',
    createdAt: date(w.createdAt),
  };
  const entities = rows(r.entities).map((value) => {
    const entity = rawEntitySchema.parse(value);
    if (entity.sourceId !== 'personal')
      throw new Error('A backup cannot replace public library content.');
    return entity;
  });
  const favorites = rows(r.favorites).map((value) => {
    const row = record(value);
    if (row.workspaceId !== workspace.id) throw new Error('Mixed workspace ownership in backup.');
    return {
      workspaceId: workspace.id,
      ref: entityRefSchema.parse(row.ref),
      createdAt: date(row.createdAt),
    };
  });
  const usefulness = rows(r.usefulness).map((value) => {
    const row = record(value);
    if (row.workspaceId !== workspace.id) throw new Error('Mixed workspace ownership in backup.');
    const rating = usefulnessSchema.parse(row.usefulness);
    if (rating === null) throw new Error('Invalid saved usefulness rating.');
    return {
      workspaceId: workspace.id,
      ref: entityRefSchema.parse(row.ref),
      usefulness: rating,
      updatedAt: date(row.updatedAt),
    };
  });
  // Original exports predating practice history did not include this list.
  const practiceRuns = rows(r.practiceRuns === undefined ? [] : r.practiceRuns).map((value) => {
    const row = record(value);
    if (row.workspaceId !== workspace.id) throw new Error('Mixed workspace ownership in backup.');
    return {
      ...parsePracticeRun(row),
      workspaceId: workspace.id,
      createdAt: date(row.createdAt),
      updatedAt: date(row.updatedAt),
    };
  });
  const situations = rows(r.situations === undefined ? [] : r.situations).map((value) => {
    const situation = parseSituation(value);
    if (situation.workspaceId !== workspace.id)
      throw new Error('Mixed workspace ownership in backup.');
    return situation;
  });
  unique(situations.map((s) => s.id));
  unique(entities.map((e) => e.id));
  unique(favorites.map((f) => entityRefKey(f.ref)));
  unique(usefulness.map((u) => entityRefKey(u.ref)));
  unique(practiceRuns.map((run) => run.id));
  // Relationships and historical runs can legitimately reference Commons or removed articles.
  // Preserve those references; do not invent records or rewrite Pattern Language checkpoints.
  return {
    format: r.format,
    version: r.version,
    exportedAt: date(r.exportedAt),
    workspace,
    entities,
    favorites,
    usefulness,
    practiceRuns,
    situations,
  };
}

export function createWorkspaceBackup(
  data: LocalWorkspaceData,
  exportedAt = new Date().toISOString(),
): WorkspaceBackup {
  return parseWorkspaceBackup({
    ...data,
    format: 'patternverse-local-workspace',
    version: 1,
    exportedAt,
  });
}

export function encodeWorkspaceBackup(backup: WorkspaceBackup): Uint8Array<ArrayBuffer> {
  // JSON projection drops optional undefined properties, keeping standard, extension-free CBOR.
  const bytes = encode(JSON.parse(JSON.stringify(parseWorkspaceBackup(backup))));
  if (bytes.byteLength > MAX_WORKSPACE_BACKUP_BYTES)
    throw new Error('Workspace backup exceeds 50 MB.');
  return new Uint8Array(bytes);
}

/** Detect format by content, not the filename. Reject trailing bytes and non-JSON CBOR extensions. */
export function decodeWorkspaceBackup(bytes: Uint8Array): WorkspaceBackup {
  if (!bytes.byteLength || bytes.byteLength > MAX_WORKSPACE_BACKUP_BYTES)
    throw new Error('Choose a workspace backup smaller than 50 MB.');
  let value: unknown;
  try {
    const prefix = new TextDecoder()
      .decode(bytes.subarray(0, 32))
      .replace(/^\uFEFF/, '')
      .trimStart();
    value = prefix.startsWith('{')
      ? JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
      : decode(new Uint8Array(bytes), {
          allowIndefinite: false,
          allowUndefined: false,
          allowBigInt: false,
          allowInfinity: false,
          allowNaN: false,
          rejectDuplicateMapKeys: true,
          strict: true,
        });
  } catch {
    throw new Error('This backup is unreadable or damaged. No workspace data has been changed.');
  }
  return parseWorkspaceBackup(value);
}
