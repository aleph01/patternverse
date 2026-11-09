import { getLocalWorkspace } from '$lib/client/workspace';
import { widgetDocument } from './document';
import { bundledWidgets, isBundledWidget } from './bundled';
import type { WidgetPackage } from '@patternverse/workspace';
export type WidgetInteraction = {
  package: WidgetPackage;
  export: string;
  definition: {
    name: string;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    fallback?: { kind: string; input: string; output: string };
  };
  inputs: Record<string, unknown>;
  presentation: Record<string, unknown>;
  prompt: string;
};
/** Values cross the interface boundary as plain JSON, never internal Rust tagged values. */
export function plain(value: unknown): unknown {
  const v = value as { type?: string; value?: unknown };
  if (!v || typeof v !== 'object' || !v.type) return value;
  if (v.type === 'record')
    return Object.fromEntries(
      Object.entries(v.value as Record<string, unknown>).map(([k, v]) => [k, plain(v)]),
    );
  if (v.type === 'list') return (v.value as { items: unknown[] }).items.map(plain);
  if (v.type === 'optional') return plain((v.value as { value: unknown }).value);
  return v.value;
}
/** Only shipped packages and explicit local immutable releases; no installation. */
export async function widgetPackages(): Promise<Record<string, WidgetPackage>> {
  const releases = await (await getLocalWorkspace()).listWidgetReleases();
  return {
    ...Object.fromEntries(releases.map((r) => [r.reference, r.package])),
    ...bundledWidgets,
  };
}
export async function validatePackage(pkg: WidgetPackage): Promise<void> {
  const { executePatternRequest } = await import('$lib/pattern-runtime/wasm');
  await executePatternRequest('source', { operation: 'validate_widget', package: pkg });
  if (typeof DOMParser !== 'undefined')
    for (const [name, exp] of Object.entries(pkg.manifest.exports))
      if (exp.kind === 'widget') widgetDocument(pkg, name);
}
export async function prepareWidget(
  pkg: WidgetPackage,
  exportName: string,
  inputs: Record<string, unknown>,
  prompt: string,
): Promise<WidgetInteraction> {
  const { executePatternRequest } = await import('$lib/pattern-runtime/wasm');
  return (await executePatternRequest('source', {
    operation: 'prepare_widget',
    package: pkg,
    export: exportName,
    inputs,
    prompt,
  })) as WidgetInteraction;
}
export async function validateWidgetOutput(
  interaction: WidgetInteraction,
  outputs: unknown,
): Promise<unknown> {
  const { executePatternRequest } = await import('$lib/pattern-runtime/wasm');
  return executePatternRequest('source', {
    operation: 'validate_widget_output',
    interaction,
    outputs,
  });
}
/** Source revisions pin their first successful package resolution, including major-version imports. */
export async function widgetEnvironment(source: string): Promise<{
  packages: Record<string, WidgetPackage>;
  remember: (packages: Record<string, WidgetPackage>) => Promise<void>;
}> {
  const workspace = await getLocalWorkspace(),
    releases = await workspace.listWidgetReleases();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source.trimEnd()));
  const hash = Array.from(new Uint8Array(digest), (v) => v.toString(16).padStart(2, '0')).join('');
  const lock = await workspace.widgetDependencyLock(hash);
  const resolved = lock
    ? lock.releaseIds.map((id) => {
        const row = releases.find((r) => r.id === id);
        if (!row)
          throw Error('A pinned widget release is missing. Restore its package from backup.');
        return row;
      })
    : releases;
  return {
    packages: {
      ...Object.fromEntries(resolved.map((r) => [r.reference, r.package])),
      ...bundledWidgets,
    },
    remember: async (packages) => {
      if (!Object.keys(packages).length || lock) return;
      const ids = Object.values(packages)
        .filter((p) => !isBundledWidget(p))
        .map((p) => {
          const row = releases.find(
            (r) =>
              r.package.identity === p.identity &&
              r.reference === `${p.manifest.publisher}/${p.manifest.name}@${p.manifest.version}`,
          );
          if (!row) throw Error('A resolved widget release is missing.');
          return row.id;
        });
      if (!ids.length) return;
      const pinned = await workspace.lockWidgetDependencies(hash, ids);
      if (JSON.stringify([...ids].sort()) !== JSON.stringify(pinned.releaseIds))
        throw Error(
          'This practice was pinned in another window. Try again to use its recorded widget versions.',
        );
    },
  };
}
