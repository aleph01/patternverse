import { error, json } from '@sveltejs/kit';
import { loadCommons } from '$lib/server/commons';
import { dataRegistry } from '$lib/server/data-libraries';
export const prerender = true;
export const entries = async () =>
  dataRegistry(await loadCommons()).map(({ revision }) => ({ revision }));
export const GET = async ({ params }: { params: { revision: string } }) => {
  const item = dataRegistry(await loadCommons()).find(
    ({ revision }) => revision === params.revision,
  );
  if (!item) error(404, 'Data resource unavailable.');
  return json(item.data);
};
