import { rawEntitySchema, type RawEntity } from '@patternverse/schema';
import type { Session } from '@patternverse/companion-core';
import type { LocalWorkspace, LocalWorkspaceData } from '@patternverse/workspace';
import { parseWorkspaceBackup } from '@patternverse/workspace/backup';
import {
  portableMiraSession,
  validateSession,
  type PrivateMiraStore,
} from '$lib/mira/private-store';
import {
  openSyncDocument,
  MAX_SYNC_DOCUMENT_BYTES,
  sealSyncDocument,
  type SyncEnvelope,
} from './sync-envelope';

export type LegacySyncSnapshot = Readonly<{
  version: 1;
  entities: readonly RawEntity[];
  sessions: readonly Session[];
}>;

/** The existing portable workspace model, not a second set of entity/run schemas. */
export type WorkspaceSyncSnapshot = Readonly<{
  version: 2;
  workspace: LocalWorkspaceData;
  sessions: readonly Session[];
}>;
export type ParsedSyncSnapshot = LegacySyncSnapshot | WorkspaceSyncSnapshot;

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('The sync snapshot has an unsupported format.');
  return value as Record<string, unknown>;
};
const unique = (ids: readonly string[]): void => {
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate IDs in sync snapshot.');
};

function sessions(value: unknown, portable: boolean): readonly Session[] {
  if (!Array.isArray(value) || value.length > 10000)
    throw new Error('Invalid or oversized synced conversation list.');
  const result = value.map((entry) => {
    const r = record(entry);
    if (typeof r.id !== 'string') throw new Error('Invalid synced conversation.');
    const session = validateSession(entry, r.id);
    // Explicit projection: validateSession historically accepts extra fields. Never serialize
    // settings, credentials, or arbitrary nested fields attached to a conversation.
    return {
      ...portableMiraSession(session),
      pendingReplyId: portable ? null : session.pendingReplyId,
    };
  });
  unique(result.map((entry) => entry.id));
  return result;
}

/** Validates the deployed v1 format; missing modern fields remain explicitly absent. */
export function parseLegacySyncSnapshot(value: unknown): LegacySyncSnapshot {
  const r = record(value);
  if (r.version !== 1 || !Array.isArray(r.entities) || r.entities.length > 10000)
    throw new Error('The Dropbox sync file has an unsupported format.');
  const entities = r.entities.map((entry) => rawEntitySchema.parse(entry));
  if (entities.some((entry) => entry.sourceId !== 'personal'))
    throw new Error('The Dropbox sync file contains an invalid personal library item.');
  unique(entities.map((entry) => entry.id));
  return { version: 1, entities, sessions: sessions(r.sessions, false) };
}

/** Reuse the backup validator's allowlist, ownership checks, and every existing record schema. */
export function parseWorkspaceSyncSnapshot(value: unknown): WorkspaceSyncSnapshot {
  const r = record(value);
  if (r.version !== 2) throw new Error('The sync snapshot has an unsupported version.');
  const data = record(r.workspace);
  const checked = parseWorkspaceBackup({
    ...data,
    format: 'patternverse-local-workspace',
    version: 1,
    exportedAt: '1970-01-01T00:00:00.000Z',
  });
  // v2 promises a complete workspace. Backup imports allow older optional lists, but sync
  // must not turn a truncated v2 snapshot into instructions to delete those lists.
  for (const field of ['practiceRuns', 'situations'])
    if (!Array.isArray(data[field])) throw new Error(`Sync snapshot is missing ${field}.`);
  const workspace: LocalWorkspaceData = {
    workspace: checked.workspace,
    entities: checked.entities,
    favorites: checked.favorites,
    usefulness: checked.usefulness,
    practiceRuns: checked.practiceRuns,
    situations: checked.situations,
  };
  return { version: 2, workspace, sessions: sessions(r.sessions, true) };
}

export function parseSyncSnapshot(value: unknown): ParsedSyncSnapshot {
  return record(value).version === 1
    ? parseLegacySyncSnapshot(value)
    : parseWorkspaceSyncSnapshot(value);
}

/** Capture only persisted, explicitly saved records; never read settings or live run caches. */
export async function captureWorkspaceSyncSnapshot(
  workspace: Pick<LocalWorkspace, 'readWorkspaceData'>,
  mira: Pick<PrivateMiraStore, 'list'>,
): Promise<WorkspaceSyncSnapshot> {
  const [data, savedSessions] = await Promise.all([workspace.readWorkspaceData(), mira.list()]);
  return parseWorkspaceSyncSnapshot({ version: 2, workspace: data, sessions: savedSessions });
}

export const LEGACY_MISSING_FIELDS = [
  'workspace',
  'favorites',
  'usefulness',
  'practiceRuns',
  'situations',
] as const;

/** Pure migration, NOT a merge or a database replacement. The fallback is explicit because
 * v1 never recorded workspace identity/preferences/history; absence is not a tombstone.
 * Later orchestration must retain this missing-field information during first-sync planning.
 */
export function migrateLegacySyncSnapshot(
  legacy: LegacySyncSnapshot,
  fallback: LocalWorkspaceData,
): Readonly<{
  snapshot: WorkspaceSyncSnapshot;
  inheritedFields: typeof LEGACY_MISSING_FIELDS;
}> {
  const checked = parseLegacySyncSnapshot(legacy);
  return {
    snapshot: parseWorkspaceSyncSnapshot({
      version: 2,
      workspace: { ...fallback, entities: checked.entities },
      sessions: checked.sessions,
    }),
    inheritedFields: LEGACY_MISSING_FIELDS,
  };
}

export function serializeWorkspaceSyncSnapshot(snapshot: WorkspaceSyncSnapshot): Uint8Array {
  const bytes = new TextEncoder().encode(JSON.stringify(parseWorkspaceSyncSnapshot(snapshot)));
  if (bytes.byteLength > MAX_SYNC_DOCUMENT_BYTES) throw new Error('The sync archive exceeds 8 MB.');
  return bytes;
}

export async function sealWorkspaceSyncSnapshot(
  snapshot: WorkspaceSyncSnapshot,
  key: CryptoKey,
  salt: string,
): Promise<SyncEnvelope<2>> {
  return sealSyncDocument(serializeWorkspaceSyncSnapshot(snapshot), key, salt, 2);
}

/** Reads authenticated v1/v2 envelopes without guessing a missing workspace identity. */
export async function openWorkspaceSyncSnapshot(
  envelope: SyncEnvelope,
  key: CryptoKey,
): Promise<ParsedSyncSnapshot> {
  const bytes = await openSyncDocument(envelope, key);
  const parsed = parseSyncSnapshot(
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)),
  );
  if (parsed.version !== envelope.version)
    throw new Error('Sync envelope and snapshot versions do not match.');
  return parsed;
}
