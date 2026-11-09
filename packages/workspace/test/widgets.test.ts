import { describe, it, expect } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { createIndexedDbWorkspace, type WidgetPackage } from '../src/index.js';
import {
  createWorkspaceBackup,
  decodeWorkspaceBackup,
  encodeWorkspaceBackup,
} from '../src/backup.js';
const pkg = (identity: string): WidgetPackage => ({
  identity,
  manifest: {
    schemaVersion: 1,
    publisher: 'personal',
    name: 'example',
    version: '0.1.0',
    hostApi: 1,
    permissions: [],
    exports: { reflection: { kind: 'widget', path: 'widget.json' } },
  },
  files: {
    'widget.json':
      '{"schemaVersion":1,"name":"Example","entry":"widget.html","inputs":{},"outputs":{"note":{"type":"text"}}}',
    'widget.html': '<textarea></textarea>',
  },
});
const open = (idb = new IDBFactory(), name = crypto.randomUUID()) =>
  createIndexedDbWorkspace({ indexedDB: idb, IDBKeyRange, databaseName: name });
describe('widget authoring persistence', () => {
  it('separates mutable drafts from immutable releases, preserves identity, and rejects stale writes', async () => {
    const idb = new IDBFactory(),
      databaseName = crypto.randomUUID();
    let w = open(idb, databaseName);
    const identity = (await w.getWorkspace()).id + '/test';
    const original = await w.saveWidgetDraft({
      id: 'test',
      name: 'Original',
      description: '',
      revision: 0,
      package: pkg(identity),
    });
    const release = await w.saveWidgetRelease('test', original.revision);
    expect(await w.widgetEnabled(identity)).toBe(true);
    const renamed = await w.saveWidgetDraft({ ...original, name: 'Renamed' });
    expect(renamed.package.identity).toBe(identity);
    await expect(w.saveWidgetDraft(original)).rejects.toThrow('another window');
    const modified = await w.saveWidgetDraft({
      ...renamed,
      package: {
        ...renamed.package,
        files: { ...renamed.package.files, 'widget.html': '<input>' },
      },
    });
    await expect(w.saveWidgetRelease('test', modified.revision)).rejects.toThrow('already exists');
    expect((await w.listWidgetReleases())[0]).toEqual(release);
    w.close();
    w = open(idb, databaseName);
    expect(await w.listWidgetDrafts()).toHaveLength(1);
    expect(await w.listWidgetReleases()).toHaveLength(1);
    await w.removeWidget('test');
    expect(await w.widgetEnabled(identity)).toBe(false);
    expect(await w.listWidgetReleases()).toHaveLength(1);
    w.close();
  });
  it('backs up and restores widget code without enabling restored or imported code', async () => {
    const source = open(),
      target = open(),
      identity = (await source.getWorkspace()).id + '/test';
    const d = await source.saveWidgetDraft({
      id: 'test',
      name: 'Example',
      description: '',
      revision: 0,
      package: pkg(identity),
    });
    await source.saveWidgetRelease(d.id, d.revision);
    const backup = decodeWorkspaceBackup(
      encodeWorkspaceBackup(createWorkspaceBackup(await source.readWorkspaceData())),
    );
    expect(backup.widgetDrafts).toHaveLength(1);
    expect(backup.widgetReleases).toHaveLength(1);
    await target.replaceFromBackup(backup);
    expect((await target.listWidgetReleases())[0].package).toEqual(pkg(identity));
    expect(await target.widgetEnabled(identity)).toBe(false);
    const imported = open();
    await imported.importWidgetPackage(pkg(identity));
    expect(await imported.widgetEnabled(identity)).toBe(false);
    source.close();
    target.close();
    imported.close();
  });
  it('rejects unsafe paths and refuses to overwrite an imported immutable version', async () => {
    const w = open();
    const p = pkg('owner/test');
    await w.importWidgetPackage(p);
    await expect(
      w.importWidgetPackage({ ...p, files: { ...p.files, 'widget.html': 'changed' } }),
    ).rejects.toThrow('different content');
    await expect(w.importWidgetPackage({ ...p, files: { '../escape': 'bad' } })).rejects.toThrow(
      'asset',
    );
    w.close();
  });
});

it('retains the first source dependency resolution through release changes, reopen and backup', async () => {
  const idb = new IDBFactory(),
    name = crypto.randomUUID();
  let w = open(idb, name);
  const identity = (await w.getWorkspace()).id + '/pin';
  const d = await w.saveWidgetDraft({
    id: 'pin',
    revision: 0,
    name: 'Pinned',
    description: '',
    package: pkg(identity),
  });
  const first = await w.saveWidgetRelease(d.id, d.revision),
    hash = 'a'.repeat(64);
  const lock = await w.lockWidgetDependencies(hash, [first.id]);
  const next = await w.saveWidgetDraft({
    ...d,
    package: { ...d.package, manifest: { ...d.package.manifest, version: '0.2.0' } },
  });
  const newer = await w.saveWidgetRelease(next.id, next.revision);
  expect(await w.lockWidgetDependencies(hash, [newer.id])).toEqual(lock);
  w.close();
  w = open(idb, name);
  expect(await w.widgetDependencyLock(hash)).toEqual(lock);
  const target = open(),
    backup = createWorkspaceBackup(await w.readWorkspaceData());
  await target.replaceFromBackup(backup);
  expect((await target.widgetDependencyLock(hash))?.releaseIds).toEqual([first.id]);
  expect(await target.widgetEnabled(identity)).toBe(false);
  w.close();
  target.close();
});
