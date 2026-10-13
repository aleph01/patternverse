import type { LocalWorkspaceData } from '@patternverse/workspace';
import { hashCorpusContent } from '@patternverse/sync-domain';
import type { RemoteCorpusError } from '@patternverse/remote-store';
import {
  createDropboxArchiveClient,
  DROPBOX_LEGACY_PATH,
  DROPBOX_WORKSPACE_PATH,
} from './dropbox-workspace-store';
import type { SyncEnvelope } from './sync-envelope';
import {
  openWorkspaceSyncSnapshot,
  migrateLegacySyncSnapshot,
  sealWorkspaceSyncSnapshot,
  type LegacySyncSnapshot,
} from './sync-snapshot';

type Client = ReturnType<typeof createDropboxArchiveClient>;
type Marker = {
  version: 2;
  type: 'patternverse-sync-upgrade';
  target: typeof DROPBOX_WORKSPACE_PATH;
  sourceRevision: string;
  backupPath: string;
  checksum: string;
  salt: string;
};
export type DropboxUpgradeSource = {
  revision: string;
  sourceRevision: string;
  backupPath: string;
  checksum: string;
  envelope: SyncEnvelope<1>;
  marker: Marker | null;
};
export class DropboxUpgradeError extends Error {
  constructor(readonly remoteError: RemoteCorpusError) {
    super(remoteError.type);
  }
}
const fail = (details: string): never => {
  throw new DropboxUpgradeError({ type: 'invalid-remote-corpus', details });
};
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return fail('The legacy archive or upgrade marker is invalid.');
  return value as Record<string, unknown>;
};
const backupPath = (rev: string) => `/patternverse-sync-v1-backup-${rev}.json`;
const checksum = (envelope: SyncEnvelope<1>) =>
  hashCorpusContent(new TextEncoder().encode(JSON.stringify(envelope)));
function envelope(value: unknown): SyncEnvelope<1> {
  const r = object(value);
  if (
    r.version !== 1 ||
    typeof r.salt !== 'string' ||
    typeof r.iv !== 'string' ||
    typeof r.data !== 'string'
  )
    return fail('The legacy archive has an unsupported format. Nothing was replaced.');
  return { version: 1, salt: r.salt, iv: r.iv, data: r.data };
}
function marker(value: unknown): Marker {
  const r = object(value);
  if (
    r.version !== 2 ||
    r.type !== 'patternverse-sync-upgrade' ||
    r.target !== DROPBOX_WORKSPACE_PATH ||
    typeof r.sourceRevision !== 'string' ||
    !/^[a-zA-Z0-9]{1,256}$/.test(r.sourceRevision) ||
    r.backupPath !== backupPath(r.sourceRevision) ||
    typeof r.checksum !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/.test(r.checksum) ||
    typeof r.salt !== 'string'
  )
    return fail(
      'The upgrade marker is invalid. Restore or inspect the original backup before continuing.',
    );
  return {
    version: 2,
    type: 'patternverse-sync-upgrade',
    target: DROPBOX_WORKSPACE_PATH,
    sourceRevision: r.sourceRevision,
    backupPath: r.backupPath as string,
    checksum: r.checksum,
    salt: r.salt,
  };
}
async function read(client: Client, path: string) {
  const response = await client.read(path);
  if (!response.ok) throw new DropboxUpgradeError(response.error);
  return response.value;
}
async function verifiedBackup(
  client: Client,
  source: Pick<DropboxUpgradeSource, 'backupPath' | 'checksum' | 'envelope'>,
) {
  const backup = await read(client, source.backupPath);
  if (!backup || (await checksum(envelope(backup.body))) !== source.checksum)
    fail('The encrypted legacy backup could not be verified. The upgrade is paused.');
}

/** Reads only. A parked upgrade can be resumed from any device with the sync phrase. */
export async function readDropboxUpgradeSource(client: Client): Promise<DropboxUpgradeSource> {
  const original = await read(client, DROPBOX_LEGACY_PATH);
  if (!original) return fail('The legacy archive changed. Review the upgrade again.');
  const value = object(original.body);
  if (value.version === 1) {
    const sealed = envelope(value);
    return {
      revision: original.revision,
      sourceRevision: original.revision,
      backupPath: backupPath(original.revision),
      checksum: await checksum(sealed),
      envelope: sealed,
      marker: null,
    };
  }
  const parked = marker(value),
    backup = await read(client, parked.backupPath);
  if (!backup) return fail('The upgrade backup is missing. No new archive was created.');
  const sealed = envelope(backup.body);
  if (sealed.salt !== parked.salt || (await checksum(sealed)) !== parked.checksum)
    return fail('The encrypted upgrade backup does not match its marker.');
  return { ...parked, revision: original.revision, envelope: sealed, marker: parked };
}

/** Original ciphertext is backed up before parking v1. Every write uses strict CAS.
 * There is intentionally no delete, overwrite mode, or local-record replacement here.
 */
export async function upgradeDropboxArchive(options: {
  client: Client;
  source: DropboxUpgradeSource;
  legacy: LegacySyncSnapshot;
  key: CryptoKey;
  identity: LocalWorkspaceData['workspace'];
}): Promise<void> {
  const { client, source, key } = options;
  const parked: Marker = source.marker ?? {
    version: 2,
    type: 'patternverse-sync-upgrade',
    target: DROPBOX_WORKSPACE_PATH,
    sourceRevision: source.sourceRevision,
    backupPath: source.backupPath,
    checksum: source.checksum,
    salt: source.envelope.salt,
  };
  if (!source.marker) {
    const saved = await client.write(source.backupPath, null, source.envelope);
    if (!saved.ok && saved.error.type !== 'revision-conflict')
      throw new DropboxUpgradeError(saved.error);
    await verifiedBackup(client, source);
    const parkedResult = await client.write(DROPBOX_LEGACY_PATH, source.revision, parked);
    if (!parkedResult.ok) throw new DropboxUpgradeError(parkedResult.error);
  }
  // Re-verify remote recovery material before creating v2, including on restart.
  await verifiedBackup(client, source);
  const current = await read(client, DROPBOX_LEGACY_PATH);
  if (!current || JSON.stringify(marker(current.body)) !== JSON.stringify(parked))
    return fail('The legacy archive changed during upgrade. Review it again.');
  const empty = {
    workspace: options.identity,
    entities: [],
    favorites: [],
    usefulness: [],
    practiceRuns: [],
    situations: [],
  };
  const portable = migrateLegacySyncSnapshot(options.legacy, empty).snapshot;
  const written = await client.write(
    DROPBOX_WORKSPACE_PATH,
    null,
    await sealWorkspaceSyncSnapshot(portable, key, source.envelope.salt),
  );
  if (!written.ok && written.error.type !== 'revision-conflict')
    throw new DropboxUpgradeError(written.error);
  // A competing upgraded device may have created v2. Never overwrite it or assume
  // our upload won; validate and leave its content to the regular three-way engine.
  const upgraded = await read(client, DROPBOX_WORKSPACE_PATH);
  if (!upgraded) return fail('The upgraded archive could not be verified. Retry to resume.');
  const opened = await openWorkspaceSyncSnapshot(object(upgraded.body) as SyncEnvelope, key);
  if (opened.version !== 2 || object(upgraded.body).salt !== source.envelope.salt)
    return fail('The new archive has a different key or format. The original backup was kept.');
  const finalMarker = await read(client, DROPBOX_LEGACY_PATH);
  if (!finalMarker || JSON.stringify(marker(finalMarker.body)) !== JSON.stringify(parked))
    return fail('The legacy upgrade marker changed. Inspect both archives before syncing.');
}
