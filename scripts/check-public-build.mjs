import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const credentialPatterns = [
  /sk-or-v1-[a-zA-Z0-9]{20,}/,
  /sk-(?:proj-)?[a-zA-Z0-9_-]{40,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
];

/** Return filenames only: never print credentials, even when rejecting an artifact. */
export async function inspectPublicBuild(root) {
  const failures = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isSymbolicLink()) failures.push(`${relative(root, path)}: symlink`);
      else if (/^(?:\.env(?:\..*)?|\.git)$|\.(?:pem|key|map)$/i.test(entry.name))
        failures.push(`${relative(root, path)}: private/build-only file`);
      else if (/\.(?:js|json|html|txt|css|xml|webmanifest)$/i.test(entry.name)) {
        const text = await readFile(path, 'utf8');
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
      }
    }
  }
  await visit(root);
  return failures;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = await inspectPublicBuild(resolve(process.argv[2] ?? 'apps/web/build'));
  if (failures.length) {
    console.error(`Public build rejected:\n${failures.join('\n')}`);
    process.exitCode = 1;
  } else console.log('Public build credential/file checks passed (not a complete security audit).');
}
