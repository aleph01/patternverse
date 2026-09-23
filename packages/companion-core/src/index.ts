/** A source-qualified library identity. IDs alone are not globally unique. */
export type PatternRef = Readonly<{
  sourceId: string;
  entityId: string;
  revision?: string;
}>;

/** A private message in a guided conversation. */
export type Message = Readonly<{
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}>;

/** Pure domain state; adapters decide where and how it is stored. */
export type Session = Readonly<{
  id: string;
  title: string;
  modalityId: string;
  activePattern: PatternRef | null;
  messages: readonly Message[];
  pendingReplyId: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type SessionEvent =
  | Readonly<{ type: 'rename'; title: string; at: string }>
  | Readonly<{ type: 'set-modality'; modalityId: string; at: string }>
  | Readonly<{ type: 'select-pattern'; pattern: PatternRef | null; at: string }>
  | Readonly<{ type: 'submit'; message: Message; replyId: string }>
  | Readonly<{ type: 'reply-received'; replyId: string; message: Message }>
  | Readonly<{ type: 'reply-failed'; replyId: string; at: string }>;

export type Effect = Readonly<{
  type: 'request-reply';
  sessionId: string;
  replyId: string;
  modalityId: string;
  activePattern: PatternRef | null;
  messages: readonly Message[];
}>;

export type Transition = Readonly<{ session: Session; effects: readonly Effect[] }>;

/** Create a session without reading the clock or generating IDs inside the core. */
export function createSession(id: string, modalityId: string, at: string): Session {
  if (!id.trim() || !modalityId.trim()) throw new Error('Session and modality IDs are required.');
  return {
    id,
    title: 'New session',
    modalityId,
    activePattern: null,
    messages: [],
    pendingReplyId: null,
    createdAt: at,
    updatedAt: at,
  };
}

/** Apply one event and describe any work for the imperative shell to perform. */
export function transition(session: Session, event: SessionEvent): Transition {
  switch (event.type) {
    case 'rename':
      return unchangedEffects({
        ...session,
        title: requiredText(event.title, 'Title'),
        updatedAt: event.at,
      });
    case 'set-modality':
      return unchangedEffects({
        ...session,
        modalityId: requiredText(event.modalityId, 'Modality ID'),
        activePattern: null,
        pendingReplyId: null,
        updatedAt: event.at,
      });
    case 'select-pattern':
      return unchangedEffects({ ...session, activePattern: event.pattern, updatedAt: event.at });
    case 'submit': {
      if (session.pendingReplyId) throw new Error('A reply is already in progress.');
      if (event.message.role !== 'user') throw new Error('Only a user message can be submitted.');
      const message = { ...event.message, text: requiredText(event.message.text, 'Message') };
      const next = {
        ...session,
        messages: [...session.messages, message],
        pendingReplyId: requiredText(event.replyId, 'Reply ID'),
        updatedAt: message.createdAt,
      };
      return {
        session: next,
        effects: [
          {
            type: 'request-reply',
            sessionId: next.id,
            replyId: event.replyId,
            modalityId: next.modalityId,
            activePattern: next.activePattern,
            messages: next.messages,
          },
        ],
      };
    }
    case 'reply-received':
      if (session.pendingReplyId !== event.replyId) return unchangedEffects(session);
      if (event.message.role !== 'assistant')
        throw new Error('A reply must come from the assistant.');
      return unchangedEffects({
        ...session,
        messages: [
          ...session.messages,
          { ...event.message, text: requiredText(event.message.text, 'Reply') },
        ],
        pendingReplyId: null,
        updatedAt: event.message.createdAt,
      });
    case 'reply-failed':
      return session.pendingReplyId === event.replyId
        ? unchangedEffects({ ...session, pendingReplyId: null, updatedAt: event.at })
        : unchangedEffects(session);
  }
}

function unchangedEffects(session: Session): Transition {
  return { session, effects: [] };
}

function requiredText(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} cannot be empty.`);
  return trimmed;
}

/** A storage port. The implementation may be encrypted local storage or a future sync adapter. */
export interface SessionRepository {
  load(id: string): Promise<Session | null>;
  save(session: Session): Promise<void>;
}

/** A reply port. Implementations must make local/cloud selection explicit. */
export interface ReplyProvider {
  reply(effect: Effect, signal: AbortSignal): Promise<Message>;
}

/** The narrow application boundary for carrying out a reply effect. */
export type CompanionPorts = Readonly<{
  sessions: SessionRepository;
  replies: ReplyProvider;
  clock: Readonly<{ now(): string }>;
}>;

/**
 * Persist a submitted event before contacting the provider, then persist its
 * result. Loading again before completion makes an obsolete response harmless
 * if the request was cancelled or the session changed in the meantime.
 */
export async function submitMessage(
  sessionId: string,
  message: Message,
  replyId: string,
  ports: CompanionPorts,
  signal: AbortSignal,
): Promise<Session> {
  const current = await ports.sessions.load(sessionId);
  if (!current) throw new Error(`Session ${sessionId} was not found.`);
  const submission = transition(current, { type: 'submit', message, replyId });
  await ports.sessions.save(submission.session);
  const effect = submission.effects[0];
  if (!effect) return submission.session;

  try {
    const reply = await ports.replies.reply(effect, signal);
    const latest = await ports.sessions.load(sessionId);
    if (!latest) throw new Error(`Session ${sessionId} was not found.`);
    const completed = transition(latest, {
      type: 'reply-received',
      replyId,
      message: reply,
    }).session;
    if (completed !== latest) await ports.sessions.save(completed);
    return completed;
  } catch (error) {
    const latest = await ports.sessions.load(sessionId);
    if (latest?.pendingReplyId === replyId) {
      await ports.sessions.save(
        transition(latest, {
          type: 'reply-failed',
          replyId,
          at: ports.clock.now(),
        }).session,
      );
    }
    throw error;
  }
}
