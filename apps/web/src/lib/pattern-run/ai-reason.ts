/** Explain model use at the point where someone decides whether to run a pattern. */
export function patternAiReason(techniqueId: string): string {
  if (techniqueId === 'explore-what-feels-wrong') {
    return 'AI compares your words with the recognition library to suggest what you may be judging about yourself, keeping any added meaning unconfirmed. It may ask one optional clarification question.';
  }
  if (techniqueId === 'identify-limiting-beliefs') {
    return 'AI compares your description with the belief library and suggests plausible connections, showing any unconfirmed assumptions. It may ask one clarification question when no useful connection emerges.';
  }
  if (techniqueId === 'cbt.worry-chain') {
    return 'AI writes each follow-up question from your previous answer, so the worry chain can follow your own words rather than a fixed script.';
  }
  return 'Some paths use AI to interpret your situation, write tailored questions or suggest alternatives.';
}
