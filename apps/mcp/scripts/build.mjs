import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const app = new URL('../', import.meta.url);
await build({
  entryPoints: [fileURLToPath(new URL('src/index.ts', app))],
  outfile: fileURLToPath(new URL('dist/index.js', app)),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // The existing YAML compiler dependency contains CommonJS Node built-in imports.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  external: ['@modelcontextprotocol/server', '@modelcontextprotocol/server/stdio'],
});
await mkdir(new URL('dist/engine/', app), { recursive: true });
for (const file of ['pattern_wasm.js', 'pattern_wasm_bg.wasm']) {
  // Reuse the generated Rust bridge. No Svelte or Mira UI is bundled.
  await copyFile(
    new URL(`../web/src/lib/mira/engine/${file}`, app),
    new URL(`dist/engine/${file}`, app),
  );
}
await build({
  entryPoints: [fileURLToPath(new URL('src/build-snapshot.ts', app))],
  outfile: fileURLToPath(new URL('dist/build-snapshot.js', app)),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});
execFileSync(process.execPath, [fileURLToPath(new URL('dist/build-snapshot.js', app))], {
  stdio: 'inherit',
});
await build({
  entryPoints: [fileURLToPath(new URL('src/build-widget.ts', app))],
  outfile: fileURLToPath(new URL('dist/build-widget.js', app)),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
});
execFileSync(process.execPath, [fileURLToPath(new URL('dist/build-widget.js', app))], {
  stdio: 'inherit',
});
await build({
  entryPoints: [fileURLToPath(new URL('src/worker.ts', app))],
  outfile: fileURLToPath(new URL('dist/worker.js', app)),
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2022',
  conditions: ['workerd', 'browser'],
  external: ['node:*'],
  minify: true,
  metafile: true,
}).then(({ metafile }) => {
  const unwanted = Object.keys(metafile.inputs).filter((name) =>
    /\/mira\/|pattern_wasm|\/filesystem\./.test(name),
  );
  if (unwanted.length)
    throw new Error(`Unexpected runtime dependency in Worker: ${unwanted.join(', ')}`);
  console.log(
    `Worker bundle: ${Object.values(metafile.outputs)[0].bytes} bytes. No filesystem or language engine bundled.`,
  );
});
