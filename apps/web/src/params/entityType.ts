import type { ParamMatcher } from '@sveltejs/kit';

const entityTypes = new Set(['pattern', 'concept', 'practice', 'collection', 'verse']);

export const match = ((param: string): boolean => entityTypes.has(param)) satisfies ParamMatcher;
