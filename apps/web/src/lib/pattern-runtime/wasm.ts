import init, { dispatch, editor } from '$lib/mira/engine/pattern_wasm.js';

// The generated binary remains at its existing build-script location. It contains
// the shared Rust core; its directory name does not imply a Mira dependency.
let initialization: Promise<unknown> | undefined;

/** One initialization path for catalog runs, authored practices and editor inspection. */
export async function executePatternRequest(
  transport: 'source' | 'catalog',
  request: Record<string, unknown>,
): Promise<unknown> {
  initialization ??= init();
  await initialization;
  const invoke = transport === 'source' ? editor : dispatch;
  return JSON.parse(invoke(JSON.stringify(request))) as unknown;
}
