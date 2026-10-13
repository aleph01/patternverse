import { expect, it } from 'vitest';
import { entityRefKey as sharedKey } from '@patternverse/schema';
import { entityRefKey as compilerKey } from '../src/compile.js';

it('keeps the compiler reference export compatible with the shared identity helper', () => {
  expect(compilerKey).toBe(sharedKey);
  expect(compilerKey({ sourceId: 'commons', entityId: 'same-id' })).toBe('commons:same-id');
});
