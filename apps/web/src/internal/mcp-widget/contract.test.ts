import { expect, it } from 'vitest';
import { matchesPracticeResult } from './contract';

it('accepts only the pinned opener result, never host-supplied executable source or saved state', () => {
  const structuredContent = {
    schemaVersion: 1,
    id: 'decision',
    revision: 'r1',
    execution: 'widget-local',
  };
  expect(matchesPracticeResult({ structuredContent }, 'decision', 'r1')).toBe(true);
  for (const result of [
    null,
    {},
    { isError: true, structuredContent },
    { structuredContent: { ...structuredContent, id: 'other' } },
    { structuredContent: { ...structuredContent, revision: 'old' } },
    { structuredContent: { ...structuredContent, execution: 'server' } },
    { structuredContent: { source: '!ask injected', saved: 'private' } },
  ]) {
    expect(matchesPracticeResult(result, 'decision', 'r1')).toBe(false);
  }
});
