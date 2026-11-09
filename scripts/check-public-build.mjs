import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const credentialPatterns = [
  /sk-or-v1-[a-zA-Z0-9]{20,}/,
  /\bsk-(?:proj-)?[a-zA-Z0-9_-]{40,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
];

/** Return filenames only: never print credentials, even when rejecting an artifact. */
export async function inspectPublicBuild(root) {
  const failures = [];
  const clientStartupIds = new Set();
  const pageStartupIds = new Map();
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (/^apps\/tender-wilds(?:[/.]|$)/.test(relative(root, path).split('\\').join('/')))
        failures.push(`${relative(root, path)}: unpublished Tender Wilds route`);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isSymbolicLink()) failures.push(`${relative(root, path)}: symlink`);
      else if (/^(?:\.env(?:\..*)?|\.git)$|\.(?:pem|key|map)$/i.test(entry.name))
        failures.push(`${relative(root, path)}: private/build-only file`);
      else if (/\.(?:js|json|html|txt|css|xml|webmanifest)$/i.test(entry.name)) {
        const text = await readFile(path, 'utf8');
        // A concurrent SvelteKit sync can replace generated server options
        // during a build. The HTML then seeds a different global from the one
        // the client reads, crashing before hydration with an undefined payload.
        if (path.endsWith('.js')) {
          for (const match of text.matchAll(/globalThis\.(__sveltekit_[a-z0-9]+)\b/g))
            clientStartupIds.add(match[1]);
        } else if (path.endsWith('.html')) {
          const ids = [...text.matchAll(/\b(__sveltekit_[a-z0-9]+)\s*=\s*\{/g)].map(
            (match) => match[1],
          );
          if (ids.length) pageStartupIds.set(relative(root, path), ids);
        }
        if (credentialPatterns.some((pattern) => pattern.test(text)))
          failures.push(`${relative(root, path)}: possible credential`);
        if (
          /illustration-studio|tools\/illustrations|Make an illustration|SVG downloaded\. You can edit its shapes|Pattern (?:mark|icon) studio|Keep this (?:mark|icon)|__pattern-mark-studio|Saved (?:marks|icons) on this device|100 generated icons/.test(
            text,
          )
        )
          failures.push(`${relative(root, path)}: private illustration studio`);
        if (/show-demo|Local authoring preview · not a public page/.test(text))
          failures.push(`${relative(root, path)}: private show preview`);
        if (/Tender Wilds|patternverse-tender-wilds-v1/.test(text))
          failures.push(`${relative(root, path)}: unpublished Tender Wilds app`);
      }
    }
  }
  await visit(root);
  for (const [path, ids] of pageStartupIds) {
    if (ids.some((id) => !clientStartupIds.has(id)))
      failures.push(`${path}: startup identifier does not match the client build`);
  }
  return failures;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = await inspectPublicBuild(resolve(process.argv[2] ?? 'apps/web/build'));
  if (failures.length) {
    console.error(`Public build rejected:\n${failures.join('\n')}`);
    process.exitCode = 1;
  } else console.log('Public build credential/file checks passed (not a complete security audit).');
}
