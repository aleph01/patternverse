// @vitest-environment jsdom
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompiledCorpus, loadAndCompileCorpus } from '@patternverse/compiler';

const mocks = vi.hoisted(() => ({
  environment: { dev: false },
  compile: vi.fn<typeof loadAndCompileCorpus>(),
}));

vi.mock('$app/environment', () => mocks.environment);
vi.mock('@patternverse/compiler', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@patternverse/compiler')>()),
  loadAndCompileCorpus: mocks.compile,
}));

const emptyCorpus = (): CompiledCorpus => ({
  schemaVersion: 1,
  sources: [],
  entities: [],
  searchDocuments: [],
  unresolvedReferences: [],
  diagnostics: [],
});

beforeEach(() => {
  vi.resetModules();
  mocks.environment.dev = false;
  mocks.compile.mockReset().mockResolvedValue(emptyCorpus());
  vi.stubEnv('PATTERNVERSE_INCLUDE_DRAFTS', undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Commons build snapshots', () => {
  it('keeps the readonly compiler boundary and existing file paths', async () => {
    const { loadCommons } = await import('./commons');
    await loadCommons();
    expect(mocks.compile).toHaveBeenCalledExactlyOnceWith(
      {
        manifestPath: resolve(process.cwd(), '../../patternverse.yaml'),
        contentDirectory: resolve(process.cwd(), '../../content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
  });

  it('reuses a successful production snapshot for subsequent route loads', async () => {
    const { loadCommons } = await import('./commons');
    const first = await loadCommons();
    expect(await loadCommons()).toBe(first);
    expect(await loadCommons()).toBe(first);
    expect(mocks.compile).toHaveBeenCalledTimes(1);
  });

  it('shares in-flight work between concurrent route loads', async () => {
    let complete!: (corpus: CompiledCorpus) => void;
    mocks.compile.mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    const { loadCommons } = await import('./commons');
    const pending = Array.from({ length: 20 }, () => loadCommons());
    expect(new Set(pending).size).toBe(1);
    expect(mocks.compile).toHaveBeenCalledTimes(1);
    const corpus = emptyCorpus();
    complete(corpus);
    expect(await Promise.all(pending)).toEqual(Array(20).fill(corpus));
    expect(await loadCommons()).toBe(corpus);
  });

  it('keeps public and draft-enabled snapshots separate', async () => {
    const publicCorpus = emptyCorpus();
    const draftCorpus = emptyCorpus();
    mocks.compile.mockResolvedValueOnce(publicCorpus).mockResolvedValueOnce(draftCorpus);
    const { loadCommons } = await import('./commons');
    expect(await loadCommons()).toBe(publicCorpus);
    vi.stubEnv('PATTERNVERSE_INCLUDE_DRAFTS', 'true');
    expect(await loadCommons()).toBe(draftCorpus);
    expect(await loadCommons()).toBe(draftCorpus);
    vi.stubEnv('PATTERNVERSE_INCLUDE_DRAFTS', undefined);
    expect(await loadCommons()).toBe(publicCorpus);
    expect(mocks.compile.mock.calls.map(([, options]) => options)).toEqual([
      { includeDrafts: false },
      { includeDrafts: true },
    ]);
  });

  it.each(['false', 'TRUE', '1', ''])('does not enable drafts for the value %j', async (value) => {
    vi.stubEnv('PATTERNVERSE_INCLUDE_DRAFTS', value);
    const { loadCommons } = await import('./commons');
    await loadCommons();
    expect(mocks.compile.mock.calls[0]?.[1]).toEqual({ includeDrafts: false });
  });

  it('re-reads development content, even with an explicit false draft setting', async () => {
    mocks.environment.dev = true;
    vi.stubEnv('PATTERNVERSE_INCLUDE_DRAFTS', 'false');
    const first = emptyCorpus();
    const edited = emptyCorpus();
    mocks.compile.mockResolvedValueOnce(first).mockResolvedValueOnce(edited);
    const { loadCommons } = await import('./commons');
    expect(await loadCommons()).toBe(first);
    expect(await loadCommons()).toBe(edited);
    expect(mocks.compile.mock.calls.map(([, options]) => options)).toEqual([
      { includeDrafts: true },
      { includeDrafts: true },
    ]);
  });

  it('does not retain in-flight development loads across requests', async () => {
    mocks.environment.dev = true;
    const { loadCommons } = await import('./commons');
    await Promise.all([loadCommons(), loadCommons(), loadCommons()]);
    expect(mocks.compile).toHaveBeenCalledTimes(3);
  });

  it('preserves diagnostic formatting and retries after validation errors', async () => {
    mocks.compile.mockResolvedValueOnce({
      ...emptyCorpus(),
      diagnostics: [
        {
          code: 'invalid-entity',
          severity: 'error',
          message: 'Invalid title',
          file: 'patterns/example.md',
          line: 3,
          field: 'title',
          suggestion: 'Supply a title.',
        },
        { code: 'unresolved-reference', severity: 'warning', message: 'Missing related pattern' },
      ],
    });
    const { loadCommons } = await import('./commons');
    await expect(loadCommons()).rejects.toThrow(
      'Patternverse commons could not be loaded:\n\n' +
        'ERROR invalid-entity\npatterns/example.md:line 3\nField: title\n' +
        '  Invalid title\n  Suggestion: Supply a title.\n\n' +
        'WARNING unresolved-reference\n  Missing related pattern',
    );
    const corrected = await loadCommons();
    expect(await loadCommons()).toBe(corrected);
    expect(mocks.compile).toHaveBeenCalledTimes(2);
  });

  it('retains non-fatal warnings in a reusable snapshot', async () => {
    const corpus: CompiledCorpus = {
      ...emptyCorpus(),
      diagnostics: [{ code: 'unknown-field', severity: 'warning', message: 'Import warning' }],
    };
    mocks.compile.mockResolvedValueOnce(corpus);
    const { loadCommons } = await import('./commons');
    expect(await loadCommons()).toBe(corpus);
    expect((await loadCommons()).diagnostics).toEqual(corpus.diagnostics);
    expect(mocks.compile).toHaveBeenCalledTimes(1);
  });

  it('shares a failed load without poisoning retries or the other draft mode', async () => {
    const { loadCommons } = await import('./commons');
    const publicCorpus = await loadCommons();
    vi.stubEnv('PATTERNVERSE_INCLUDE_DRAFTS', 'true');
    const failure = new Error('Content directory unavailable');
    mocks.compile.mockRejectedValueOnce(failure);
    const failures = await Promise.allSettled([loadCommons(), loadCommons(), loadCommons()]);
    expect(failures).toEqual(Array(3).fill({ status: 'rejected', reason: failure }));
    expect(mocks.compile).toHaveBeenCalledTimes(2);
    const repaired = await loadCommons();
    expect(await loadCommons()).toBe(repaired);
    vi.stubEnv('PATTERNVERSE_INCLUDE_DRAFTS', undefined);
    expect(await loadCommons()).toBe(publicCorpus);
    expect(mocks.compile).toHaveBeenCalledTimes(3);
  });

  it('starts with a fresh snapshot in a new server-module lifetime', async () => {
    const first = await import('./commons');
    await first.loadCommons();
    vi.resetModules();
    const nextBuild = await import('./commons');
    await nextBuild.loadCommons();
    expect(mocks.compile).toHaveBeenCalledTimes(2);
  });

  it('shares the real compiled corpus across existing page loaders without changing it', async () => {
    const compiler =
      await vi.importActual<typeof import('@patternverse/compiler')>('@patternverse/compiler');
    mocks.compile.mockImplementation(compiler.loadAndCompileCorpus);
    const { loadCommons } = await import('./commons');
    const corpus = await loadCommons();
    expect(corpus.entities.length).toBeGreaterThan(100);
    const before = JSON.stringify(corpus);
    const [home, library, workspace, editor] = await Promise.all([
      import('../../routes/+page.server'),
      import('../../routes/library/+page.server'),
      import('../../routes/my/+page.server'),
      import('../../routes/editor/+page.server'),
    ]);
    const [homeData, libraryData, workspaceData, editorData] = await Promise.all([
      home.load(),
      library.load(),
      workspace.load(),
      editor.load(),
    ]);
    expect(homeData.verses.map(({ id }) => id)).toEqual(
      corpus.entities.filter(({ type }) => type === 'verse').map(({ id }) => id),
    );
    expect(libraryData.entities).toEqual(workspaceData.entities);
    expect(libraryData.entities).toEqual(editorData.entities);
    expect(libraryData.searchDocuments.map(({ id }) => id)).toEqual(
      corpus.searchDocuments.map(({ id }) => id),
    );
    expect(JSON.stringify(corpus)).toBe(before);
    expect(await loadCommons()).toBe(corpus);
    expect(mocks.compile).toHaveBeenCalledTimes(1);
  });
});
