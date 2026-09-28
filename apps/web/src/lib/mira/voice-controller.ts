import {
  decodeVoiceIntent,
  parseVoiceCommand,
  voiceIntentMessages,
  type VoiceCommand,
  type VoiceContext,
} from './voice-commands';
import type { VoiceListener, VoiceListeningCallbacks } from './browser-voice';

export type VoiceState = Readonly<{
  phase: 'off' | 'starting' | 'listening' | 'interpreting' | 'reading';
  heard: string;
  feedback: string;
}>;
type Context = VoiceContext & { sessionId: string | null };
type Ports = {
  listen: (callbacks: VoiceListeningCallbacks) => VoiceListener | Promise<VoiceListener>;
  context: () => Context;
  speaking: () => boolean;
  execute: (command: VoiceCommand) => string | Promise<string>;
  interpret: (
    messages: ReturnType<typeof voiceIntentMessages>,
    signal: AbortSignal,
  ) => Promise<string>;
  changed: (state: VoiceState) => void;
};

/** Owns the microphone lifetime and serial command dispatch; late results never mutate a new context. */
export function createVoiceController(ports: Ports) {
  let epoch = 0;
  let listener: VoiceListener | undefined;
  let interpretation: AbortController | undefined;
  let state: VoiceState = { phase: 'off', heard: '', feedback: '' };
  let queue = Promise.resolve();
  const publish = (change: Partial<VoiceState>) => {
    state = { ...state, ...change };
    ports.changed(state);
  };
  const stop = (feedback = 'Voice control stopped.') => {
    epoch += 1;
    interpretation?.abort();
    listener?.stop();
    listener = undefined;
    publish({ phase: 'off', heard: '', feedback });
  };
  async function dispatch(text: string, version: number, sessionId: string | null) {
    if (version !== epoch || !text.trim()) return;
    const context = ports.context();
    if (context.sessionId !== sessionId) {
      publish({ feedback: 'The session changed. Please say that again.' });
      return;
    }
    let command = parseVoiceCommand(text, context);
    // Speech output must never echo back into a draft or a sending command.
    if (ports.speaking() && command?.type !== 'stop-reading') return;
    publish({ heard: text });
    try {
      if (!command) {
        interpretation = new AbortController();
        const abort = interpretation;
        const timeout = setTimeout(() => abort.abort(), 20_000);
        publish({ phase: 'interpreting', feedback: 'Interpreting command…' });
        try {
          command = decodeVoiceIntent(
            await ports.interpret(voiceIntentMessages(text, context), abort.signal),
            context,
          );
        } finally {
          clearTimeout(timeout);
        }
        if (version !== epoch) return;
        if (JSON.stringify(context) !== JSON.stringify(ports.context())) {
          publish({
            phase: 'listening',
            feedback: 'The view changed. Please say the command again.',
          });
          return;
        }
      }
      const feedback = command
        ? await ports.execute(command)
        : context.surface === 'chat'
          ? `${await ports.execute({ type: 'draft', text })} No control action was taken.`
          : 'Not sure which action you mean. Try “open patterns” or “choose therapy approach”.';
      if (version === epoch) publish({ phase: 'listening', feedback });
    } catch (cause) {
      if (version === epoch)
        publish({
          phase: 'listening',
          feedback: cause instanceof Error ? cause.message : 'Please try that command again.',
        });
    }
  }
  async function start() {
    if (state.phase !== 'off') return;
    const version = ++epoch;
    queue = Promise.resolve();
    publish({ phase: 'starting', heard: '', feedback: 'Opening microphone…' });
    try {
      const next = await ports.listen({
        onInterim: (heard) => {
          if (version === epoch) publish({ heard });
        },
        onFinal: (text) => {
          if (version !== epoch) return;
          if (parseVoiceCommand(text, ports.context())?.type === 'stop') {
            stop();
            return;
          }
          // Drop output captured while reading rather than delaying it until speech ends.
          if (ports.speaking() && parseVoiceCommand(text, ports.context())?.type !== 'stop-reading')
            return;
          const sessionId = ports.context().sessionId;
          queue = queue.then(() => dispatch(text, version, sessionId));
        },
        onError: (feedback) => {
          if (version === epoch) stop(feedback);
        },
      });
      if (version !== epoch) {
        next.stop();
        return;
      }
      listener = next;
      publish({ phase: 'listening', feedback: 'Listening · say “send” to send your draft.' });
    } catch (cause) {
      if (version === epoch)
        stop(cause instanceof Error ? cause.message : 'Voice control could not start.');
    }
  }
  /** Pause capture during readback so device audio cannot become a spoken command. */
  const playbackStarted = () => {
    if (state.phase === 'off' || state.phase === 'reading') return;
    stop();
    publish({
      phase: 'reading',
      feedback:
        'Reading aloud · listening resumes afterward. Use the reply’s stop button to interrupt.',
    });
  };
  const playbackEnded = () => {
    if (state.phase !== 'reading') return;
    publish({ phase: 'off' });
    void start();
  };
  return { start, stop, playbackStarted, playbackEnded };
}
