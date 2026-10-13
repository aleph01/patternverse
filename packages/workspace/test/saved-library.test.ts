import { describe, expect, it } from 'vitest';
import { isInMyLibrary, savedLibraryKeys } from '../src/library.js';

describe('personal library membership', () => {
  it('includes all personal content and only source-qualified saved public references', () => {
    const keys = savedLibraryKeys([
      {
        workspaceId: 'mine',
        ref: { sourceId: 'commons', entityId: 'observer' },
        createdAt: '2026-10-06',
      },
      {
        workspaceId: 'mine',
        ref: { sourceId: 'other', entityId: 'builder' },
        createdAt: '2026-10-06',
      },
    ]);
    expect(isInMyLibrary({ sourceId: 'personal', id: 'unsaved' }, keys)).toBe(true);
    expect(isInMyLibrary({ sourceId: 'commons', id: 'observer' }, keys)).toBe(true);
    expect(isInMyLibrary({ sourceId: 'other', id: 'observer' }, keys)).toBe(false);
    expect(isInMyLibrary({ sourceId: 'commons', id: 'builder' }, keys)).toBe(false);
    expect(isInMyLibrary({ sourceId: 'other', id: 'builder' }, keys)).toBe(true);
  });
});
