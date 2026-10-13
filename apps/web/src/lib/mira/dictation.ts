import type { BrowserDictation, VoiceListener, VoiceListeningCallbacks } from './browser-voice';

export type DictationPhase = 'idle' | 'requesting' | 'recording' | 'transcribing';
export type DictationCallbacks = Readonly<{
  onText: (text: string) => void;
  onEnd: () => void;
  onError: (message: string) => void;
}>;

type Ports = Readonly<{
  enabled: () => boolean;
  handsFreeActive: () => boolean;
  desktop: () => boolean;
  sessionId: () => string | undefined;
  draft: () => string;
  draftChanged: (text: string) => void;
  phaseChanged: (phase: DictationPhase) => void;
  clearMessages: () => void;
  error: (message: string) => void;
  focusComposer: () => void;
  startBrowser: (callbacks: DictationCallbacks) => BrowserDictation;
  startNative: (callbacks: VoiceListeningCallbacks) => Promise<VoiceListener>;
  after: (delay: number, callback: () => void) => () => void;
}>;

type Capture = {
  sessionId: string | undefined;
  base: string;
  committed: string;
  browser?: BrowserDictation;
  native?: VoiceListener;
  cancelLimit?: () => void;
  cancelFinish?: () => void;
};

const messageOf = (cause: unknown) =>
  cause instanceof Error ? cause.message : 'Something went wrong. Please try again.';
const join = (...parts: string[]) =>
  parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');

/** Composer dictation only; command interpretation remains in createVoiceController. */
export function createMiraDictation(ports: Ports) {
  let capture: Capture | undefined;
  let phase: DictationPhase = 'idle';
  let disposed = false;
  const current = (entry: Capture) => !disposed && capture === entry;
  const originatingChat = (entry: Capture) =>
    current(entry) && ports.sessionId() === entry.sessionId;
  const change = (next: DictationPhase) => {
    phase = next;
    if (!disposed) ports.phaseChanged(next);
  };
  const release = (entry: Capture, cancel = false) => {
    if (capture !== entry) return;
    // Invalidate before aborting, since browser abort can synchronously emit onEnd.
    capture = undefined;
    entry.cancelLimit?.();
    entry.cancelFinish?.();
    if (cancel) entry.browser?.cancel();
    entry.native?.stop();
    change('idle');
  };
  const fail = (entry: Capture, message: string) => {
    if (!current(entry)) return;
    if (originatingChat(entry)) ports.error(message);
    release(entry, true);
  };

  async function finishNative(entry: Capture) {
    const listener = entry.native;
    if (!current(entry) || !listener || phase !== 'recording') return;
    change('transcribing');
    entry.cancelLimit?.();
    try {
      await listener.finish?.();
      if (originatingChat(entry)) ports.focusComposer();
    } catch (cause) {
      if (originatingChat(entry)) ports.error(messageOf(cause));
    } finally {
      release(entry);
    }
  }

  async function toggle() {
    if (disposed || !ports.enabled() || ports.handsFreeActive()) return;
    if (phase === 'recording' && capture) {
      const entry = capture;
      if (entry.native) await finishNative(entry);
      else if (entry.browser) {
        change('transcribing');
        entry.cancelFinish = ports.after(3_000, () => release(entry, true));
        entry.browser.stop();
      }
      return;
    }
    if (phase !== 'idle') return;
    const entry: Capture = {
      sessionId: ports.sessionId(),
      base: ports.draft().trim(),
      committed: '',
    };
    capture = entry;
    change('requesting');
    ports.clearMessages();
    try {
      if (!ports.desktop()) {
        const listener = ports.startBrowser({
          onText: (text) => {
            if (originatingChat(entry)) ports.draftChanged(join(entry.base, text));
          },
          onEnd: () => {
            if (!current(entry)) return;
            const focus = originatingChat(entry);
            release(entry);
            if (focus) ports.focusComposer();
          },
          onError: (message) => fail(entry, message),
        });
        if (!current(entry)) {
          listener.cancel();
          return;
        }
        entry.browser = listener;
        change('recording');
        entry.cancelLimit = ports.after(120_000, () => {
          if (current(entry)) listener.stop();
        });
      } else {
        const listener = await ports.startNative({
          onInterim: (text) => {
            if (originatingChat(entry)) ports.draftChanged(join(entry.base, entry.committed, text));
          },
          onFinal: (text) => {
            if (!originatingChat(entry)) return;
            entry.committed = join(entry.committed, text);
            ports.draftChanged(join(entry.base, entry.committed));
          },
          onError: (message) => fail(entry, message),
        });
        if (!originatingChat(entry)) {
          listener.stop();
          release(entry);
          return;
        }
        entry.native = listener;
        change('recording');
        entry.cancelLimit = ports.after(120_000, () => void finishNative(entry));
      }
    } catch (cause) {
      fail(entry, messageOf(cause));
    }
  }

  return {
    toggle,
    cancel: () => {
      if (capture) release(capture, true);
    },
    dispose: () => {
      disposed = true;
      if (capture) release(capture, true);
    },
  };
}
