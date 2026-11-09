import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadCommons } from '$lib/server/commons';
import { articleNavigationAsset } from '$lib/server/article-navigation';

export const prerender = true;
export const entries = async () => [
  { hash: articleNavigationAsset(await loadCommons()).asset.sha256 },
];
export const GET: RequestHandler = async ({ params }) => {
  const { body, asset } = articleNavigationAsset(await loadCommons());
  if (params.hash !== asset.sha256) error(404, 'This navigation snapshot is unavailable.');
  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
};
