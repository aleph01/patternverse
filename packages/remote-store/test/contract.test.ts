import { createInMemoryRemoteCorpusStore, type InMemoryRemoteCorpusStore } from '../src/index.js';
import { runRemoteCorpusStoreContractTests } from '../src/testing/index.js';

runRemoteCorpusStoreContractTests({
  name: 'InMemoryRemoteCorpusStore',
  createContext: () => {
    const store = createInMemoryRemoteCorpusStore();
    const connection = store.createConnection();
    return {
      store,
      connection,
      expireConnection: () => store.expireConnection(connection),
      injectFailure: (failure) => store.injectFailure(failure),
    } satisfies {
      readonly store: InMemoryRemoteCorpusStore;
      readonly connection: ReturnType<InMemoryRemoteCorpusStore['createConnection']>;
      readonly expireConnection: () => void;
      readonly injectFailure: InMemoryRemoteCorpusStore['injectFailure'];
    };
  },
});
