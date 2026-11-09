import { loadCommons } from '$lib/server/commons';
import { bearingsCatalog } from '$lib/bearings/catalog';

export const load = async () => {
  const { entities } = await loadCommons();
  return {
    patterns: bearingsCatalog(entities),
    // Relationship metadata lets private collections resolve published items in the browser.
    // Article bodies and executable sources are already provided where needed in the catalog.
    references: entities.map((entity) => ({
      ...entity,
      body: '',
      wikiLinks: [],
      links: [],
      backlinks: [],
      practice: undefined,
      languagePracticeSource: undefined,
    })),
  };
};
