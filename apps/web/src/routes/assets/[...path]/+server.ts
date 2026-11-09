import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, RequestHandler } from './$types';
import { assetMimeType, contentAssetPaths, contentAssetsRoot } from '$lib/server/content-assets';

export const prerender = true;

export const entries: EntryGenerator = async () =>
  (await contentAssetPaths()).map((path) => ({ path }));

export const GET: RequestHandler = async ({ params }) => {
  const contentType = assetMimeType(params.path);
  if (!contentType) error(404, 'Unknown content asset.');
  try {
    return new Response(new Uint8Array(await readFile(join(contentAssetsRoot, params.path))), {
      headers: { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    error(404, 'Content asset not found.');
  }
};
