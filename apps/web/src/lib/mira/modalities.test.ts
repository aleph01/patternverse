import { describe, expect, it } from 'vitest';
import { MODALITIES, availableModalityId, isModalityId, modalityById } from './modalities';
import { conversationSystemPrompt } from './conversation-prompt';
import { createSession } from '@patternverse/companion-core';

describe('available and retired approaches', () => {
  it('does not offer ACT or use a retired preference for new sessions', () => {
    expect(MODALITIES.some((item) => String(item.id) === 'act')).toBe(false);
    expect(isModalityId('act')).toBe(false);
    expect(availableModalityId('act')).toBe('narm');
    expect(availableModalityId('cbt')).toBe('cbt');
    expect(availableModalityId(undefined)).toBe('narm');
  });

  it('keeps old sessions intact without silently applying ACT or NARM', () => {
    const session = createSession('old', 'act', '2026-10-01T12:00:00Z');
    const prompt = conversationSystemPrompt(
      {
        type: 'request-reply',
        sessionId: session.id,
        replyId: 'reply',
        modalityId: session.modalityId,
        activePattern: null,
        messages: [],
      },
      {
        model: '',
        openRouterKey: '',
        activeSessionId: 'old',
        promptOverrides: { act: 'Removed ACT custom stance' },
      },
      null,
    );
    expect(session.modalityId).toBe('act');
    expect(modalityById('act').name).toBe('Reflection (retired approach)');
    expect(prompt).toContain('former approach is retired');
    expect(prompt).not.toContain('Removed ACT custom stance');
    expect(prompt).not.toContain('Therapy modality: NARM');
  });
});
