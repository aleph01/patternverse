/** Curated conversational choices; availability and indicative prices come from current ZDR endpoints. */
export const MODEL_PRESETS = [
  {
    id: 'google/gemini-3.5-flash-lite',
    label: 'Quick & economical',
    name: 'Gemini 3.5 Flash Lite',
    description: 'For everyday check-ins and short exchanges.',
  },
  {
    id: 'google/gemini-3.8-flash',
    label: 'Balanced',
    name: 'Gemini 3.8 Flash',
    description: 'A good starting point for thoughtful conversations.',
  },
  {
    id: 'anthropic/claude-sonnet-5',
    label: 'More capable',
    name: 'Claude Sonnet 5',
    description: 'For nuanced conversations and complex questions. Higher cost.',
  },
] as const;
