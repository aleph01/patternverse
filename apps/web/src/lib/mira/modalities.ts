import { DEFAULT_CBT_MODALITY_PROMPT } from './prompts/cbt';
import { DEFAULT_COHERENCE_THERAPY_MODALITY_PROMPT } from './prompts/coherence-therapy';
import { DEFAULT_DBT_MODALITY_PROMPT } from './prompts/dbt';
import { DEFAULT_FOP_MODALITY_PROMPT } from './prompts/fop';
import { DEFAULT_NARM_MODALITY_PROMPT } from './prompts/narm';

/** Stable modality IDs are stored in sessions and may change without rewriting a transcript. */
export const MODALITIES = [
  { id: 'narm', name: 'NARM', prompt: DEFAULT_NARM_MODALITY_PROMPT },
  { id: 'coherence', name: 'Coherence Therapy', prompt: DEFAULT_COHERENCE_THERAPY_MODALITY_PROMPT },
  { id: 'cbt', name: 'CBT', prompt: DEFAULT_CBT_MODALITY_PROMPT },
  { id: 'dbt', name: 'DBT', prompt: DEFAULT_DBT_MODALITY_PROMPT },
  { id: 'fop', name: 'Focusing-Oriented Psychotherapy', prompt: DEFAULT_FOP_MODALITY_PROMPT },
] as const;

export type ModalityId = (typeof MODALITIES)[number]['id'];

export function modalityById(id: string) {
  if (id === 'act') return RETIRED_REFLECTION;
  return MODALITIES.find((modality) => modality.id === id) ?? MODALITIES[0];
}

/** Keep old transcripts readable without relabeling them as a different approach. */
const RETIRED_REFLECTION = {
  id: 'act',
  name: 'Reflection (retired approach)',
  prompt:
    'Offer calm, collaborative reflection within Mira’s role as a self-help companion, not a clinician. This session’s former approach is retired. Do not use a named therapy protocol. Invite the user to choose an available approach before structured work. Ask at most one focused question at a time.',
} as const;

/** Only an available approach may be used for a new session. Saved sessions are not rewritten. */
export function availableModalityId(id: string | null | undefined): ModalityId {
  return id && isModalityId(id) ? id : 'narm';
}

export function isModalityId(id: string): id is ModalityId {
  return MODALITIES.some((modality) => modality.id === id);
}
