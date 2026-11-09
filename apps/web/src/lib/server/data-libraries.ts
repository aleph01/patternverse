import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CompiledCorpus } from '@patternverse/compiler';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';

let initialized = false;
/** Public declared resources only. Rust validates their schemas and records. */
export function dataRegistry(corpus: CompiledCorpus) {
  const libraries = corpus.libraries ?? {};
  if (!initialized) {
    initSync({
      module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
    });
    initialized = true;
  }
  editor(JSON.stringify({ operation: 'validate_data', data: libraries }));
  return Object.entries(libraries).map(([id, data]) => ({
    id,
    data,
    revision: createHash('sha256').update(JSON.stringify(data)).digest('hex'),
  }));
}
