import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(new URL('../dist/engine/', import.meta.url), { recursive: true });
// Same generated Rust bridge as the website. No second language implementation.
for (const filename of ['pattern_wasm.js', 'pattern_wasm_bg.wasm'])
  await copyFile(
    new URL(`../../web/src/lib/mira/engine/${filename}`, import.meta.url),
    new URL(`../dist/engine/${filename}`, import.meta.url),
  );
await build({
  entryPoints: [new URL('../src/build-manifest.ts', import.meta.url).pathname],
  outfile: new URL('../dist/build-manifest.js', import.meta.url).pathname,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
});
execFileSync(process.execPath, ['dist/build-manifest.js'], { cwd: root, stdio: 'inherit' });
