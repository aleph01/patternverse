import { describe, expect, it } from 'vitest';
import {
  decodeVoiceIntent,
  parseVoiceCommand,
  searchVoiceChoices,
  voiceIntentMessages,
  type VoiceContext,
} from './voice-commands';
import { advanceSpeechSegment, newSpeechSegment } from './voice-segmentation';

const context: VoiceContext = {
  surface: 'chat',
  choices: [],
  modalities: [{ id: 'cbt', label: 'CBT' }],
  selectedPattern: false,
};
const picker: VoiceContext = {
  ...context,
  surface: 'patterns',
  choices: [
    { id: 'a', label: 'Reframing' },
    { id: 'b', label: 'Grounding' },
    { id: 'c', label: 'Unavailable', disabled: true },
  ],
};
describe('voice intent vocabulary', () => {
  it('drafts conversation and sends only an explicit standalone command', () => {
    expect(parseVoiceCommand('I wanted to send a letter', context)).toEqual({
      type: 'draft',
      text: 'I wanted to send a letter',
    });
    expect(parseVoiceCommand('Mira, send it please.', context)).toEqual({ type: 'send' });
    expect(parseVoiceCommand('Sent.', context)).toEqual({ type: 'send' });
    expect(parseVoiceCommand('Mira, sent the message please.', context)).toEqual({ type: 'send' });
    expect(parseVoiceCommand('I sent it yesterday', context)?.type).toBe('draft');
    expect(parseVoiceCommand('I feel a little sad today', context)?.type).toBe('draft');
  });
  it('separates opening, searching, selecting and starting', () => {
    expect(parseVoiceCommand('find a pattern for grounding', context)).toEqual({
      type: 'patterns',
      query: 'grounding',
    });
    expect(parseVoiceCommand('search for grounding', picker)).toEqual({
      type: 'search',
      query: 'grounding',
    });
    expect(parseVoiceCommand('the second one', picker)).toEqual({ type: 'select', id: 'b' });
    expect(parseVoiceCommand('number 3', picker)?.type).toBe('notice');
    expect(parseVoiceCommand('start', picker)).toEqual({ type: 'start' });
    expect(parseVoiceCommand('switch to CBT', picker)).toEqual({ type: 'modality', id: 'cbt' });
  });
  it('offers ambiguous commands to the model but prevents invented IDs and autonomous sending', () => {
    expect(parseVoiceCommand('could you find me something to reframe this?', context)).toBeNull();
    expect(decodeVoiceIntent('{"type":"select","id":"b"}', picker)).toEqual({
      type: 'select',
      id: 'b',
    });
    for (const response of [
      '{"type":"send"}',
      '{"type":"start"}',
      '{"type":"select","id":"c"}',
      '{"type":"select","id":"invented"}',
      'not JSON',
    ])
      expect(decodeVoiceIntent(response, picker)).toBeNull();
    expect(voiceIntentMessages('help me find a pattern', picker)[1]!.content).not.toContain(
      'transcript',
    );
  });
  it('filters without reordering the numbered choices', () => {
    expect(searchVoiceChoices(picker.choices, 'grounding')).toEqual([picker.choices[1]]);
    expect(searchVoiceChoices(picker.choices, '')).toEqual(picker.choices);
  });
});
describe('bounded local speech segmentation', () => {
  it('caps silence without sending empty audio for transcription', () => {
    expect(advanceSpeechSegment(newSpeechSegment(0), 0, 20_000)).toMatchObject({
      cut: true,
      transcribe: false,
    });
  });
  it('waits for silence after speech and never exceeds twenty seconds', () => {
    let segment = newSpeechSegment(0);
    for (const now of [100, 160, 220, 280]) segment = advanceSpeechSegment(segment, 0.1, now).state;
    expect(advanceSpeechSegment(segment, 0, 1100).cut).toBe(false);
    expect(advanceSpeechSegment(segment, 0, 1180)).toMatchObject({ cut: true, transcribe: true });
    expect(advanceSpeechSegment(segment, 0.1, 20_000).cut).toBe(true);
  });
});
