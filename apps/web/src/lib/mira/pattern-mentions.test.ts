import { describe, expect, it, vi } from 'vitest';
import { createSession, transition, type Effect, type Message } from '@patternverse/companion-core';
import { webcrypto } from 'node:crypto';
import { indexedDB } from 'fake-indexeddb';
import {
  mentionAtCaret,
  therapySuggestions,
  messagePatternContexts,
  conversationMessageText,
  type TherapyCollection,
} from './pattern-mentions';
import { createPrivateMiraStore, portableMiraSession, validateSession } from './private-store';
import { createMiraConversation } from './conversation';
import { conversationSystemPrompt } from './conversation-prompt';
import type { MiraPatternSummary } from './context';
import type { MiraArticleReference } from './article-reference';

const at = '2026-10-12T12:00:00.000Z';
const worry = {
  sourceId: 'commons',
  id: 'worry',
  type: 'pattern',
  title: 'Worry Time',
  summary: 'A time for recurring worries',
  tags: ['anxiety'],
};
const sleep = {
  sourceId: 'commons',
  id: 'sleep',
  type: 'pattern',
  title: 'Rewrite the Nightmare',
  summary: 'Rehearse a different dream',
  aliases: ['Imagery Rehearsal'],
};
const patterns: readonly MiraPatternSummary[] = [
  worry,
  sleep,
  { ...worry, sourceId: 'personal', title: 'Private collision' },
  { ...worry, id: 'uncollected', verses: ['therapy'] },
];
const collections: readonly TherapyCollection[] = [
  {
    sourceId: 'commons',
    id: 'cbt',
    title: 'Cognitive Behavioral Therapy',
    aliases: ['CBT'],
    items: [{ sourceId: 'commons', entityId: 'worry' }],
  },
  {
    sourceId: 'commons',
    id: 'dreams',
    title: 'Sleep and Nightmares',
    items: [
      { sourceId: 'commons', entityId: 'sleep' },
      { sourceId: 'commons', entityId: 'worry' },
    ],
  },
];
const attachment = { sourceId: 'commons', entityId: worry.id, title: worry.title };
const message: Message = {
  id: 'user',
  role: 'user',
  text: 'Help me reflect',
  createdAt: at,
  patternMentions: [attachment],
};
const effect: Effect = {
  type: 'request-reply',
  sessionId: 'one',
  replyId: 'reply',
  modalityId: 'narm',
  activePattern: null,
  messages: [message],
};
const load = vi.fn(async (p: MiraPatternSummary): Promise<MiraArticleReference> => ({
  sourceId: p.sourceId,
  id: p.id,
  title: p.title,
  summary: p.summary ?? '',
  body: `Article for ${p.title}`,
  html: '<p>Article</p>',
  standaloneHref: null,
}));

describe('Therapy mention lookup', () => {
  it('finds a mention at the caret without capturing emails, newlines, or later text', () => {
    expect(mentionAtCaret('Hello @worry, later', 12)).toEqual({
      start: 6,
      end: 12,
      query: 'worry',
    });
    expect(mentionAtCaret('a@example.com', 13)).toBeNull();
    expect(mentionAtCaret('@worry\nnext', 11)).toBeNull();
    expect(mentionAtCaret('Hello\n@thought record', 21)?.query).toBe('thought record');
  });
  it('uses collection membership, preserves curated order, deduplicates and keeps sources distinct', () => {
    const results = therapySuggestions(patterns, collections, '');
    expect(results.map((p) => p.id)).toEqual(['worry', 'sleep']);
    expect(results[0].collections).toHaveLength(2);
    expect(results.every((p) => p.sourceId === 'commons')).toBe(true);
  });
  it('searches purpose, tags, aliases and collection names, and excludes selected chips', () => {
    for (const query of ['Anxiety', 'recurring', 'CBT'])
      expect(therapySuggestions(patterns, collections, query).map((p) => p.id)).toEqual(['worry']);
    expect(therapySuggestions(patterns, collections, 'imagery rehearsal').map((p) => p.id)).toEqual(
      ['sleep'],
    );
    expect(therapySuggestions(patterns, collections, '', 'commons:cbt').map((p) => p.id)).toEqual([
      'worry',
    ]);
    expect(therapySuggestions(patterns, collections, '', '', [worry]).map((p) => p.id)).toEqual([
      'sleep',
    ]);
  });
});

describe('message pattern context', () => {
  it('resolves actual article titles and deduplicates session and message references without changing modality', async () => {
    const contexts = await messagePatternContexts(
      {
        ...effect,
        activePattern: attachment,
        messages: [
          {
            ...message,
            patternMentions: [
              { ...attachment, title: 'Untrusted imported title' },
              { sourceId: 'commons', entityId: 'sleep', title: sleep.title },
            ],
          },
        ],
      },
      patterns,
      load,
    );
    expect(contexts.map((item) => item.title)).toEqual([worry.title, sleep.title]);
    const prompt = conversationSystemPrompt(
      effect,
      { model: '', openRouterKey: '', activeSessionId: null, promptOverrides: {} },
      contexts,
    );
    expect(prompt).toContain('Therapy modality: NARM');
    expect(prompt).toContain('Article for Worry Time');
    expect(prompt).toContain('Article for Rewrite the Nightmare');
    expect(prompt).not.toContain('Untrusted imported title');
  });
  it('does not reuse an earlier attachment for a new message or substitute a same-ID public reference', async () => {
    expect(
      await messagePatternContexts(
        { ...effect, messages: [message, { ...message, id: 'new', patternMentions: undefined }] },
        patterns,
        load,
      ),
    ).toEqual([]);
    await expect(
      messagePatternContexts(
        {
          ...effect,
          messages: [{ ...message, patternMentions: [{ ...attachment, sourceId: 'missing' }] }],
        },
        patterns,
        load,
      ),
    ).rejects.toThrow('unavailable');
    expect(conversationMessageText(message)).toContain('Mentioned patterns: Worry Time');
  });
  it('saves attachments encrypted, restores them for retries, and keeps them in the portable allowlist', async () => {
    const store = createPrivateMiraStore({
      indexedDB,
      crypto: webcrypto as Crypto,
      databaseName: `mentions-${crypto.randomUUID()}`,
    });
    let sessions = [createSession('one', 'narm', at)];
    await store.save(sessions[0]);
    const conversation = createMiraConversation({
      store: () => store,
      sessions: () => sessions,
      sessionsChanged: (next) => {
        sessions = [...next];
      },
      replyChanged: () => {},
      now: () => at,
      randomId: () => crypto.randomUUID(),
    });
    await expect(
      conversation.send(
        sessions[0],
        message.text,
        {
          reply: async () => {
            throw new Error('Offline');
          },
        },
        false,
        [attachment],
      ),
    ).rejects.toThrow('Offline');
    const restored = (await store.load('one'))!;
    expect(restored.messages[0].patternMentions).toEqual([attachment]);
    expect(restored.activePattern).toBeNull();
    const retry = vi.fn(async (request: Effect) => {
      expect((await messagePatternContexts(request, patterns, load))[0].title).toBe(worry.title);
      return { id: 'reply', role: 'assistant' as const, text: 'A reflection', createdAt: at };
    });
    await conversation.send(restored, message.text, { reply: retry }, true);
    expect(sessions[0].messages).toHaveLength(2);
    expect(portableMiraSession(sessions[0]).messages[0].patternMentions).toEqual([attachment]);
    const withExtraFields = {
      ...sessions[0],
      messages: [{ ...message, patternMentions: [{ ...attachment, apiKey: 'secret' }] }],
    };
    expect(JSON.stringify(portableMiraSession(withExtraFields))).not.toContain('secret');
  });
  it('validates imported attachments and still accepts older messages', () => {
    const session = transition(createSession('one', 'narm', at), {
      type: 'submit',
      message,
      replyId: 'reply',
    }).session;
    expect(validateSession(session, session.id)).toEqual(session);
    expect(
      validateSession(
        { ...session, messages: [{ ...message, patternMentions: undefined }] },
        session.id,
      ),
    ).toBeTruthy();
    expect(() =>
      validateSession(
        { ...session, messages: [{ ...message, patternMentions: [{ sourceId: 42 }] }] },
        session.id,
      ),
    ).toThrow('invalid');
    expect(() =>
      validateSession(
        { ...session, messages: [{ ...message, patternMentions: [attachment, attachment] }] },
        session.id,
      ),
    ).toThrow('invalid');
  });
});
