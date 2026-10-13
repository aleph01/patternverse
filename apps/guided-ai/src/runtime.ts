import { initSync, editor, dispatch } from '../../web/src/lib/mira/engine/pattern_wasm.js';
import module from '../../web/src/lib/mira/engine/pattern_wasm_bg.wasm';
import type { InvokeRuntime } from './admission.js';

// Immutable compiled module only; answers and checkpoints remain request-local.
initSync({ module });
export const invokeRuntime: InvokeRuntime = (transport, request) =>
  JSON.parse((transport === 'source' ? editor : dispatch)(JSON.stringify(request))) as unknown;
