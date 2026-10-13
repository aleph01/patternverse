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
