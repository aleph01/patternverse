/** Every authored practice uses the same Pattern Language runtime. */
export function hasStandaloneSourcePractice(entity: {
  type: string;
  tags?: readonly string[];
  languagePracticeSource?: string;
}): boolean {
  return (
    (entity.type === 'pattern' || entity.type === 'practice') &&
    Boolean(entity.languagePracticeSource)
  );
}

/** Authored AI practices declare model use so every entry point can disclose it. */
export function sourcePracticeNeedsAi(entity: {
  tags?: readonly string[];
  languagePracticeSource?: string | null;
}): boolean {
  return Boolean(entity.languagePracticeSource && entity.tags?.includes('ai-assisted'));
}
