import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { libraryFromSnapshot, type PublicSnapshot } from './snapshot.js';
import { INLINE_PRACTICE_ID } from './widget.js';

const app = new URL('../', import.meta.url);
const snapshot: PublicSnapshot = JSON.parse(
  await readFile(new URL('dist/public-snapshot.json', app), 'utf8'),
);
const practice = libraryFromSnapshot(snapshot).getPractice(INLINE_PRACTICE_ID);
if (practice.dependencies.length)
  throw new Error('The inline slice requires a dependency-free practice.');
await writeFile(new URL('dist/widget-practice.json', app), JSON.stringify(practice));
execFileSync('pnpm', ['exec', 'vite', 'build', '--config', 'mcp-widget.vite.config.ts'], {
  cwd: fileURLToPath(new URL('../web/', app)),
  stdio: 'inherit',
});
const html = (await readFile(new URL('dist/assets/mcp/ui/index.html', app), 'utf8')).replaceAll(
  '"/mcp/ui/',
  '"https://patternverse.org/mcp/ui/',
);
await writeFile(
  new URL('dist/widget-resource.json', app),
  JSON.stringify({ html, revision: practice.revision }),
);
