import {
  createCorpusFile,
  createCorpusSnapshot,
  hashCorpusContent,
  type CorpusSnapshot,
} from '@patternverse/sync-domain';
import type { LocalWorkspaceData } from '@patternverse/workspace';
import { applyCorpusChanges, type PersonalCorpusStore } from '@patternverse/remote-store';
import {
  parseSyncSnapshot,
  parseWorkspaceSyncSnapshot,
  type ParsedSyncSnapshot,
  type WorkspaceSyncSnapshot,
} from './sync-snapshot';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const segment = (id: string): string => encodeURIComponent(id);
const refKey = (ref: { sourceId: string; entityId: string }): string =>
  `${segment(ref.sourceId)}/${segment(ref.entityId)}`;
const json = (value: unknown): Uint8Array => encoder.encode(JSON.stringify(value));
const modernPath = (path: string): boolean =>
  !path.startsWith('entities/') && !path.startsWith('sessions/');

/** Virtual records, not extra Dropbox files. Feed the existing three-way planner without
 * treating a whole workspace as one conflict. Device ownership is never a synced record.
 * Legacy absence is unknown: retain modern fields from the last successful base, NOT
 * today's local snapshot (which would hide new local changes from the planner).
 */
export async function syncSnapshotToCorpus(
  input: ParsedSyncSnapshot,
  revision: string | null = null,
  legacyBase?: CorpusSnapshot,
): Promise<CorpusSnapshot> {
  const snapshot = parseSyncSnapshot(input);
  const records: [string, unknown][] = [
    ...snapshot.sessions.map((session): [string, unknown] => [
      `sessions/${segment(session.id)}.json`,
      { ...session, pendingReplyId: null },
    ]),
  ];
  const entities = snapshot.version === 1 ? snapshot.entities : snapshot.workspace.entities;
  records.push(
    ...entities.map((entity): [string, unknown] => [`entities/${segment(entity.id)}.json`, entity]),
  );
  if (snapshot.version === 2) {
    const data = snapshot.workspace;
    records.push(['workspace/name.json', { name: data.workspace.name }]);
    for (const [prefix, rows] of [
      ['saved', data.favorites],
      ['usefulness', data.usefulness],
    ] as const) {
      for (const row of rows) {
        const portable = Object.fromEntries(
          Object.entries(row).filter(([key]) => key !== 'workspaceId'),
        );
        records.push([`${prefix}/${refKey(row.ref)}.json`, portable]);
      }
    }
    for (const [prefix, rows] of [
      ['practice-runs', data.practiceRuns],
      ['situations', data.situations],
    ] as const) {
      for (const row of rows) {
        const portable = Object.fromEntries(
          Object.entries(row).filter(([key]) => key !== 'workspaceId'),
        );
        records.push([`${prefix}/${segment(row.id)}.json`, portable]);
      }
    }
  }
  const files = await Promise.all(
    records.map(([path, value]) => createCorpusFile(path, json(value))),
  );
  return createCorpusSnapshot({
    revision,
    files: [
      ...files,
      ...(snapshot.version === 1
        ? (legacyBase?.files.filter((file) => modernPath(file.path)) ?? [])
        : []),
    ],
  });
}

/** Reconstruct through the existing validators. A target device keeps its own identity;
 * references and rows are rebound to it. Reject unknown paths, altered IDs and corrupt
 * content rather than silently losing a record during conversion.
 */
export async function corpusToSyncSnapshot(
  corpus: CorpusSnapshot,
  identity: LocalWorkspaceData['workspace'],
): Promise<WorkspaceSyncSnapshot> {
  const data: Record<string, unknown[]> = {
    entities: [],
    favorites: [],
    usefulness: [],
    practiceRuns: [],
    situations: [],
    sessions: [],
  };
  let name = identity.name;
  const prefixes: Record<string, string> = {
    entities: 'entities',
    saved: 'favorites',
    usefulness: 'usefulness',
    'practice-runs': 'practiceRuns',
    situations: 'situations',
    sessions: 'sessions',
  };
  for (const file of createCorpusSnapshot(corpus).files) {
    if ((await hashCorpusContent(file.content)) !== file.contentHash)
      throw new Error('Sync record hash does not match its content.');
    const value: unknown = JSON.parse(decoder.decode(file.content));
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Invalid sync record.');
    const row = value as Record<string, unknown>;
    if (file.path === 'workspace/name.json') {
      if (typeof row.name !== 'string') throw new Error('Invalid workspace name.');
      name = row.name;
      continue;
    }
    const key = prefixes[file.path.split('/')[0] ?? ''];
    if (!key) throw new Error(`Unknown sync record: ${file.path}`);
    data[key]!.push(
      key === 'entities' || key === 'sessions' ? row : { ...row, workspaceId: identity.id },
    );
  }
  const snapshot = parseWorkspaceSyncSnapshot({
    version: 2,
    workspace: { ...data, workspace: { ...identity, name } },
    sessions: data.sessions,
  });
  const roundTrip = await syncSnapshotToCorpus(snapshot, corpus.revision);
  // An entirely empty remote is valid before first sync; otherwise name is mandatory.
  const expected =
    corpus.files.length === 0
      ? roundTrip.files.filter((file) => file.path !== 'workspace/name.json')
      : roundTrip.files;
  const original = createCorpusSnapshot(corpus).files;
  if (
    expected.length !== original.length ||
    expected.some(
      (file, index) =>
        file.path !== original[index]?.path || file.contentHash !== original[index]?.contentHash,
    )
  )
    throw new Error('Sync records do not match their canonical IDs or schema.');
  return snapshot;
}

/** The database adapter must commit changed records against `expected`, atomically per
 * database and recoverably across databases. This is not replaceFromBackup: a restore
 * does not check concurrent edits. A failed partial commit must be settled before reads.
 */
export function createWorkspaceCorpusStore(storage: {
  read: () => Promise<WorkspaceSyncSnapshot>;
  commit: (
    expected: WorkspaceSyncSnapshot,
    candidate: WorkspaceSyncSnapshot,
  ) => Promise<WorkspaceSyncSnapshot | void>;
}): PersonalCorpusStore {
  return {
    readSnapshot: async () => syncSnapshotToCorpus(await storage.read()),
    applyChanges: async (changes) => {
      const expected = parseWorkspaceSyncSnapshot(await storage.read());
      const next = applyCorpusChanges(await syncSnapshotToCorpus(expected), changes);
      const candidate = await corpusToSyncSnapshot(next, expected.workspace.workspace);
      const committed = await storage.commit(expected, candidate);
      return syncSnapshotToCorpus(committed ?? candidate);
    },
  };
}
