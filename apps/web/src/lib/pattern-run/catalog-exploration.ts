/** Compact catalogue explorers share interaction behavior, with their own language. */
const presentations: Record<
  string,
  {
    action: string;
    pending: string;
    result: string;
  }
> = {
  'identify-limiting-beliefs': {
    action: 'Explore possible beliefs →',
    pending: 'Exploring possible beliefs…',
    result: 'Possible underlying beliefs',
  },
  'explore-what-feels-wrong': {
    action: 'Explore possible meanings →',
    pending: 'Exploring possible meanings…',
    result: 'Possible aspects and self-judgments',
  },
};

export function catalogExplorationPresentation(patternId: string) {
  return Object.hasOwn(presentations, patternId) ? presentations[patternId]! : null;
}
