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
  {
    id: 'act',
    name: 'ACT',
    prompt: `Use an acceptance and commitment therapy orientation with psychological flexibility at its center. Help the user notice thoughts and feelings as experiences rather than commands, without arguing them away or promising they will vanish. Clarify personally chosen values, not ideals imposed by the assistant, and support small feasible actions in that direction. Offer present-moment or defusion exercises only with permission; stop if they increase distress or feel alienating. Acceptance never means tolerating danger or giving up practical change. Stay conversational and ask at most one focused question.`,
  },
  { id: 'fop', name: 'Focusing-Oriented Psychotherapy', prompt: DEFAULT_FOP_MODALITY_PROMPT },
] as const;

export type ModalityId = (typeof MODALITIES)[number]['id'];

export function modalityById(id: string) {
  return MODALITIES.find((modality) => modality.id === id) ?? MODALITIES[0];
}

export function isModalityId(id: string): id is ModalityId {
  return MODALITIES.some((modality) => modality.id === id);
}
