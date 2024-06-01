import { Client, cacheExchange, fetchExchange } from 'urql';
import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env.VITE_SANITY_DATASET,
  useCdn: import.meta.env.VITE_SANITY_USE_CDN,
  apiVersion: import.meta.env.VITE_SANITY_API_VERSION,
})

export const graphqlClient = new Client({
  url: import.meta.env.VITE_SANITY_GRAPHQL_URL,
  exchanges: [cacheExchange, fetchExchange],
  fetchOptions: () => {
    return {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Connection': 'keep-alive',
        'DNT': '1',
        'Origin': 'https://4xrppoqh.api.sanity.io',
      },
    };
  },
});