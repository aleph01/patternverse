import { describe, expect, it } from 'vitest';
import { therapeuticPatternForMethod as eligible } from './pattern-eligibility';
const base = { sourceId: 'personal', id: 'my-pattern', type: 'pattern', title: 'My pattern' };
describe('Mira therapeutic lookup', () => {
  it('excludes software and general knowledge even when tagged CBT', () => {
    expect(eligible({ ...base, tags: ['cbt'] }, 'cbt')).toBe(false);
    expect(eligible({ ...base, verses: ['software-engineering'] }, 'cbt')).toBe(false);
    expect(eligible({ ...base, type: 'concept', verses: ['therapy'] }, 'cbt')).toBe(false);
  });
  it('resolves curated methods only for the exact Commons source', () => {
    expect(eligible({ ...base, sourceId: 'commons', id: 'cbt-thought-record' }, 'cbt')).toBe(true);
    expect(eligible({ ...base, sourceId: 'commons', id: 'cbt-thought-record' }, 'dbt')).toBe(false);
    expect(eligible({ ...base, id: 'cbt-thought-record' }, 'cbt')).toBe(false);
  });
  it('supports explicit method tags and neutral therapeutic patterns', () => {
    expect(eligible({ ...base, verses: ['therapy'], tags: ['method:dbt'] }, 'dbt')).toBe(true);
    expect(eligible({ ...base, verses: ['therapy'], tags: ['method:dbt'] }, 'cbt')).toBe(false);
    expect(eligible({ ...base, verses: ['therapy'], tags: ['CBT', 'narm'] }, 'narm')).toBe(true);
    expect(eligible({ ...base, verses: ['therapy'] }, 'cbt')).toBe(true);
    expect(eligible({ ...base, verses: ['therapy'], tags: ['method:unknown'] }, 'cbt')).toBe(false);
  });
});
