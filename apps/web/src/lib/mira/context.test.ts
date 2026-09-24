import { describe, expect, it } from 'vitest';
import { findMiraPattern, miraPatternQuery, parseMiraPatternQuery } from './context';

const commons = { sourceId: 'commons', id: 'abc-diary', type: 'pattern', title: 'ABC diary' };
const personal = { sourceId: 'personal', id: 'abc-diary', type: 'pattern', title: 'My ABC diary' };

describe('Mira pattern context', () => {
  it('round-trips a source-qualified library reference', () => {
    const reference = { sourceId: 'commons', entityId: 'abc-diary' };
    expect(parseMiraPatternQuery(new URLSearchParams(miraPatternQuery(reference)))).toEqual(
      reference,
    );
  });

  it('does not infer a source from a bare pattern ID', () => {
    expect(parseMiraPatternQuery(new URLSearchParams('pattern=abc-diary'))).toBeNull();
  });

  it('selects the exact source when titles or IDs overlap', () => {
    expect(
      findMiraPattern({ sourceId: 'personal', entityId: 'abc-diary' }, [commons, personal]),
    ).toEqual(personal);
  });

  it('never treats another entity type as a pattern', () => {
    expect(
      findMiraPattern({ sourceId: 'commons', entityId: 'abc-diary' }, [
        { ...commons, type: 'concept' },
      ]),
    ).toBeNull();
  });
});
