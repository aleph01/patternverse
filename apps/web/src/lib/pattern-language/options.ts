import type { PreviewMockResult } from '$lib/pattern-editor/types';
import type { WidgetPackage } from '@patternverse/workspace';

export interface ExampleOptions {
  note?: string;
  onDemand?: boolean;
  preview?: boolean;
  inputs?: readonly { label: string; values: Readonly<Record<string, string>> }[];
  mockResults?: readonly PreviewMockResult[];
  widgets?: Record<string, WidgetPackage>;
  data?: Record<string, unknown>;
}

export const exampleOptions: Readonly<Record<string, ExampleOptions>> = {
  'typed-inputs.pattern.md': {
    inputs: [
      { label: 'Topic: today', values: { topic: 'today' } },
      { label: 'Topic: an upcoming project', values: { topic: 'an upcoming project' } },
    ],
  },
  'optional-note.pattern.md': {
    inputs: [
      {
        label: 'Absent note (None)',
        values: { note: '{"type":"optional","value":{"element_type":"text","value":null}}' },
      },
      {
        label: 'Present note',
        values: {
          note: '{"type":"optional","value":{"element_type":"text","value":{"type":"text","value":"  Make a little space.  "}}}',
        },
      },
    ],
    note: 'Switch the input to see which branch runs. Both inputs satisfy Optional[text].',
  },
  'classify-a-message.pattern.md': {
    note: 'Answer the question, then choose a sample model interpretation to follow its authored branch.',
    mockResults: ['answer', 'question', 'other'].map((value) => ({
      kind: 'semantic.classify',
      label: `Use sample: ${value}`,
      result: { kind: 'classified', value },
    })),
  },
  'realized-wording.pattern.md': {
    note: 'Use the sample wording to see a realization become an ordinary question. No model is called.',
    mockResults: [
      {
        kind: 'language.realize',
        label: 'Use sample wording',
        result: { kind: 'realized', value: 'What would help you take a small next step?' },
      },
    ],
  },
  'typed-agent.pattern.md': {
    note: 'The sample is a fixed reply. The runtime validates its declared record type before displaying it.',
    mockResults: [
      {
        kind: 'agent.generate',
        label: 'Use sample suggestion',
        result: {
          kind: 'generated',
          value: {
            type: 'record',
            value: {
              suggestion: { type: 'text', value: 'Put a five-minute pause on your calendar.' },
              confidence: { type: 'number', value: 0.7 },
            },
          },
        },
      },
    ],
  },
  'semantic-suggestion.pattern.md': {
    note: 'Compare a sample decided result with explicit uncertainty. Items keep their original identity.',
    mockResults: [
      {
        kind: 'semantic.suggest',
        label: 'Use sample ranking',
        result: { kind: 'suggested', value: { outcome: 'decided', ids: ['item-1', 'item-0'] } },
      },
      {
        kind: 'semantic.suggest',
        label: 'Use uncertain result',
        result: { kind: 'suggested', value: { outcome: 'uncertain', ids: [] } },
      },
    ],
  },
  'image.pattern.md': {
    onDemand: true,
    note: 'Run this example to load the image from its HTTPS source.',
  },
  'video.pattern.md': {
    onDemand: true,
    note: 'Run this example to load the external video player. Playback starts only when you press play.',
  },
  'data-import.pattern.md': {
    preview: false,
    note: 'Template: publish a materials resource before running this source. The resource ID and schema must match your data.',
  },
  'pinned-import.pattern.md': {
    preview: false,
    note: 'Template: replace the explanatory pin with the exact value from your saved-pattern import picker.',
  },
};
