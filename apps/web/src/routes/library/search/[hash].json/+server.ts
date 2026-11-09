import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadCommons } from '$lib/server/commons';
import { librarySearchAsset } from '$lib/server/library-search';

export const prerender = true;
export const entries = async () => [{ hash: librarySearchAsset(await loadCommons()).asset.sha256 }];

export const GET: RequestHandler = async ({ params }) => {
  const { body, asset } = librarySearchAsset(await loadCommons());
  if (params.hash !== asset.sha256) error(404, 'This search snapshot is unavailable.');
  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
};
