/** Portable widget authoring data. Runtime/contract verification belongs to the Rust host. */
export type WidgetPackage = {
  identity: string;
  manifest: {
    schemaVersion: number;
    publisher: string;
    name: string;
    version: string;
    hostApi: number;
    permissions: string[];
    exports: Record<string, { kind: string; path: string; type?: string }>;
  };
  files: Record<string, string>;
};
export type WidgetDraft = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  package: WidgetPackage;
  revision: number;
  updatedAt: string;
};
export type WidgetRelease = {
  id: string;
  workspaceId: string;
  widgetId: string;
  name: string;
  description: string;
  reference: string;
  package: WidgetPackage;
  createdAt: string;
};
export type WidgetInstallation = { identity: string; workspaceId: string; enabled: boolean };
export type WidgetDependencyLock = {
  id: string;
  workspaceId: string;
  releaseIds: string[];
  createdAt: string;
};
export type WidgetOperations = {
  widgetDependencyLock: (hash: string) => Promise<WidgetDependencyLock | undefined>;
  lockWidgetDependencies: (hash: string, releaseIds: string[]) => Promise<WidgetDependencyLock>;
  listWidgetDrafts: () => Promise<WidgetDraft[]>;
  saveWidgetDraft: (draft: Omit<WidgetDraft, 'workspaceId' | 'updatedAt'>) => Promise<WidgetDraft>;
  removeWidget: (id: string) => Promise<void>;
  listWidgetReleases: () => Promise<WidgetRelease[]>;
  saveWidgetRelease: (draftId: string, expectedRevision: number) => Promise<WidgetRelease>;
  importWidgetPackage: (pkg: WidgetPackage, name?: string) => Promise<WidgetRelease>;
  setWidgetEnabled: (identity: string, enabled: boolean) => Promise<void>;
  widgetEnabled: (identity: string) => Promise<boolean>;
};
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('Invalid widget object.');
  return v as Record<string, unknown>;
}
function text(v: unknown, max = 160): string {
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw Error('Invalid widget text.');
  return v;
}
/** Bounded archive admission; does not execute imported code or grant render permission. */
export function parseWidgetPackage(value: unknown): WidgetPackage {
  const r = object(value),
    m = object(r.manifest),
    files = object(r.files),
    exports = object(m.exports);
  if (
    JSON.stringify(value).length > 1048576 ||
    Object.keys(files).length > 64 ||
    m.schemaVersion !== 1 ||
    m.hostApi !== 1 ||
    !Array.isArray(m.permissions) ||
    m.permissions.length
  )
    throw Error('Unsupported or oversized widget package.');
  for (const k of ['publisher', 'name'])
    if (!/^[a-z][a-z0-9-]{0,79}$/.test(text(m[k], 80))) throw Error('Invalid widget package name.');
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(text(m.version)))
    throw Error('Invalid widget version.');
  const path = (p: string) =>
    p.length <= 200 &&
    p.split('/').every((s) => /^[a-zA-Z0-9_.-]+$/.test(s) && s !== '.' && s !== '..');
  for (const [key, v] of Object.entries(files))
    if (!path(key) || typeof v !== 'string') throw Error('Invalid widget asset.');
  for (const [key, v] of Object.entries(exports)) {
    const e = object(v);
    if (
      !/^[a-zA-Z_][\w-]*$/.test(key) ||
      !['widget', 'data'].includes(String(e.kind)) ||
      !path(text(e.path, 200)) ||
      !Object.hasOwn(files, String(e.path))
    )
      throw Error('Invalid widget export.');
  }
  return structuredClone(value) as WidgetPackage;
}
export function parseWidgetDraft(value: unknown): WidgetDraft {
  const r = object(value);
  text(r.id);
  text(r.workspaceId);
  text(r.name);
  if (
    typeof r.description !== 'string' ||
    r.description.length > 2000 ||
    !Number.isSafeInteger(r.revision) ||
    Number(r.revision) < 0 ||
    !Number.isFinite(Date.parse(String(r.updatedAt)))
  )
    throw Error('Invalid widget draft.');
  parseWidgetPackage(r.package);
  return structuredClone(value) as WidgetDraft;
}
export function parseWidgetRelease(value: unknown): WidgetRelease {
  const r = object(value);
  text(r.id);
  text(r.workspaceId);
  text(r.widgetId);
  text(r.name);
  text(r.reference);
  if (typeof r.description !== 'string' || !Number.isFinite(Date.parse(String(r.createdAt))))
    throw Error('Invalid widget release.');
  const pkg = parseWidgetPackage(r.package);
  if (r.reference !== widgetReference(pkg)) throw Error('Widget reference mismatch.');
  return structuredClone(value) as WidgetRelease;
}
export function widgetReference(pkg: WidgetPackage): string {
  return `${pkg.manifest.publisher}/${pkg.manifest.name}@${pkg.manifest.version}`;
}

export function parseWidgetDependencyLock(value: unknown): WidgetDependencyLock {
  const r = object(value);
  if (
    typeof r.id !== 'string' ||
    !/^[a-f0-9]{64}$/.test(r.id) ||
    !Array.isArray(r.releaseIds) ||
    r.releaseIds.length > 64 ||
    r.releaseIds.some((id) => typeof id !== 'string' || !id) ||
    new Set(r.releaseIds).size !== r.releaseIds.length ||
    !Number.isFinite(Date.parse(String(r.createdAt)))
  )
    throw Error('Invalid widget dependency lock.');
  text(r.workspaceId);
  return structuredClone(value) as WidgetDependencyLock;
}
