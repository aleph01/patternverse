#!/usr/bin/env node

import { resolve } from 'node:path';

import { formatDiagnostic, hasErrors } from './diagnostics.js';
import { loadAndCompileCorpus, writeCompiledCorpus } from './filesystem.js';

const arguments_ = process.argv.slice(2);
const command =
  arguments_[0] === 'build' || arguments_[0] === 'validate' ? arguments_[0] : 'validate';
const positional = command === arguments_[0] ? arguments_.slice(1) : arguments_;
const excludeDrafts = positional.includes('--exclude-drafts');
const paths = positional.filter((argument) => argument !== '--exclude-drafts');
const [manifestArgument = 'patternverse.yaml', contentArgument = 'content', outputArgument] = paths;

const manifestPath = resolve(manifestArgument);
const contentDirectory = resolve(contentArgument);
const result = await loadAndCompileCorpus(
  {
    manifestPath,
    contentDirectory,
    readonly: true,
  },
  { includeDrafts: !excludeDrafts },
);

for (const diagnostic of result.diagnostics) {
  const output = `${formatDiagnostic(diagnostic)}\n`;
  if (diagnostic.severity === 'error') console.error(output);
  else console.warn(output);
}

if (hasErrors(result.diagnostics)) {
  console.error(
    `Patternverse content ${command === 'build' ? 'build' : 'validation'} failed with ${result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length} error(s).`,
  );
  process.exitCode = 1;
} else if (command === 'build') {
  const outputPath = resolve(outputArgument ?? 'generated/commons.json');
  await writeCompiledCorpus(outputPath, result);
  console.log(`Compiled ${result.entities.length} entities to ${outputPath}.`);
} else {
  console.log(
    `Validated ${result.entities.length} entities across ${result.sources.length} source(s).`,
  );
}
