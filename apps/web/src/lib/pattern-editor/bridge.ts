import { executePatternRequest } from '$lib/pattern-runtime/wasm';
import type { Inspection } from './types';
// Compatibility aliases: existing editor consumers use the same neutral runtime.
export {
  startSourceRun as startSourcePreview,
  applySourceAction as applySourcePreview,
} from '$lib/pattern-runtime/source';
export async function inspectSource(source: string): Promise<Inspection> {
  return (await executePatternRequest('source', { operation: 'inspect', source })) as Inspection;
}

/** Explicit input conversion copied from Mira; Rust validates every resulting value. */
export function inputValues(
  types: Record<string, unknown>,
  values: Record<string, string>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(types).map(([name, type]) => {
      const raw = values[name] ?? '';
      if (type === 'number' && (!raw.trim() || !Number.isFinite(Number(raw))))
        throw new Error(`Enter a number for ${name}.`);
      if (type === 'boolean' && raw !== 'true' && raw !== 'false')
        throw new Error(`Choose true or false for ${name}.`);
      return [
        name,
        type === 'text'
          ? { type, value: raw }
          : type === 'number'
            ? { type, value: Number(raw) }
            : type === 'boolean'
              ? { type, value: raw === 'true' }
              : (JSON.parse(raw) as unknown),
      ];
    }),
  );
}
