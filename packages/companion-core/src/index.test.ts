import { describe, expect, it } from 'vitest';
import { createSession, submitMessage, transition, type Session } from './index.js';

const now = '2026-09-23T10:00:00.000Z';
const userMessage = { id: 'm1', role: 'user' as const, text: 'Hello', createdAt: now };

describe('companion session core', () => {
  it('emits a reply request after a user message without calling a provider', () => {
    const result = transition(createSession('s1', 'narm', now), {
      type: 'submit',
      message: userMessage,
      replyId: 'r1',
    });
    expect(result.session.messages).toEqual([userMessage]);
    expect(result.effects).toEqual([
      {
        type: 'request-reply',
        sessionId: 's1',
        replyId: 'r1',
        modalityId: 'narm',
        activePattern: null,
        messages: [userMessage],
      },
    ]);
  });

  it('keeps source-qualified pattern identity in a request', () => {
    const selected = transition(createSession('s1', 'narm', now), {
      type: 'select-pattern',
      pattern: { sourceId: 'commons', entityId: 'grounding' },
      at: now,
    }).session;
    const result = transition(selected, { type: 'submit', message: userMessage, replyId: 'r1' });
    expect(result.effects[0]?.activePattern).toEqual({
      sourceId: 'commons',
      entityId: 'grounding',
    });
  });

  it('clears a selected pattern when switching modalities', () => {
    const selected = transition(createSession('s1', 'narm', now), {
      type: 'select-pattern',
      pattern: { sourceId: 'mine', entityId: 'reflection' },
      at: now,
    }).session;
    expect(
      transition(selected, { type: 'set-modality', modalityId: 'cbt', at: now }).session,
    ).toMatchObject({ modalityId: 'cbt', activePattern: null });
  });

  it('invalidates an in-flight reply when switching modalities', () => {
    const pending = transition(createSession('s1', 'narm', now), {
      type: 'submit',
      message: userMessage,
      replyId: 'r1',
    }).session;
    const switched = transition(pending, {
      type: 'set-modality',
      modalityId: 'cbt',
      at: now,
    }).session;
    expect(switched.pendingReplyId).toBeNull();
    const late = transition(switched, {
      type: 'reply-received',
      replyId: 'r1',
      message: { id: 'm2', role: 'assistant', text: 'Old reply', createdAt: now },
    }).session;
    expect(late).toBe(switched);
  });

  it('ignores a stale reply after a failed request', () => {
    const pending = transition(createSession('s1', 'narm', now), {
      type: 'submit',
      message: userMessage,
      replyId: 'r1',
    }).session;
    const failed = transition(pending, { type: 'reply-failed', replyId: 'r1', at: now }).session;
    const stale = transition(failed, {
      type: 'reply-received',
      replyId: 'r1',
      message: { id: 'm2', role: 'assistant', text: 'Late', createdAt: now },
    });
    expect(stale.session).toBe(failed);
  });

  it('does not silently accept a second submission while a reply is pending', () => {
    const pending = transition(createSession('s1', 'narm', now), {
      type: 'submit',
      message: userMessage,
      replyId: 'r1',
    }).session;
    expect(() =>
      transition(pending, { type: 'submit', message: userMessage, replyId: 'r2' }),
    ).toThrow('A reply is already in progress.');
  });

  it('persists a real reply through ports without coupling the core to a provider', async () => {
    let stored: Session = createSession('s1', 'narm', now);
    const result = await submitMessage(
      's1',
      userMessage,
      'r1',
      {
        sessions: {
          load: async () => stored,
          save: async (session) => {
            stored = session;
          },
        },
        replies: {
          reply: async (effect) => {
            expect(effect.messages).toEqual([userMessage]);
            return { id: 'm2', role: 'assistant', text: 'Welcome', createdAt: now };
          },
        },
        clock: { now: () => now },
      },
      new AbortController().signal,
    );
    expect(result.messages.map((message) => message.text)).toEqual(['Hello', 'Welcome']);
    expect(stored.pendingReplyId).toBeNull();
  });

  it('keeps the user message and clears pending state when a provider fails', async () => {
    let stored: Session = createSession('s1', 'narm', now);
    await expect(
      submitMessage(
        's1',
        userMessage,
        'r1',
        {
          sessions: {
            load: async () => stored,
            save: async (session) => {
              stored = session;
            },
          },
          replies: {
            reply: async () => {
              throw new Error('Provider unavailable');
            },
          },
          clock: { now: () => now },
        },
        new AbortController().signal,
      ),
    ).rejects.toThrow('Provider unavailable');
    expect(stored.messages).toEqual([userMessage]);
    expect(stored.pendingReplyId).toBeNull();
  });
});
