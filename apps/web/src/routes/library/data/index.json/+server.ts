import { json } from '@sveltejs/kit';
import { base } from '$app/paths';
import { loadCommons } from '$lib/server/commons';
import { dataRegistry } from '$lib/server/data-libraries';
export const prerender = true;
export const GET = async () =>
  json(
    Object.fromEntries(
      dataRegistry(await loadCommons()).map(({ id, revision }) => [
        id,
        { revision, path: `${base}/library/data/${revision}.json` },
      ]),
    ),
  );
