import { describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { indexedDB } from 'fake-indexeddb';
import {
  createSession,
  transition,
  type Message,
  type ReplyProvider,
  type Session,
} from '@patternverse/companion-core';
import { createMiraConversation, type MiraReplyState } from './conversation';
import { createPrivateMiraStore } from './private-store';

const at = '2026-10-10T12:00:00.000Z';
const answer: Message = { id: 'reply', role: 'assistant', text: 'A reply', createdAt: at };
const user: Message = { id: 'user', role: 'user', text: 'Hello', createdAt: at };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function setup(initial: readonly Session[] = [createSession('one', 'cbt', at)]) {
  let sessions = initial;
  let replyState: MiraReplyState = { sending: false, streamingReply: null };
  let id = 0;
  const rows = new Map(initial.map((session) => [session.id, session]));
  const store = {
    load: vi.fn(async (id: string) => rows.get(id) ?? null),
    list: vi.fn(async () => [...rows.values()]),
    save: vi.fn(async (session: Session) => {
      rows.set(session.id, session);
    }),
    remove: vi.fn(async (id: string) => {
      rows.delete(id);
    }),
  };
  const changed = vi.fn((next: readonly Session[]) => {
    sessions = next;
  });
  const replies = vi.fn((next: MiraReplyState) => {
    replyState = next;
  });
  const conversation = createMiraConversation({
    store: () => store,
    sessions: () => sessions,
    sessionsChanged: changed,
    replyChanged: replies,
    now: () => at,
    randomId: () => `generated-${++id}`,
  });
  return {
    conversation,
    store,
    rows,
    changed,
    replies,
    get sessions() {
      return sessions;
    },
    get replyState() {
      return replyState;
    },
  };
}

describe('Mira conversation coordination', () => {
  it('does not repair or publish restored sessions after disposal during the storage read', async () => {
    const session = transition(createSession('one', 'cbt', at), {
      type: 'submit',
      message: user,
      replyId: 'interrupted',
    }).session;
    const state = setup([session]);
    const gate = deferred<Session[]>();
    state.store.list.mockReturnValue(gate.promise);
    const work = state.conversation.restore();
    state.conversation.dispose();
    gate.resolve([session]);
    expect(await work).toEqual([session]);
    expect(state.store.save).not.toHaveBeenCalled();
    expect(state.changed).not.toHaveBeenCalled();
  });
  it('recovers interrupted replies using the core, retaining the unanswered message', async () => {
    const session = transition(createSession('one', 'cbt', at), {
      type: 'submit',
      message: user,
      replyId: 'interrupted',
    }).session;
    const untouched = createSession('two', 'dbt', at);
    const state = setup([session, untouched]);
    const restored = await state.conversation.restore();
    expect(restored[0]).toMatchObject({ pendingReplyId: null, messages: [user] });
    expect(restored[1]).toBe(untouched);
    expect(state.store.save).toHaveBeenCalledTimes(1);
    expect(state.sessions).toEqual(restored);
  });

  it('creates source-qualified sessions, applies core events and sorts updates', async () => {
    const state = setup([createSession('old', 'cbt', '2026-10-09T12:00:00.000Z')]);
    const pattern = { sourceId: 'personal', entityId: 'same-id' };
    const created = await state.conversation.create('dbt', pattern);
    expect(created).toMatchObject({ modalityId: 'dbt', activePattern: pattern });
    await state.conversation.apply(created, { type: 'rename', title: 'My session', at });
    expect(state.sessions.map((session) => session.title)).toEqual(['My session', 'New session']);
    await state.conversation.apply(state.sessions[0], {
      type: 'set-modality',
      modalityId: 'cbt',
      at,
    });
    expect(state.sessions[0].activePattern).toBeNull();
    await state.conversation.remove(created.id);
    expect(state.sessions.map((session) => session.id)).toEqual(['old']);
  });

  it('publishes optimistic and streamed replies, persisting only complete messages', async () => {
    const state = setup();
    const gate = deferred<Message>();
    const started = deferred<void>();
    const provider = {
      reply: vi.fn<ReplyProvider['reply']>(async (_effect, _signal, progress) => {
        progress?.('Partial');
        started.resolve();
        return gate.promise;
      }),
    };
    const send = state.conversation.send(state.sessions[0], user.text, provider);
    expect(state.replyState.sending).toBe(true);
    expect(state.sessions[0].messages.map((message) => message.text)).toEqual(['Hello']);
    await started.promise;
    expect(state.replyState.streamingReply).toEqual({ sessionId: 'one', text: 'Partial' });
    expect(state.rows.get('one')?.messages.map((message) => message.text)).toEqual(['Hello']);
    expect(await state.conversation.send(state.sessions[0], 'Duplicate', provider)).toBeNull();
    expect(provider.reply).toHaveBeenCalledTimes(1);
    gate.resolve(answer);
    const completed = await send;
    expect(completed?.messages).toHaveLength(2);
    expect(state.sessions[0]).toMatchObject({ title: 'Hello', pendingReplyId: null });
    expect(state.replyState).toEqual({ sending: false, streamingReply: null });
  });

  it('permits retry after failure without appending the user message again', async () => {
    const state = setup();
    const fail = {
      reply: vi.fn(async () => {
        throw new Error('Provider failed');
      }),
    };
    await expect(state.conversation.send(state.sessions[0], 'Hello', fail)).rejects.toThrow(
      'Provider failed',
    );
    expect(state.sessions[0]).toMatchObject({ title: 'New session', pendingReplyId: null });
    expect(state.replyState.sending).toBe(false);
    const provider = { reply: vi.fn(async () => answer) };
    await state.conversation.send(state.sessions[0], 'Hello', provider, true);
    expect(state.sessions[0].messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
    ]);
    expect(await state.conversation.send(state.sessions[0], 'Hello', provider, true)).toBeNull();
    expect(provider.reply).toHaveBeenCalledTimes(1);
  });

  it('preserves a manually named conversation and truncates generated titles at 62 characters', async () => {
    const named = { ...createSession('named', 'cbt', at), title: 'Keep this name' };
    const state = setup([named, createSession('fresh', 'cbt', at)]);
    const provider = { reply: async () => answer };
    await state.conversation.send(named, 'A different name', provider);
    expect(state.rows.get('named')?.title).toBe('Keep this name');
    await state.conversation.send(state.rows.get('fresh')!, 'x'.repeat(100), provider);
    expect(state.rows.get('fresh')?.title).toBe('x'.repeat(62));
  });

  it('does not publish a failed storage write or leave reply controls busy', async () => {
    const state = setup();
    state.store.save.mockRejectedValue(new Error('Storage failed'));
    await expect(
      state.conversation.apply(state.sessions[0], { type: 'rename', title: 'New', at }),
    ).rejects.toThrow('Storage failed');
    expect(state.changed).not.toHaveBeenCalled();
    const provider = { reply: vi.fn(async () => answer) };
    await expect(state.conversation.send(state.sessions[0], 'Hello', provider)).rejects.toThrow(
      'Storage failed',
    );
    expect(provider.reply).not.toHaveBeenCalled();
    expect(state.sessions[0].messages).toEqual([]);
    expect(state.replyState).toEqual({ sending: false, streamingReply: null });
  });

  it('releases busy state even if loading the final saved session fails', async () => {
    const state = setup();
    state.store.load.mockRejectedValue(new Error('Read failed'));
    await expect(
      state.conversation.send(state.sessions[0], 'Hello', { reply: async () => answer }),
    ).rejects.toThrow('Read failed');
    expect(state.replyState).toEqual({ sending: false, streamingReply: null });
  });

  it('rejects obsolete provider output after changing modality using existing core semantics', async () => {
    const state = setup();
    const gate = deferred<Message>(),
      started = deferred<void>();
    let signal!: AbortSignal;
    let progress!: (text: string) => void;
    const send = state.conversation.send(state.sessions[0], 'Hello', {
      reply: async (_effect, current, onProgress) => {
        signal = current;
        progress = onProgress!;
        started.resolve();
        return gate.promise;
      },
    });
    await started.promise;
    state.conversation.cancelReply();
    await state.conversation.apply(state.sessions[0], {
      type: 'set-modality',
      modalityId: 'dbt',
      at,
    });
    const publications = state.replies.mock.calls.length;
    progress('Too late');
    expect(state.replies).toHaveBeenCalledTimes(publications);
    gate.resolve(answer); // Deliberately emulate a provider that ignores abort.
    expect(await send).toBeNull();
    expect(signal.aborted).toBe(true);
    expect(state.sessions[0]).toMatchObject({ modalityId: 'dbt', pendingReplyId: null });
    expect(state.sessions[0].messages.map((message) => message.role)).toEqual(['user']);
  });

  it('does not resurrect a deleted conversation when its pending provider completes', async () => {
    const state = setup();
    const gate = deferred<Message>(),
      started = deferred<void>();
    let signal!: AbortSignal;
    const send = state.conversation.send(state.sessions[0], 'Hello', {
      reply: async (_effect, current) => {
        signal = current;
        started.resolve();
        return gate.promise;
      },
    });
    const rejected = expect(send).rejects.toThrow('was not found');
    await started.promise;
    await state.conversation.remove('one');
    gate.resolve(answer);
    await rejected;
    expect(signal.aborted).toBe(true);
    expect(state.rows.size).toBe(0);
    expect(state.sessions).toEqual([]);
    expect(state.replyState.sending).toBe(false);
  });

  it.each([false, true])('suppresses callbacks on disposal with late failure=%s', async (fail) => {
    const state = setup();
    const gate = deferred<Message>(),
      started = deferred<void>();
    let signal!: AbortSignal;
    let progress!: (text: string) => void;
    const send = state.conversation.send(state.sessions[0], 'Hello', {
      reply: async (_effect, current, onProgress) => {
        signal = current;
        progress = onProgress!;
        started.resolve();
        return gate.promise;
      },
    });
    const settled = send.catch(() => null);
    await started.promise;
    state.conversation.dispose();
    const sessionsCount = state.changed.mock.calls.length,
      repliesCount = state.replies.mock.calls.length;
    progress('Late progress');
    if (fail) gate.reject(new Error('Late failure'));
    else gate.resolve(answer);
    expect(await settled).toBeNull();
    expect(signal.aborted).toBe(true);
    expect(state.changed).toHaveBeenCalledTimes(sessionsCount);
    expect(state.replies).toHaveBeenCalledTimes(repliesCount);
    const provider = { reply: vi.fn(async () => answer) };
    expect(await state.conversation.send(state.sessions[0], 'Ignored', provider)).toBeNull();
    expect(provider.reply).not.toHaveBeenCalled();
  });

  it('reuses the encrypted device store without changing settings or guided checkpoints', async () => {
    const store = createPrivateMiraStore({
      indexedDB,
      crypto: webcrypto as Crypto,
      databaseName: `conversation-${crypto.randomUUID()}`,
    });
    const settings = {
      model: 'synthetic',
      openRouterKey: 'synthetic-key',
      promptOverrides: {},
      activeSessionId: 'one',
    };
    await store.saveSettings(settings);
    const savedSettings = await store.loadSettings();
    await store.save(createSession('one', 'cbt', at));
    const token = await store.saveRun('one', { privateResponse: 'synthetic answer' }, null);
    let sessions: readonly Session[] = [];
    const conversation = createMiraConversation({
      store: () => store,
      sessions: () => sessions,
      sessionsChanged: (next) => {
        sessions = next;
      },
      replyChanged: () => {},
      now: () => at,
      randomId: () => crypto.randomUUID(),
    });
    await conversation.restore();
    await conversation.send(sessions[0], 'Hello', { reply: async () => answer });
    await conversation.refresh();
    expect(sessions[0].messages).toHaveLength(2);
    expect(await store.loadSettings()).toEqual(savedSettings);
    expect(await store.loadRun('one')).toEqual({
      token,
      saved: { privateResponse: 'synthetic answer' },
    });
  });
});
