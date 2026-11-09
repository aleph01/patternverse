import {
  parseWidgetDependencyLock,
  parseWidgetDraft,
  parseWidgetPackage,
  widgetReference,
  type WidgetOperations,
  type WidgetRelease,
} from '../widgets.js';
import type { PersistenceContext } from './context.js';
export function createWidgetOperations({
  database,
  metadata,
  now,
}: PersistenceContext): WidgetOperations {
  const listWidgetDrafts = async () =>
    database.widgetDrafts
      .where('workspaceId')
      .equals((await metadata()).id)
      .toArray();
  const listWidgetReleases = async () =>
    database.widgetReleases
      .where('workspaceId')
      .equals((await metadata()).id)
      .toArray();
  const setWidgetEnabled: WidgetOperations['setWidgetEnabled'] = async (identity, enabled) => {
    const w = await metadata();
    await database.widgetInstallations.put({ identity, workspaceId: w.id, enabled });
  };
  const saveWidgetDraft: WidgetOperations['saveWidgetDraft'] = async (input) => {
    const workspace = await metadata();
    const row = parseWidgetDraft({ ...input, workspaceId: workspace.id, updatedAt: now() });
    return database.transaction('rw', database.widgetDrafts, async () => {
      const old = await database.widgetDrafts.get(row.id);
      if (old && (old.workspaceId !== workspace.id || old.revision !== input.revision))
        throw Error('This widget was changed in another window. Reopen it before saving.');
      if (old && old.package.identity !== row.package.identity)
        throw Error('Widget identity cannot change.');
      const saved = { ...row, revision: row.revision + 1 };
      await database.widgetDrafts.put(saved);
      return saved;
    });
  };
  const saveWidgetRelease: WidgetOperations['saveWidgetRelease'] = async (id, expectedRevision) => {
    const w = await metadata();
    return database.transaction(
      'rw',
      [database.widgetDrafts, database.widgetReleases, database.widgetInstallations],
      async () => {
        const draft = await database.widgetDrafts.get(id);
        if (!draft || draft.workspaceId !== w.id || draft.revision !== expectedRevision)
          throw Error('Save the current widget draft before releasing it.');
        const pkg = parseWidgetPackage(draft.package),
          reference = widgetReference(pkg);
        const existing = await database.widgetReleases
          .where('reference')
          .equals(reference)
          .and((r) => r.workspaceId === w.id)
          .first();
        if (existing) {
          if (JSON.stringify(existing.package) !== JSON.stringify(pkg))
            throw Error('This version already exists. Choose a new version number.');
          return existing;
        }
        const release: WidgetRelease = {
          id: crypto.randomUUID(),
          workspaceId: w.id,
          widgetId: id,
          name: draft.name,
          description: draft.description,
          reference,
          package: pkg,
          createdAt: now(),
        };
        await database.widgetReleases.add(release);
        await database.widgetInstallations.put({
          identity: pkg.identity,
          workspaceId: w.id,
          enabled: true,
        });
        return release;
      },
    );
  };
  return {
    widgetDependencyLock: async (id) => {
      const row = await database.widgetLocks.get(id);
      return row?.workspaceId === (await metadata()).id ? row : undefined;
    },
    lockWidgetDependencies: async (id, releaseIds) => {
      const w = await metadata();
      return database.transaction(
        'rw',
        [database.widgetLocks, database.widgetReleases],
        async () => {
          const old = await database.widgetLocks.get(id);
          if (old) {
            if (old.workspaceId !== w.id) throw Error('Widget lock belongs to another workspace.');
            return old;
          }
          for (const releaseId of releaseIds) {
            const release = await database.widgetReleases.get(releaseId);
            if (!release || release.workspaceId !== w.id) throw Error('Widget release is missing.');
          }
          const row = parseWidgetDependencyLock({
            id,
            workspaceId: w.id,
            releaseIds: [...new Set(releaseIds)].sort(),
            createdAt: now(),
          });
          await database.widgetLocks.add(row);
          return row;
        },
      );
    },
    listWidgetDrafts,
    listWidgetReleases,
    saveWidgetDraft,
    saveWidgetRelease,
    setWidgetEnabled,
    widgetEnabled: async (identity) => {
      const row = await database.widgetInstallations.get(identity);
      return row?.workspaceId === (await metadata()).id && row.enabled === true;
    },
    removeWidget: async (id) => {
      const w = await metadata();
      await database.transaction(
        'rw',
        [database.widgetDrafts, database.widgetInstallations],
        async () => {
          const draft = await database.widgetDrafts.get(id);
          if (!draft || draft.workspaceId !== w.id) throw Error('Widget not found.');
          await database.widgetDrafts.delete(id);
          await database.widgetInstallations.put({
            identity: draft.package.identity,
            workspaceId: w.id,
            enabled: false,
          });
        },
      );
    },
    importWidgetPackage: async (value, name) => {
      const pkg = parseWidgetPackage(value),
        w = await metadata(),
        reference = widgetReference(pkg);
      return database.transaction('rw', database.widgetReleases, async () => {
        const old = await database.widgetReleases
          .where('reference')
          .equals(reference)
          .and((r) => r.workspaceId === w.id)
          .first();
        if (old) {
          if (JSON.stringify(old.package) !== JSON.stringify(pkg))
            throw Error('An installed version has different content.');
          return old;
        }
        const release: WidgetRelease = {
          id: crypto.randomUUID(),
          workspaceId: w.id,
          widgetId: pkg.identity,
          name: name || pkg.manifest.name,
          description: 'Imported widget package',
          reference,
          package: pkg,
          createdAt: now(),
        };
        await database.widgetReleases.add(release);
        return release;
      });
    },
  };
}
