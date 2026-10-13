import type { Session } from '@patternverse/companion-core';
import { exportPortableArchive, importPortableArchive } from './portable';
import type { MiraSettings, PrivateMiraStore } from './private-store';

type Ports = Readonly<{
  store: () => PrivateMiraStore | undefined;
  sessions: () => readonly Session[];
  settings: () => MiraSettings;
  cryptography: () => Crypto;
  now: () => string;
  download: (encrypted: string, filename: string) => void;
  refresh: () => Promise<void>;
  busyChanged: (busy: boolean) => void;
  clearMessages: () => void;
  error: (message: string) => void;
  notice: (message: string) => void;
  exported: () => void;
  imported: () => void;
}>;

/** Coordinate explicit transfers without introducing another archive or import format. */
export function createMiraArchive(ports: Ports) {
  let busy = false;
  let disposed = false;
  const start = () => {
    const store = ports.store();
    if (disposed || busy || !store) return;
    busy = true;
    ports.busyChanged(true);
    ports.clearMessages();
    return store;
  };
  const finish = () => {
    busy = false;
    if (!disposed) ports.busyChanged(false);
  };
  const fail = (cause: unknown) => {
    if (!disposed)
      ports.error(
        cause instanceof Error ? cause.message : 'Something went wrong. Please try again.',
      );
  };

  return {
    export: async (passphrase: string) => {
      const store = start();
      if (!store) return;
      // Snapshot before awaiting: later session/model choices cannot produce a mixed archive.
      const sessions = ports.sessions();
      const settings = ports.settings();
      try {
        const runs = (
          await Promise.all(
            sessions.map(async (session) => {
              const record = await store.loadRun(session.id);
              return record ? { sessionId: session.id, saved: record.saved } : null;
            }),
          )
        ).filter((run): run is { sessionId: string; saved: unknown } => run !== null);
        if (disposed) return;
        const encrypted = await exportPortableArchive(
          sessions,
          settings,
          passphrase,
          ports.cryptography(),
          runs,
        );
        if (disposed) return;
        ports.download(encrypted, `patternverse-mira-${ports.now().slice(0, 10)}.json`);
        ports.exported();
        ports.notice(
          'Encrypted archive downloaded. Keep its passphrase somewhere safe; it cannot be recovered.',
        );
      } catch (cause) {
        fail(cause);
      } finally {
        finish();
      }
    },
    import: async (file: Pick<File, 'text'> | null, passphrase: string) => {
      if (!file) return;
      const store = start();
      if (!store) return;
      try {
        const raw = await file.text();
        if (disposed) return;
        // Once started, the validated import owns its storage writes; disposal only suppresses UI work.
        const count = await importPortableArchive(store, raw, passphrase, ports.cryptography());
        if (disposed) return;
        await ports.refresh();
        if (disposed) return;
        ports.imported();
        ports.notice(
          `Imported ${count} session${count === 1 ? '' : 's'} without replacing existing sessions.`,
        );
      } catch (cause) {
        fail(cause);
      } finally {
        finish();
      }
    },
    dispose: () => {
      disposed = true;
    },
  };
}
