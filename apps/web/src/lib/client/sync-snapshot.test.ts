import { webcrypto } from 'node:crypto';
import fc from 'fast-check';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession } from '@patternverse/companion-core';
import {
  createIndexedDbWorkspace,
  type LocalWorkspaceData,
  type RawEntity,
} from '@patternverse/workspace';
import { createWorkspaceBackup } from '@patternverse/workspace/backup';
import { createPrivateMiraStore } from '$lib/mira/private-store';
import {
  captureWorkspaceSyncSnapshot,
  LEGACY_MISSING_FIELDS,
  migrateLegacySyncSnapshot,
  openWorkspaceSyncSnapshot,
  parseSyncSnapshot,
  parseWorkspaceSyncSnapshot,
  sealWorkspaceSyncSnapshot,
  serializeWorkspaceSyncSnapshot,
  type WorkspaceSyncSnapshot,
} from './sync-snapshot';
import {
  deriveSyncKey,
  MAX_SYNC_DOCUMENT_BYTES,
  openSyncDocument,
  sealSyncDocument,
  syncBase64,
  syncUnbase64,
} from './sync-envelope';

const DATE = '2026-10-09T10:00:00.000Z';
const SALT = syncBase64(new Uint8Array(16).fill(37));
const encoder = new TextEncoder();
const decode = (bytes: Uint8Array) => JSON.parse(new TextDecoder().decode(bytes));
const properties = { numRuns: 100, seed: 20261009 };
const text = fc
  .array(fc.constantFrom('a', ' ', '\n', 'é', '🌿', '中', '"', '\\', '#'), { maxLength: 35 })
  .map((chars) => chars.join(''));
const label = text.map((value) => `Reflection ${value}`.trim());
const id = fc.nat({ max: 100000 }).map((n) => `item-${n}`);
const ref = fc.record({
  sourceId: fc.constantFrom('commons', 'personal', 'other-source'),
  entityId: id,
});
const entity = fc
  .tuple(
    id,
    label,
    text,
    fc.constantFrom('pattern', 'concept', 'practice', 'collection', 'verse'),
    fc.constantFrom('draft', 'published', 'deprecated'),
  )
  .map(
    ([id, title, body, type, status]): RawEntity =>
      ({
        id,
        sourceId: 'personal',
        type,
        title,
        body,
        status,
        ...(type === 'collection'
          ? { items: ['item-1', 'removed-pattern'], verses: ['home'] }
          : type === 'verse'
            ? {}
            : { verses: ['home'] }),
        tags: ['reflect'],
        aliases: ['A different name'],
        attribution: 'A book',
      }) as RawEntity,
  );
const workspaceArbitrary = fc
  .record({
    name: label,
    entities: fc.uniqueArray(entity, { maxLength: 7, selector: (e) => e.id }),
    favorites: fc.uniqueArray(ref, {
      maxLength: 5,
      selector: (r) => `${r.sourceId}:${r.entityId}`,
    }),
    usefulness: fc.uniqueArray(fc.tuple(ref, fc.constantFrom(0, 1, 2)), {
      maxLength: 5,
      selector: ([r]) => `${r.sourceId}:${r.entityId}`,
    }),
    answers: fc.array(text, { maxLength: 5 }),
    situationContexts: fc.array(text, { maxLength: 4 }),
    revision: fc.nat({ max: 1000 }),
    status: fc.constantFrom('in-progress', 'completed', 'stopped'),
  })
  .map((r): LocalWorkspaceData => ({
    workspace: {
      id: 'source-workspace',
      name: r.name,
      kind: 'personal',
      visibility: 'private',
      createdAt: DATE,
    },
    entities: r.entities,
    favorites: r.favorites.map((ref) => ({
      ref,
      workspaceId: 'source-workspace',
      createdAt: DATE,
    })),
    usefulness: r.usefulness.map(([ref, usefulness]) => ({
      ref,
      usefulness: usefulness as 0 | 1 | 2,
      workspaceId: 'source-workspace',
      updatedAt: DATE,
    })),
    practiceRuns: [
      {
        id: 'saved-run',
        workspaceId: 'source-workspace',
        title: 'My saved reflection',
        patternTitle: 'A pattern',
        patternRef: { sourceId: 'commons', entityId: 'removed-pattern' },
        patternType: 'pattern',
        origin: 'chatgpt',
        status: r.status as 'in-progress' | 'completed' | 'stopped',
        revision: r.revision,
        verseIds: ['home'],
        checkpoint: '{"opaque":"validate on resume"}',
        responses: r.answers.map((answer, n) => ({
          id: `answer-${n}`,
          prompt: `Question ${n}`,
          answer,
        })),
        createdAt: DATE,
        updatedAt: DATE,
      },
    ],
    situations: r.situationContexts.map((context, n) => ({
      id: `situation-${n}`,
      workspaceId: 'source-workspace',
      title: `Situation ${n}`,
      context,
      position: n,
      revision: r.revision,
      createdAt: DATE,
      updatedAt: DATE,
    })),
  }));
const sessionsArbitrary = fc.array(text, { maxLength: 5 }).map((messages) => [
  {
    ...createSession('saved-session', 'cbt', DATE),
    title: 'A saved conversation',
    activePattern: { sourceId: 'commons', entityId: 'item-1', revision: 'release-1' },
    messages: messages.map((text, n) => ({
      id: `message-${n}`,
      role: n % 2 ? ('assistant' as const) : ('user' as const),
      text,
      createdAt: DATE,
    })),
  },
]);
const snapshotArbitrary = fc
  .tuple(workspaceArbitrary, sessionsArbitrary)
  .map(([workspace, sessions]): WorkspaceSyncSnapshot => ({ version: 2, workspace, sessions }));

// Table iteration order is not record identity. Preserve collection item order, situation
// positions and message order; compare unordered database tables by key.
function sortedWorkspace(data: LocalWorkspaceData): LocalWorkspaceData {
  const byId = <T extends { id: string }>(rows: readonly T[]) =>
    [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const byRef = <T extends { ref: { sourceId: string; entityId: string } }>(rows: readonly T[]) =>
    [...rows].sort((a, b) =>
      `${a.ref.sourceId}:${a.ref.entityId}`.localeCompare(`${b.ref.sourceId}:${b.ref.entityId}`),
    );
  return {
    ...data,
    entities: byId(data.entities),
    favorites: byRef(data.favorites),
    usefulness: byRef(data.usefulness),
    practiceRuns: byId(data.practiceRuns),
    situations: byId(data.situations),
  };
}

beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => vi.unstubAllGlobals());

describe('complete workspace sync snapshot properties', () => {
  it('round-trips every workspace section and opaque saved checkpoint without mutating inputs', () => {
    fc.assert(
      fc.property(snapshotArbitrary, (snapshot) => {
        const original = structuredClone(snapshot);
        const bytes = serializeWorkspaceSyncSnapshot(snapshot);
        const parsed = parseSyncSnapshot(decode(bytes));
        expect(parsed).toEqual(snapshot);
        expect(serializeWorkspaceSyncSnapshot(parsed as WorkspaceSyncSnapshot)).toEqual(bytes);
        expect(snapshot).toEqual(original);
      }),
      properties,
    );
  });
  it('strips metadata secrets at all permissive boundaries and clears device-local pending replies', () => {
    fc.assert(
      fc.property(snapshotArbitrary, text, (snapshot, secret) => {
        const marker = `SECRET:${secret}`;
        const session = snapshot.sessions[0];
        const dirty = {
          ...snapshot,
          apiKey: marker,
          drafts: [marker],
          runCache: marker,
          workspace: {
            ...snapshot.workspace,
            settings: { apiKey: marker },
            unsavedResponses: [marker],
            workspace: {
              ...snapshot.workspace.workspace,
              owner: { actorId: marker },
              dropboxConnection: marker,
            },
            favorites: snapshot.workspace.favorites.map((row) => ({ ...row, accessToken: marker })),
            usefulness: snapshot.workspace.usefulness.map((row) => ({
              ...row,
              accessToken: marker,
            })),
            practiceRuns: snapshot.workspace.practiceRuns.map((row) => ({
              ...row,
              apiKey: marker,
              responses: row.responses.map((answer) => ({ ...answer, apiKey: marker })),
            })),
            situations: snapshot.workspace.situations.map((row) => ({ ...row, apiKey: marker })),
          },
          sessions: [
            {
              ...session,
              settings: { apiKey: marker },
              pendingReplyId: marker,
              activePattern: session.activePattern
                ? { ...session.activePattern, apiKey: marker }
                : null,
              messages: session.messages.map((message) => ({ ...message, apiKey: marker })),
            },
          ],
        };
        expect(parseWorkspaceSyncSnapshot(dirty)).toEqual(snapshot);
        expect(new TextDecoder().decode(serializeWorkspaceSyncSnapshot(dirty))).not.toContain(
          'SECRET:',
        );
      }),
      properties,
    );
  });
  it('migrates v1 without inventing deletions for fields v1 never stored', () => {
    fc.assert(
      fc.property(snapshotArbitrary, workspaceArbitrary, (snapshot, fallback) => {
        const legacy = {
          version: 1 as const,
          entities: snapshot.workspace.entities,
          sessions: snapshot.sessions,
        };
        const before = structuredClone({ legacy, fallback });
        expect(parseSyncSnapshot(legacy)).toEqual(legacy);
        const migrated = migrateLegacySyncSnapshot(legacy, fallback);
        expect(migrated.snapshot).toEqual({
          version: 2,
          workspace: { ...fallback, entities: legacy.entities },
          sessions: legacy.sessions,
        });
        expect(migrated.inheritedFields).toEqual(LEGACY_MISSING_FIELDS);
        expect(parseSyncSnapshot(migrated.snapshot)).toEqual(migrated.snapshot);
        expect({ legacy, fallback }).toEqual(before);
      }),
      properties,
    );
  });
  it('restores validated data to a different device while retaining that device owner and ID', async () => {
    const key = await deriveSyncKey('a strong unique sync phrase', SALT);
    await fc.assert(
      fc.asyncProperty(snapshotArbitrary, async (snapshot) => {
        const storage = new IDBFactory();
        const target = createIndexedDbWorkspace({
          indexedDB: storage,
          IDBKeyRange,
          databaseName: 'snapshot-restore',
          now: () => new Date('2026-10-10T12:00:00.000Z'),
        });
        try {
          const identity = await target.getWorkspace();
          const portable = await openWorkspaceSyncSnapshot(
            await sealWorkspaceSyncSnapshot(snapshot, key, SALT),
            key,
          );
          if (portable.version !== 2) throw new Error('Expected a complete snapshot');
          // Exercise the existing, confirmed-backup replacement boundary in an isolated test DB.
          // This is not a live sync apply operation or a new replacement path.
          await target.replaceFromBackup(createWorkspaceBackup(portable.workspace, DATE));
          const restored = await target.readWorkspaceData();
          expect(sortedWorkspace(restored)).toEqual(
            sortedWorkspace({
              ...snapshot.workspace,
              workspace: {
                ...snapshot.workspace.workspace,
                id: identity.id,
                createdAt: identity.createdAt,
              },
              favorites: snapshot.workspace.favorites.map((row) => ({
                ...row,
                workspaceId: identity.id,
              })),
              usefulness: snapshot.workspace.usefulness.map((row) => ({
                ...row,
                workspaceId: identity.id,
              })),
              practiceRuns: snapshot.workspace.practiceRuns.map((row) => ({
                ...row,
                workspaceId: identity.id,
              })),
              situations: snapshot.workspace.situations.map((row) => ({
                ...row,
                workspaceId: identity.id,
              })),
            }),
          );
          expect((await target.getWorkspace()).owner).toEqual(identity.owner);
          const mira = createPrivateMiraStore({
            indexedDB: storage,
            crypto: webcrypto as Crypto,
            databaseName: 'snapshot-mira',
          });
          for (const session of portable.sessions) await mira.save(session);
          expect(await mira.list()).toEqual(portable.sessions);
        } finally {
          target.close();
        }
      }),
      { ...properties, numRuns: 30 },
    );
  });
});

describe('shared sync envelope properties and compatibility', () => {
  it('encrypts/decrypts generated snapshots, with a fresh IV even for identical content', async () => {
    const key = await deriveSyncKey('a strong unique sync phrase', SALT);
    expect(key.extractable).toBe(false);
    await fc.assert(
      fc.asyncProperty(snapshotArbitrary, async (snapshot) => {
        const first = await sealWorkspaceSyncSnapshot(snapshot, key, SALT);
        const second = await sealWorkspaceSyncSnapshot(snapshot, key, SALT);
        expect(first.iv).not.toEqual(second.iv);
        expect(first.data).not.toEqual(second.data);
        expect(await openWorkspaceSyncSnapshot(first, key)).toEqual(snapshot);
        expect(await openWorkspaceSyncSnapshot(second, key)).toEqual(snapshot);
        expect(Object.keys(first).sort()).toEqual(['data', 'iv', 'salt', 'version']);
      }),
      properties,
    );
  });
  it('rejects modified ciphertext, IV, salt, and version', async () => {
    const key = await deriveSyncKey('a strong unique sync phrase', SALT);
    await fc.assert(
      fc.asyncProperty(snapshotArbitrary, fc.nat(), async (snapshot, offset) => {
        const envelope = await sealWorkspaceSyncSnapshot(snapshot, key, SALT);
        const bytes = syncUnbase64(envelope.data);
        bytes[offset % bytes.length] ^= 1;
        const iv = syncUnbase64(envelope.iv);
        iv[0] ^= 1;
        const salt = syncUnbase64(envelope.salt);
        salt[0] ^= 1;
        for (const broken of [
          { ...envelope, data: syncBase64(bytes) },
          { ...envelope, iv: syncBase64(iv) },
          { ...envelope, salt: syncBase64(salt) },
          { ...envelope, version: 1 as const },
        ])
          await expect(openWorkspaceSyncSnapshot(broken, key)).rejects.toThrow();
      }),
      { ...properties, numRuns: 40 },
    );
  });
  it('reads ciphertext created with the original v1 algorithm, then explicitly migrates it', async () => {
    const key = await deriveSyncKey('a strong unique sync phrase', SALT);
    const snapshot = fc.sample(snapshotArbitrary, { seed: properties.seed, numRuns: 1 })[0];
    const legacy = {
      version: 1 as const,
      entities: snapshot.workspace.entities,
      sessions: snapshot.sessions,
    };
    const iv = new Uint8Array(12).fill(11);
    // Independent historical fixture: ensures compatibility, not just self-round-tripping.
    const encrypted = await webcrypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: encoder.encode('patternverse-sync-v1') },
      key,
      encoder.encode(JSON.stringify(legacy)),
    );
    const envelope = {
      version: 1 as const,
      salt: SALT,
      iv: syncBase64(iv),
      data: syncBase64(new Uint8Array(encrypted)),
    };
    const parsed = await openWorkspaceSyncSnapshot(envelope, key);
    expect(parsed).toEqual(legacy);
    if (parsed.version !== 1) throw new Error('Expected a legacy snapshot');
    const upgraded = migrateLegacySyncSnapshot(parsed, snapshot.workspace);
    expect(
      await openWorkspaceSyncSnapshot(
        await sealWorkspaceSyncSnapshot(upgraded.snapshot, key, SALT),
        key,
      ),
    ).toEqual(snapshot);
    const newlySealed = await sealSyncDocument(
      encoder.encode(JSON.stringify(legacy)),
      key,
      SALT,
      1,
    );
    expect(decode(await openSyncDocument(newlySealed, key))).toEqual(legacy);
  });
  it('rejects a wrong phrase, unsupported versions, oversized documents and version mismatch', async () => {
    const key = await deriveSyncKey('a strong unique sync phrase', SALT);
    const wrong = await deriveSyncKey('a different unique sync phrase', SALT);
    const snapshot = fc.sample(snapshotArbitrary, { seed: properties.seed, numRuns: 1 })[0];
    const envelope = await sealWorkspaceSyncSnapshot(snapshot, key, SALT);
    await expect(openWorkspaceSyncSnapshot(envelope, wrong)).rejects.toThrow('did not unlock');
    await expect(deriveSyncKey('short', SALT)).rejects.toThrow('12 characters');
    await expect(deriveSyncKey('a strong unique sync phrase', 'AA==')).rejects.toThrow('salt');
    await expect(
      sealSyncDocument(new Uint8Array(MAX_SYNC_DOCUMENT_BYTES + 1), key, SALT, 2),
    ).rejects.toThrow('8 MB');
    const mismatch = await sealSyncDocument(
      encoder.encode(JSON.stringify({ version: 1, entities: [], sessions: [] })),
      key,
      SALT,
      2,
    );
    await expect(openWorkspaceSyncSnapshot(mismatch, key)).rejects.toThrow('versions do not match');
    expect(() => parseSyncSnapshot({ ...snapshot, version: 3 })).toThrow('unsupported');
  });
});

describe('capture and validation boundaries', () => {
  it('captures real saved records without including encrypted settings or the separate live-run cache', async () => {
    const storage = new IDBFactory();
    const workspace = createIndexedDbWorkspace({
      indexedDB: storage,
      IDBKeyRange,
      databaseName: 'real-snapshot-capture',
      now: () => new Date(DATE),
    });
    const mira = createPrivateMiraStore({
      indexedDB: storage,
      crypto: webcrypto as Crypto,
      databaseName: 'real-mira-capture',
    });
    try {
      await workspace.createEntity({
        id: 'my-pattern',
        type: 'pattern',
        title: 'My pattern',
        body: '!ask "What matters?"',
      });
      await workspace.setSavedEntry({ sourceId: 'commons', entityId: 'observer' }, true);
      await workspace.setUsefulness({ sourceId: 'commons', entityId: 'observer' }, 2);
      await workspace.createSituation('A saved situation');
      const session = createSession('real-session', 'cbt', DATE);
      await mira.save(session);
      await mira.saveSettings({
        model: 'a-device-model',
        openRouterKey: 'SECRET:provider-key',
        promptOverrides: {},
        activeSessionId: session.id,
      });
      await mira.saveRun(session.id, { secret: 'SECRET:unsaved-live-answers' }, null);
      const run = fc.sample(snapshotArbitrary, { seed: properties.seed, numRuns: 1 })[0].workspace
        .practiceRuns[0];
      await workspace.savePracticeRun({
        ...run,
        id: 'explicitly-saved-run',
        responses: [{ id: 'one', prompt: 'Question', answer: 'An explicitly saved answer' }],
      });
      const snapshot = await captureWorkspaceSyncSnapshot(workspace, mira);
      expect(snapshot.workspace.entities).toHaveLength(1);
      expect(snapshot.workspace.favorites).toHaveLength(1);
      expect(snapshot.workspace.usefulness[0].usefulness).toBe(2);
      expect(snapshot.workspace.situations).toHaveLength(1);
      expect(snapshot.workspace.practiceRuns[0].responses[0].answer).toBe(
        'An explicitly saved answer',
      );
      expect(snapshot.sessions).toEqual([session]);
      expect(new TextDecoder().decode(serializeWorkspaceSyncSnapshot(snapshot))).not.toContain(
        'SECRET:',
      );
      expect((await mira.loadSettings()).openRouterKey).toBe('SECRET:provider-key');
      expect((await mira.loadRun(session.id))?.saved).toEqual({
        secret: 'SECRET:unsaved-live-answers',
      });
    } finally {
      workspace.close();
    }
  });

  it('supports an entirely empty workspace and rejects truncation, invalid plaintext and size overflow', async () => {
    const snapshot = fc.sample(snapshotArbitrary, { seed: properties.seed, numRuns: 1 })[0];
    const empty: WorkspaceSyncSnapshot = {
      version: 2,
      workspace: {
        ...snapshot.workspace,
        entities: [],
        favorites: [],
        usefulness: [],
        practiceRuns: [],
        situations: [],
      },
      sessions: [],
    };
    const key = await deriveSyncKey('a strong unique sync phrase', SALT);
    const envelope = await sealWorkspaceSyncSnapshot(empty, key, SALT);
    expect(await openWorkspaceSyncSnapshot(envelope, key)).toEqual(empty);
    for (const data of ['', envelope.data.slice(0, -4), 'not base64!'])
      await expect(openWorkspaceSyncSnapshot({ ...envelope, data }, key)).rejects.toThrow();
    const invalid = await sealSyncDocument(encoder.encode('{not json'), key, SALT, 2);
    await expect(openWorkspaceSyncSnapshot(invalid, key)).rejects.toThrow();
    const tooLarge = {
      ...empty,
      workspace: {
        ...empty.workspace,
        entities: [
          {
            id: 'huge',
            sourceId: 'personal',
            type: 'pattern' as const,
            status: 'draft' as const,
            title: 'Too large',
            body: 'x'.repeat(MAX_SYNC_DOCUMENT_BYTES),
          },
        ],
      },
    };
    expect(() => serializeWorkspaceSyncSnapshot(tooLarge)).toThrow('8 MB');
  });

  it('reads persisted data only and does not access settings, live runs, or other device stores', async () => {
    const snapshot = fc.sample(snapshotArbitrary, { seed: properties.seed, numRuns: 1 })[0];
    const forbidden = vi.fn(() => {
      throw new Error('Device-only storage accessed');
    });
    const workspace = {
      readWorkspaceData: vi.fn(async () => snapshot.workspace),
      getWorkspace: forbidden,
    };
    const mira = {
      list: vi.fn(async () => snapshot.sessions),
      loadSettings: forbidden,
      loadRun: forbidden,
    };
    expect(await captureWorkspaceSyncSnapshot(workspace, mira)).toEqual(snapshot);
    expect(workspace.readWorkspaceData).toHaveBeenCalledOnce();
    expect(mira.list).toHaveBeenCalledOnce();
    expect(forbidden).not.toHaveBeenCalled();
  });
  it('rejects incomplete v2 fields, public articles, duplicate records and mixed ownership', () => {
    const snapshot = fc.sample(snapshotArbitrary, { seed: properties.seed, numRuns: 1 })[0];
    const pattern: RawEntity = {
      id: 'private',
      sourceId: 'personal',
      type: 'pattern',
      status: 'draft',
      title: 'Private',
      body: '',
    };
    for (const workspace of [
      { ...snapshot.workspace, practiceRuns: undefined },
      { ...snapshot.workspace, situations: undefined },
      { ...snapshot.workspace, entities: [{ ...pattern, sourceId: 'commons' }] },
      { ...snapshot.workspace, entities: [pattern, pattern] },
      {
        ...snapshot.workspace,
        practiceRuns: [{ ...snapshot.workspace.practiceRuns[0], workspaceId: 'another-workspace' }],
      },
    ])
      expect(() => parseWorkspaceSyncSnapshot({ ...snapshot, workspace })).toThrow();
    expect(() =>
      parseWorkspaceSyncSnapshot({
        ...snapshot,
        sessions: [...snapshot.sessions, ...snapshot.sessions],
      }),
    ).toThrow('Duplicate');
    expect(() =>
      parseWorkspaceSyncSnapshot({
        ...snapshot,
        workspace: { ...snapshot.workspace, entities: [{ ...pattern, apiKey: 'secret' }] },
      }),
    ).toThrow();
  });
});
