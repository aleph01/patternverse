import { randomUUID } from 'node:crypto';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import {
  MAX_MARK_PROJECT_BYTES,
  MAX_SAVED_MARKS,
  parseMarkProject,
  type MarkProject,
} from '../../lib/illustrations/pattern-marks.js';

export function mergeApprovedMarks(
  current: MarkProject,
  incoming: MarkProject,
  ids: ReadonlySet<string>,
): MarkProject {
  if (incoming.marks.some((mark) => !ids.has(mark.patternId)))
    throw new Error(
      'Apply only patterns from the public library. Custom IDs can be exported as SVG instead.',
    );
  const marks = new Map(current.marks.map((mark) => [mark.patternId, mark]));
  for (const mark of incoming.marks) marks.set(mark.patternId, mark);
  if (marks.size > MAX_SAVED_MARKS)
    throw new Error('The library mark registry exceeds 200 entries.');
  return {
    kind: 'patternverse-marks',
    version: 2,
    marks: [...marks.values()].sort((a, b) => a.patternId.localeCompare(b.patternId)),
  };
}

/** The authoring endpoint exists only in this loopback-only Vite development server. */
export function patternMarkStudioServer(repositoryRoot: string, registry: string): Plugin {
  const token = randomUUID();
  let applyQueue: Promise<void> = Promise.resolve();
  return {
    name: 'personal-pattern-mark-studio',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith('/__pattern-mark-studio/')) {
          next();
          return;
        }
        const host = request.headers.host;
        const port = server.config.server.port ?? 4201;
        if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
          response.writeHead(403);
          response.end();
          return;
        }
        const send = (status: number, value: unknown) => {
          response.writeHead(status, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          });
          response.end(JSON.stringify(value));
        };
        try {
          const isCatalog =
            request.url === '/__pattern-mark-studio/catalog' && request.method === 'GET';
          const isApply =
            request.url === '/__pattern-mark-studio/apply' && request.method === 'POST';
          if (!isCatalog && !isApply) {
            send(404, { error: 'Not found.' });
            return;
          }
          if (
            isApply &&
            (request.headers.origin !== `http://${host}` ||
              request.headers['x-patternverse-studio'] !== token ||
              request.headers['content-type'] !== 'application/json')
          ) {
            send(403, { error: 'Open the private local studio to apply marks.' });
            return;
          }
          const { hasErrors, loadAndCompileCorpus } = (await server.ssrLoadModule(
            '@patternverse/compiler',
          )) as typeof import('@patternverse/compiler');
          const corpus = await loadAndCompileCorpus(
            {
              manifestPath: resolve(repositoryRoot, 'patternverse.yaml'),
              contentDirectory: resolve(repositoryRoot, 'content'),
              readonly: true,
            },
            { includeDrafts: false },
          );
          if (hasErrors(corpus.diagnostics))
            throw new Error('The public catalogue could not be validated.');
          const patterns = corpus.entities
            .filter((entity) => entity.type === 'pattern')
            .map(({ id, title }) => ({ id, title }))
            .sort((a, b) => a.title.localeCompare(b.title));
          if (isCatalog) {
            send(200, { patterns, token });
            return;
          }
          const chunks: Buffer[] = [];
          let bytes = 0;
          for await (const chunk of request) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            bytes += buffer.length;
            if (bytes > MAX_MARK_PROJECT_BYTES) {
              send(413, { error: 'The project is too large.' });
              return;
            }
            chunks.push(buffer);
          }
          const incoming = parseMarkProject(Buffer.concat(chunks).toString('utf8'));
          // Serialize read/merge/write so concurrent tabs cannot lose unrelated recipes.
          const applyJob = applyQueue.then(async () => {
            const current = parseMarkProject(await readFile(registry, 'utf8'));
            const merged = mergeApprovedMarks(
              current,
              incoming,
              new Set(patterns.map((pattern) => pattern.id)),
            );
            const temporary = `${registry}.${token}.tmp`;
            await writeFile(temporary, JSON.stringify(merged, null, 2) + '\n', 'utf8');
            await rename(temporary, registry);
          });
          applyQueue = applyJob.catch(() => {});
          await applyJob;
          send(200, { applied: incoming.marks.length });
        } catch (error) {
          send(400, { error: error instanceof Error ? error.message : 'Could not apply marks.' });
        }
      });
    },
  };
}
