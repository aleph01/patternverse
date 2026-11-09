import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gofExamples } from './gof-examples.mjs';

const root = resolve(import.meta.dirname, '..');
const metadata = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/gof.json'), 'utf8'),
);

for (const pattern of metadata.patterns) {
  const article = await readFile(resolve(root, `content/patterns/${pattern.id}.md`), 'utf8');
  const code = article.match(/```python\n([\s\S]*?)\n```/)?.[1];
  if (!code) throw new Error(`Missing Python example: ${pattern.id}`);
  const checks =
    pattern.id === 'strategy'
      ? 'assert standard(Shipment(3)).amount_cents == 800\nassert express(Shipment(3)).amount_cents == 1500\nassert checkout(Shipment(3), lambda _: Quote(0)) == "Delivery: 0 cents EUR"'
      : gofExamples[pattern.id]?.checks;
  if (!checks) throw new Error(`Missing behavior checks: ${pattern.id}`);
  const result = spawnSync('python3', ['-I', '-'], {
    input: `${code}\n\n${checks}\n`,
    encoding: 'utf8',
    timeout: 10_000,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${pattern.id}: ${result.error?.message ?? result.stderr}`);
  }
}
console.log(
  `All ${metadata.patterns.length} published GoF code examples pass their behavior checks.`,
);
