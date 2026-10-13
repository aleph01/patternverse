import { readFile } from 'node:fs/promises';
import { z } from 'zod';

export type SourceBundle = { root: string; patterns: Record<string, string> };
const inspectionSchema = z.object({
  root: z.string(),
  snapshot_id: z.string(),
  revision: z.string(),
  inputs: z.record(z.string(), z.unknown()),
  outputs: z.record(z.string(), z.unknown()),
  sources: z.record(z.string(), z.string()),
});
export type DefinitionInspection = z.infer<typeof inspectionSchema>;
export type InspectDefinition = (bundle: SourceBundle) => DefinitionInspection;

/** Node I/O adapter for the same Rust inspection used by the browser bridge. */
export async function loadDefinitionInspector(): Promise<InspectDefinition> {
  const bridgeUrl = new URL('./engine/pattern_wasm.js', import.meta.url);
  const bridge = (await import(bridgeUrl.href)) as {
    initSync: (input: { module: Uint8Array }) => unknown;
    editor: (request: string) => string;
  };
  bridge.initSync({
    module: await readFile(new URL('./engine/pattern_wasm_bg.wasm', import.meta.url)),
  });
  return (bundle) =>
    inspectionSchema.parse(
      JSON.parse(bridge.editor(JSON.stringify({ operation: 'inspect_bundle', bundle }))),
    );
}
