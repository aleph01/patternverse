import { mkdir, readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

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

  const libraries: Record<string, import('./types.js').DataLibrary> = {};
  const contentRoot = await realpath(options.contentDirectory);
  for (const result of parseResults) {
    const entity = result.entity;
    if (!entity) continue;
    for (const library of entity.libraries ?? []) {
      const key = `${entity.sourceId}:${library.id}`;
      try {
        if (Object.hasOwn(libraries, key)) throw new Error(`Duplicate data library ${key}`);
        const file = await realpath(
          resolve(dirname(options.manifestPath), dirname(entity.sourcePath!), library.src),
        );
        if (!file.startsWith(contentRoot + sep) || (await stat(file)).size > 1_048_576)
          throw new Error('Data library must stay within content and not exceed 1 MiB.');
        const value: unknown = JSON.parse(await readFile(file, 'utf8'));
        if (!value || typeof value !== 'object' || Array.isArray(value))
          throw new Error('Data library must be an object.');
        const data = value as Record<string, unknown>;
        if (
          Object.keys(data).some((key) => !['record_type', 'records'].includes(key)) ||
          !data.record_type ||
          !Array.isArray(data.records) ||
          data.records.length > 1000
        )
          throw new Error('Data library requires record_type and up to 1000 records.');
        const ids = new Set<string>();
        for (const record of data.records) {
          if (
            !record ||
            typeof record !== 'object' ||
            typeof record.id !== 'string' ||
            !record.id.trim() ||
            record.id.length > 128 ||
            ids.has(record.id)
          )
            throw new Error('Data ids must be unique, nonblank text of at most 128 characters.');
          ids.add(record.id);
        }
        libraries[key] = data as unknown as import('./types.js').DataLibrary;
      } catch (error) {
        diagnostics.push({
          code: 'invalid-data-library',
          severity: 'error',
          file: entity.sourcePath,
          message: error instanceof Error ? error.message : 'Could not load data library.',
        });
      }
    }
  }
  return {
    ...(Object.keys(libraries).length ? { libraries } : {}),
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
  const providers = new Set(
    compiled.entities.flatMap((entity) =>
      (entity.libraries ?? []).map((library) => `${entity.sourceId}:${library.id}`),
    ),
  );
  const libraries = Object.fromEntries(
    Object.entries(loaded.libraries ?? {}).filter(([id]) => providers.has(id)),
  );
  return {
    ...compiled,
    ...(Object.keys(libraries).length ? { libraries } : {}),
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
