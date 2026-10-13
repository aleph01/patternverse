// Read-only migration planner. Apply the emitted patch with apply_patch; this
// script never rewrites articles, frontmatter, or personal IndexedDB records.
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { legacyPracticeSource, parsePracticeFromBody } from '../packages/compiler/dist/practice.js';

const root = resolve(import.meta.dirname, '..');
const changes = [];
for (const directory of ['patterns', 'practices']) {
  const base = resolve(root, 'content', directory);
  for (const name of (await readdir(base)).sort()) {
    if (!name.endsWith('.md')) continue;
    const path = resolve(base, name);
    const before = await readFile(path, 'utf8');
    if (!before.includes('```patternverse-practice')) continue;
    const parsed = parsePracticeFromBody(before);
    if (parsed.errors.length || !parsed.practice)
      throw new Error(`${path}: ${parsed.errors.join('; ')}`);
    const replacement = `\`\`\`patternverse-language\n${legacyPracticeSource(parsed.practice).trimEnd()}\n\`\`\``;
    const after = before.replace(
      /^```patternverse-practice[^\n]*\n[\s\S]*?^```[ \t]*/m,
      replacement,
    );
    if (after === before || after.includes('```patternverse-practice'))
      throw new Error(`Incomplete conversion: ${path}`);
    changes.push(
      `*** Update File: ${path}\n@@\n${before
        .trimEnd()
        .split('\n')
        .map((line) => '-' + line)
        .join('\n')}\n${after
        .trimEnd()
        .split('\n')
        .map((line) => '+' + line)
        .join('\n')}`,
    );
  }
}
process.stdout.write(`*** Begin Patch\n${changes.join('\n')}\n*** End Patch\n`);
