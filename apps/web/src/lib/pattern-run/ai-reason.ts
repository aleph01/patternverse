/** Explain model use at the point where someone decides whether to run a pattern. */
export function patternAiReason(techniqueId: string): string {
  if (techniqueId === 'cbt.worry-chain') {
    return 'AI writes each follow-up question from your previous answer, so the worry chain can follow your own words rather than a fixed script.';
  }
  return 'AI interprets your situation and writes tailored prompts or alternatives; fixed questions alone would not provide the same reframing step.';
}
