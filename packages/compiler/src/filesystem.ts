import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

import { sourceManifestSchema } from '@patternverse/schema';
import { parse as parseYaml } from 'yaml';

import { compileCorpus } from './compile.js';
import { diagnosticsFromZodError } from './diagnostics.js';
import { parseMarkdownEntity } from './markdown.js';
import type { CompileOptions, CompiledCorpus, CompilerDiagnostic, LoadedCorpus } from './types.js';

export const CONTENT_DIRECTORIES = [
  'patterns',
  'concepts',
  'practices',
  'collections',
  'verses',
] as const;

const discoverMarkdownFiles = async (directory: string): Promise<readonly string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return discoverMarkdownFiles(path);
      return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
    }),
  );
  return nested.flat().sort();
};

export type LoadCorpusOptions = {
  readonly manifestPath: string;
  readonly contentDirectory: string;
  readonly readonly: boolean;
  readonly unknownFieldPolicy?: 'error' | 'warning';
};

export const loadCorpus = async (options: LoadCorpusOptions): Promise<LoadedCorpus> => {
  const diagnostics: CompilerDiagnostic[] = [];
  let manifestValue: unknown;

  try {
    manifestValue = parseYaml(await readFile(options.manifestPath, 'utf8'));
  } catch (error) {
    return {
      entities: [],
      diagnostics: [
        {
          code: 'io-error',
          severity: 'error',
          file: options.manifestPath,
          message: error instanceof Error ? error.message : 'Unable to read the corpus manifest.',
        },
      ],
    };
  }

  const manifestResult = sourceManifestSchema.safeParse(manifestValue);
  if (!manifestResult.success) {
    return {
      entities: [],
      diagnostics: diagnosticsFromZodError(manifestResult.error, {
        file: options.manifestPath,
        prefix: 'manifest',
      }),
    };
  }

  const discoveredFiles = await Promise.all(
    CONTENT_DIRECTORIES.map(async (directory) => {
      const fullDirectory = join(options.contentDirectory, directory);
      try {
        return await discoverMarkdownFiles(fullDirectory);
      } catch {
        diagnostics.push({
          code: 'missing-content-directory',
          severity: 'warning',
          file: fullDirectory,
          message: `Content directory "${directory}" is missing; it is treated as empty.`,
        });
        return [];
      }
    }),
  );

  const filePaths = discoveredFiles.flat().sort();
  const parseResults = await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const markdown = await readFile(filePath, 'utf8');
        return parseMarkdownEntity(markdown, {
          sourceId: manifestResult.data.id,
          sourcePath: relative(dirname(options.manifestPath), filePath),
          unknownFieldPolicy:
            options.unknownFieldPolicy ?? (options.readonly ? 'error' : 'warning'),
        });
      } catch (error) {
        return {
          diagnostics: [
            {
              code: 'io-error' as const,
              severity: 'error' as const,
              file: filePath,
              message: error instanceof Error ? error.message : 'Unable to read the Markdown file.',
            },
          ],
        };
      }
    }),
  );

  return {
    manifest: manifestResult.data,
    source: {
      id: manifestResult.data.id,
      name: manifestResult.data.name,
      readonly: options.readonly,
    },
    entities: parseResults.flatMap((result) => (result.entity ? [result.entity] : [])),
    diagnostics: [...diagnostics, ...parseResults.flatMap((result) => result.diagnostics)],
  };
};

export const loadAndCompileCorpus = async (
  loadOptions: LoadCorpusOptions,
  compileOptions: CompileOptions = {},
): Promise<CompiledCorpus> => {
  const loaded = await loadCorpus(loadOptions);
  const compiled = compileCorpus(
    loaded.entities,
    loaded.source ? [loaded.source] : [],
    compileOptions,
  );
  return {
    ...compiled,
    diagnostics: [...loaded.diagnostics, ...compiled.diagnostics],
  };
};

export const writeCompiledCorpus = async (
  outputPath: string,
  corpus: CompiledCorpus,
): Promise<void> => {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');
};
