import {
  createSession,
  canRetryReply,
  retryReply,
  submitMessage,
  transition,
  type Message,
  type PatternRef,
  type ReplyProvider,
  type Session,
  type SessionEvent,
  type SessionRepository,
} from '@patternverse/companion-core';

type ConversationStore = SessionRepository & {
  list(): Promise<readonly Session[]>;
  remove(id: string): Promise<void>;
};

export type MiraReplyState = Readonly<{
  sending: boolean;
  streamingReply: Readonly<{ sessionId: string; text: string }> | null;
}>;

/** Application coordination only: the companion core remains the semantic authority.
 * Storage, providers, clock and UI publication are ports; no browser or Svelte state here.
 */
export function createMiraConversation(options: {
  store(): ConversationStore | undefined;
  sessions(): readonly Session[];
  sessionsChanged(sessions: readonly Session[]): void;
  replyChanged(state: MiraReplyState): void;
  now(): string;
  randomId(): string;
}) {
  let disposed = false;
  let request: { sessionId: string; controller: AbortController } | undefined;
  const storage = () => {
    const store = options.store();
    if (!store) throw new Error('Private storage is unavailable.');
    return store;
  };
  const publish = (sessions: readonly Session[]) => {
    if (!disposed) options.sessionsChanged(sessions);
  };
  const upsert = (session: Session) =>
    publish(
      [session, ...options.sessions().filter((item) => item.id !== session.id)].sort(
        (left, right) => right.updatedAt.localeCompare(left.updatedAt),
      ),
    );
  const save = async (session: Session) => {
    await storage().save(session);
    upsert(session);
    return session;
  };
  const replyState = (sending: boolean, streamingReply: MiraReplyState['streamingReply']) => {
    if (!disposed) options.replyChanged({ sending, streamingReply });
  };

  return {
    async restore() {
      const store = storage();
      const saved = await store.list();
      if (disposed) return saved;
      const restored = await Promise.all(
        saved.map(async (session) => {
          if (!session.pendingReplyId) return session;
          const next = transition(session, {
            type: 'reply-failed',
            replyId: session.pendingReplyId,
            at: options.now(),
          }).session;
          await store.save(next);
          return next;
        }),
      );
      publish(restored);
      return restored;
    },
    async refresh() {
      const sessions = await storage().list();
      publish(sessions);
      return sessions;
    },
    async create(modalityId: string, pattern: PatternRef | null = null) {
      const at = options.now();
      const fresh = createSession(options.randomId(), modalityId, at);
      return save(
        pattern ? transition(fresh, { type: 'select-pattern', pattern, at }).session : fresh,
      );
    },
    apply(
      session: Session,
      event: Extract<SessionEvent, { type: 'rename' | 'set-modality' | 'select-pattern' }>,
    ) {
      return save(transition(session, event).session);
    },
    async remove(id: string) {
      if (request?.sessionId === id) request.controller.abort();
      await storage().remove(id);
      publish(options.sessions().filter((session) => session.id !== id));
    },
    cancelReply() {
      request?.controller.abort();
    },
    dispose() {
      disposed = true;
      request?.controller.abort();
    },
    async send(
      session: Session,
      text: string,
      provider: ReplyProvider,
      retry = false,
      patternMentions: Message['patternMentions'] = [],
    ) {
      if (disposed || request || !text.trim() || (retry && !canRetryReply(session))) return null;
      const store = storage();
      const at = options.now();
      const message: Message = {
        id: options.randomId(),
        role: 'user',
        text,
        createdAt: at,
        ...(patternMentions.length ? { patternMentions } : {}),
      };
      const replyId = options.randomId();
      const currentRequest = { sessionId: session.id, controller: new AbortController() };
      // Compute the optimistic projection using the same core transition, not UI semantics.
      const optimistic = transition(
        session,
        retry ? { type: 'retry-reply', replyId, at } : { type: 'submit', message, replyId },
      ).session;
      request = currentRequest;
      replyState(true, { sessionId: session.id, text: '' });
      publish(options.sessions().map((item) => (item.id === session.id ? optimistic : item)));
      try {
        const ports = {
          sessions: store,
          replies: provider,
          clock: { now: options.now },
          replyProgress: (progress: string) => {
            if (request === currentRequest && !currentRequest.controller.signal.aborted)
              replyState(true, { sessionId: session.id, text: progress });
          },
        };
        if (retry) await retryReply(session.id, replyId, ports, currentRequest.controller.signal);
        else
          await submitMessage(
            session.id,
            message,
            replyId,
            ports,
            currentRequest.controller.signal,
          );
        const completed = await store.load(session.id);
        if (completed && session.title === 'New session')
          await store.save(
            transition(completed, { type: 'rename', title: text.slice(0, 62), at }).session,
          );
        return disposed || currentRequest.controller.signal.aborted ? null : completed;
      } finally {
        try {
          const latest = await store.load(session.id);
          if (latest) upsert(latest);
        } finally {
          request = undefined;
          replyState(false, null);
        }
      }
    },
  };
}
