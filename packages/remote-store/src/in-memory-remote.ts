import {
  createCorpusSnapshot,
  type CorpusChange,
  type CorpusSnapshot,
} from '@patternverse/sync-domain';

import { applyCorpusChanges, CorpusChangePreconditionError } from './apply.js';
import type {
  ApplyRemoteChangesRequest,
  ApplyRemoteChangesResult,
  RemoteConnection,
  RemoteCorpusCapabilities,
  RemoteCorpusError,
  RemoteCorpusStore,
  RemoteOperationResult,
  RemoteSnapshotResult,
} from './types.js';

export type InMemoryFailureOperation = 'read' | 'apply' | 'disconnect';

export type InMemoryInjectedFailure = {
  readonly operation: InMemoryFailureOperation;
  readonly error: RemoteCorpusError;
  readonly afterChanges?: number;
};

export type InMemoryRemoteCorpusStore = RemoteCorpusStore & {
  readonly createConnection: (label?: string) => RemoteConnection;
  readonly expireConnection: (connection: RemoteConnection) => void;
  readonly injectFailure: (failure: InMemoryInjectedFailure) => void;
  readonly simulateExternalChanges: (changes: readonly CorpusChange[]) => void;
  readonly simulateConcurrentChangesOnNextApply: (changes: readonly CorpusChange[]) => void;
  readonly inspectSnapshot: () => CorpusSnapshot;
};

export type InMemoryRemoteCorpusStoreOptions = {
  readonly initialSnapshot?: CorpusSnapshot;
  readonly capabilities?: Partial<RemoteCorpusCapabilities>;
};

const defaultCapabilities: RemoteCorpusCapabilities = {
  supportsAtomicBatchWrite: false,
  supportsChangeCursor: false,
  supportsVisibleFiles: true,
  supportsRevisionHistory: false,
  supportsFolderSelection: false,
};

type ConnectionState = 'active' | 'expired';

export const createInMemoryRemoteCorpusStore = (
  options: InMemoryRemoteCorpusStoreOptions = {},
): InMemoryRemoteCorpusStore => {
  const providerId = 'in-memory';
  let revisionNumber = 0;
  let snapshot = createCorpusSnapshot({
    revision: `in-memory:${revisionNumber}`,
    files: options.initialSnapshot?.files ?? [],
  });
  let connectionNumber = 0;
  const connections = new Map<string, ConnectionState>();
  const failures: InMemoryInjectedFailure[] = [];
  let concurrentChanges: readonly CorpusChange[] | null = null;

  const nextRevision = (): string => `in-memory:${++revisionNumber}`;

  const connectionError = (connection: RemoteConnection): RemoteCorpusError | null => {
    if (connection.providerId !== providerId) return { type: 'not-authenticated' };
    const state = connections.get(connection.connectionId);
    if (!state) return { type: 'not-authenticated' };
    return state === 'expired' ? { type: 'authorization-expired' } : null;
  };

  const takeFailure = (
    operation: InMemoryFailureOperation,
  ): InMemoryInjectedFailure | undefined => {
    const index = failures.findIndex((failure) => failure.operation === operation);
    if (index < 0) return undefined;
    return failures.splice(index, 1)[0];
  };

  const applyDirectly = (changes: readonly CorpusChange[]): void => {
    if (changes.length === 0) return;
    snapshot = applyCorpusChanges(snapshot, changes, nextRevision());
  };

  const readSnapshot = async (connection: RemoteConnection): Promise<RemoteSnapshotResult> => {
    const authError = connectionError(connection);
    if (authError) return { ok: false, error: authError };
    const failure = takeFailure('read');
    if (failure) return { ok: false, error: failure.error };
    return { ok: true, snapshot: createCorpusSnapshot(snapshot) };
  };

  const applyChanges = async (
    connection: RemoteConnection,
    request: ApplyRemoteChangesRequest,
  ): Promise<ApplyRemoteChangesResult> => {
    const authError = connectionError(connection);
    if (authError) return { ok: false, error: authError };

    if (concurrentChanges) {
      const pending = concurrentChanges;
      concurrentChanges = null;
      applyDirectly(pending);
    }

    if (request.expectedRevision !== snapshot.revision) {
      return { ok: false, error: { type: 'revision-conflict' } };
    }

    const failure = takeFailure('apply');
    if (failure && (failure.afterChanges ?? 0) <= 0) {
      return { ok: false, error: failure.error };
    }

    try {
      if (failure) {
        const partial = request.changes.slice(0, failure.afterChanges);
        applyDirectly(partial);
        return { ok: false, error: failure.error };
      }
      applyDirectly(request.changes);
      return { ok: true, revision: snapshot.revision ?? nextRevision() };
    } catch (error) {
      if (error instanceof CorpusChangePreconditionError) {
        return { ok: false, error: { type: 'revision-conflict' } };
      }
      return { ok: false, error: { type: 'unknown', cause: error } };
    }
  };

  const disconnect = async (connection: RemoteConnection): Promise<RemoteOperationResult> => {
    const authError = connectionError(connection);
    if (authError) return { ok: false, error: authError };
    const failure = takeFailure('disconnect');
    if (failure) return { ok: false, error: failure.error };
    connections.delete(connection.connectionId);
    return { ok: true };
  };

  return {
    providerId,
    capabilities: { ...defaultCapabilities, ...options.capabilities },
    readSnapshot,
    applyChanges,
    disconnect,
    createConnection: (label = `connection-${connectionNumber + 1}`) => {
      const connectionId = `in-memory-connection:${++connectionNumber}`;
      connections.set(connectionId, 'active');
      return { providerId, connectionId, accountLabel: label };
    },
    expireConnection: (connection) => {
      if (connections.has(connection.connectionId))
        connections.set(connection.connectionId, 'expired');
    },
    injectFailure: (failure) => failures.push(structuredClone(failure)),
    simulateExternalChanges: applyDirectly,
    simulateConcurrentChangesOnNextApply: (changes) => {
      concurrentChanges = structuredClone(changes);
    },
    inspectSnapshot: () => createCorpusSnapshot(snapshot),
  };
};
