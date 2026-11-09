import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { repertoireCatalog } from './catalog';
import songbook from '../../../../../docs/music-course/songbook.json';

/** Read-only local fixture routes. Never part of the public application build. */
export function musicDemoServer(
  repository: string,
  privateMidi?: string,
  privateDirectory = resolve(repository, '.local/music-repertoire'),
): Plugin {
  const files = new Map(
    repertoireCatalog.flatMap((entry) => {
      const path = entry.private
        ? entry.id === 'wonder-superstition-demo' && privateMidi
          ? privateMidi
          : resolve(privateDirectory, entry.file)
        : resolve(repository, 'docs/musical-composition/midi-research', entry.file);
      return path ? [[entry.id, path] as const] : [];
    }),
  );
  const songbookIds = new Set(
    songbook.songs.filter((entry) => entry.state === 'prepared-draft').map((entry) => entry.id),
  );
  return {
    name: 'local-repertoire-midi',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname;
        const studyFiles: Record<string, [string, string]> = {
          '/song-studies/no-surprises.json': ['no-surprises/study.json', 'application/json'],
          '/song-studies/seven-nation-army.json': [
            'seven-nation-army/study.json',
            'application/json',
          ],
          '/song-studies/code-monkey.json': ['code-monkey/study.json', 'application/json'],
          '/song-studies/code-monkey.mp3': ['code-monkey/recording.mp3', 'audio/mpeg'],
          '/song-studies/code-monkey.mid': ['code-monkey/study.mid', 'audio/midi'],
          '/song-studies/songbook.json': ['songbook/index.json', 'application/json'],
        };
        const songbookId = /^\/song-studies\/songbook\/([a-z0-9-]+)\.json$/.exec(path)?.[1];
        const study =
          studyFiles[path] ??
          (songbookId && songbookIds.has(songbookId)
            ? ([`songbook/${songbookId}.json`, 'application/json'] as const)
            : undefined);
        if (study) {
          if (request.method !== 'GET' && request.method !== 'HEAD') {
            response.statusCode = 405;
            response.setHeader('Allow', 'GET, HEAD');
            return response.end();
          }
          response.setHeader('Cache-Control', 'no-store');
          try {
            const body = await readFile(resolve(repository, '.local/music-song-studies', study[0]));
            response.setHeader('Content-Type', study[1]);
            response.setHeader('Accept-Ranges', 'bytes');
            let start = 0,
              end = body.length - 1;
            if (request.headers.range) {
              const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
              if (!range || (!range[1] && !range[2])) {
                response.statusCode = 416;
                response.setHeader('Content-Range', `bytes */${body.length}`);
                return response.end();
              }
              start = range[1] ? Number(range[1]) : Math.max(0, body.length - Number(range[2]));
              end =
                range[1] && range[2]
                  ? Math.min(body.length - 1, Number(range[2]))
                  : body.length - 1;
              if (start > end || start >= body.length) {
                response.statusCode = 416;
                response.setHeader('Content-Range', `bytes */${body.length}`);
                return response.end();
              }
              response.statusCode = 206;
              response.setHeader('Content-Range', `bytes ${start}-${end}/${body.length}`);
            } else response.statusCode = 200;
            response.setHeader('Content-Length', end - start + 1);
            return response.end(
              request.method === 'HEAD' ? undefined : body.subarray(start, end + 1),
            );
          } catch {
            response.statusCode = 404;
            return response.end('This local song study has not been prepared.');
          }
        }
        if (!path.startsWith('/repertoire/')) return next();
        response.setHeader('Cache-Control', 'no-store');
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          response.statusCode = 405;
          response.setHeader('Allow', 'GET, HEAD');
          return response.end();
        }
        try {
          let body: string | Buffer;
          if (path === '/repertoire/catalog.json') {
            const available = await Promise.all(
              repertoireCatalog.map(async (entry) => {
                const file = files.get(entry.id);
                if (!file) return null;
                const present = await stat(file).catch(() => null);
                return present?.isFile() ? entry : null;
              }),
            );
            body = JSON.stringify(available.filter(Boolean));
            response.setHeader('Content-Type', 'application/json');
          } else {
            const id = /^\/repertoire\/([a-z0-9-]+)\.mid$/.exec(path)?.[1];
            const file = id ? files.get(id) : undefined;
            if (!file) {
              response.statusCode = 404;
              return response.end('MIDI example not found.');
            }
            body = await readFile(file);
            response.setHeader('Content-Type', 'audio/midi');
          }
          response.statusCode = 200;
          response.end(request.method === 'HEAD' ? undefined : body);
        } catch {
          response.statusCode = 503;
          response.end('This local example could not load.');
        }
      });
    },
  };
}
