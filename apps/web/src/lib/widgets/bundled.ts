import type { WidgetPackage } from '@patternverse/workspace';
import { widgetTemplate } from './templates';

// Shipped code, not a registry or an installation. Keep exact versions available
// when publishing a replacement: saved practices carry their original bytes.
const needs = widgetTemplate('needs', 'commons/needs-selector');
needs.manifest.publisher = 'commons';
export const bundledWidgets: Readonly<Record<string, WidgetPackage>> = {
  'commons/needs-selector@0.1.0': needs,
};

const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  return JSON.stringify(value);
};
const shipped = new Set(Object.values(bundledWidgets).map(canonical));

/** Identity alone never grants execution to restored/imported author code. */
export function isBundledWidget(pkg: WidgetPackage): boolean {
  return shipped.has(canonical(pkg));
}
