export interface ReplySpeechCallbacks {
  ended: () => void;
  failed: (error: string) => void;
}

export interface ReplySpeech {
  cancel: () => void;
  speak: (text: string, callbacks: ReplySpeechCallbacks) => void;
}

interface PlaybackPorts {
  enabled: () => boolean;
  automatic: () => boolean;
  speech: () => ReplySpeech | undefined;
  changed: (replyId: string | null) => void;
  playbackStarted: () => void;
  playbackEnded: () => void;
  error: (message: string) => void;
}

const deviceError = 'The device could not read this reply. Try its play button.';

/** Coordinate one reply playback, delegating speech and listening to their existing adapters. */
export function createMiraReplyPlayback(ports: PlaybackPorts) {
  let active: { id: string; version: number; speech: ReplySpeech } | null = null;
  let revision = 0;
  let disposed = false;

  function finish(version: number, error?: string) {
    if (disposed || active?.version !== version) return;
    active = null;
    ports.changed(null);
    ports.playbackEnded();
    if (error && error !== 'canceled' && error !== 'interrupted') ports.error(deviceError);
  }

  function speak(id: string, text: string) {
    if (disposed || !ports.enabled()) return false;
    const speech = ports.speech();
    if (!speech) {
      ports.error('Spoken replies are unavailable in this browser.');
      return false;
    }
    const version = ++revision;
    active = { id, version, speech };
    try {
      // Invalidate the previous callbacks before cancel(), which may invoke them synchronously.
      speech.cancel();
      ports.changed(id);
      ports.playbackStarted();
      speech.speak(text, {
        ended: () => finish(version),
        failed: (error) => finish(version, error),
      });
      return true;
    } catch {
      finish(version, 'device-error');
      return false;
    }
  }

  function stop() {
    if (disposed) return;
    const speech = active?.speech ?? ports.speech();
    revision += 1;
    active = null;
    ports.changed(null);
    try {
      speech?.cancel();
    } catch {
      ports.error(deviceError);
    } finally {
      ports.playbackEnded();
    }
  }

  return {
    speak,
    stop,
    toggle: (id: string, text: string) => {
      if (active?.id === id) stop();
      else speak(id, text);
    },
    readAutomatically: (reply: { id: string; text: string } | undefined) => {
      if (disposed || !reply || !ports.automatic()) return false;
      return speak(reply.id, reply.text);
    },
    dispose: () => {
      if (disposed) return;
      const speech = active?.speech ?? ports.speech();
      disposed = true;
      revision += 1;
      active = null;
      try {
        speech?.cancel();
      } catch {
        // The host is leaving: never publish an error or resume its microphone.
      }
    },
  };
}
