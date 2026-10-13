import { describe, expect, it, vi } from 'vitest';
import {
  createMiraReplyPlayback,
  type ReplySpeech,
  type ReplySpeechCallbacks,
} from './reply-playback';

function fixture() {
  const callbacks: ReplySpeechCallbacks[] = [];
  const speech = {
    cancel: vi.fn(),
    speak: vi.fn((text: string, events: ReplySpeechCallbacks) => {
      callbacks.push(events);
    }),
  };
  const state = { enabled: true, automatic: false, speech: speech as ReplySpeech | undefined };
  const ports = {
    enabled: () => state.enabled,
    automatic: () => state.automatic,
    speech: () => state.speech,
    changed: vi.fn<(id: string | null) => void>(),
    playbackStarted: vi.fn(),
    playbackEnded: vi.fn(),
    error: vi.fn<(message: string) => void>(),
  };
  return { state, ports, speech, callbacks, playback: createMiraReplyPlayback(ports) };
}

describe('Mira reply playback', () => {
  it('starts a manual reply and pauses listening before asking the device to speak', () => {
    const f = fixture();
    f.speech.speak.mockImplementation(() => {
      expect(f.ports.playbackStarted).toHaveBeenCalledOnce();
      expect(f.ports.changed).toHaveBeenLastCalledWith('reply-1');
    });
    expect(f.playback.speak('reply-1', 'A complete reply.')).toBe(true);
    expect(f.speech.cancel).toHaveBeenCalledOnce();
    expect(f.speech.speak).toHaveBeenCalledWith('A complete reply.', expect.any(Object));
  });

  it('clears playback and resumes listening exactly once on completion', () => {
    const f = fixture();
    f.playback.speak('one', 'First reply');
    f.callbacks[0]!.ended();
    f.callbacks[0]!.ended();
    f.callbacks[0]!.failed('device-error');
    expect(f.ports.changed.mock.calls).toEqual([['one'], [null]]);
    expect(f.ports.playbackEnded).toHaveBeenCalledOnce();
    expect(f.ports.error).not.toHaveBeenCalled();
  });

  it.each(['canceled', 'interrupted'])('does not report %s as a device failure', (error) => {
    const f = fixture();
    f.playback.speak('one', 'Reply');
    f.callbacks[0]!.failed(error);
    expect(f.ports.changed).toHaveBeenLastCalledWith(null);
    expect(f.ports.playbackEnded).toHaveBeenCalledOnce();
    expect(f.ports.error).not.toHaveBeenCalled();
  });

  it('reports a device error and lets the user retry using the same play control', () => {
    const f = fixture();
    f.playback.speak('one', 'Reply');
    f.callbacks[0]!.failed('audio-busy');
    expect(f.ports.error).toHaveBeenCalledWith(
      'The device could not read this reply. Try its play button.',
    );
    expect(f.ports.playbackEnded).toHaveBeenCalledOnce();
    f.playback.toggle('one', 'Reply');
    expect(f.speech.speak).toHaveBeenCalledTimes(2);
  });

  it.each(['one', 'two'])(
    'ignores obsolete completion and errors when replacing playback with %s',
    (id) => {
      const f = fixture();
      f.playback.speak('one', 'First');
      f.playback.speak(id, 'Replacement');
      f.callbacks[0]!.ended();
      f.callbacks[0]!.failed('device-error');
      expect(f.ports.changed).toHaveBeenLastCalledWith(id);
      expect(f.ports.playbackEnded).not.toHaveBeenCalled();
      expect(f.ports.error).not.toHaveBeenCalled();
      f.callbacks[1]!.ended();
      expect(f.ports.changed).toHaveBeenLastCalledWith(null);
      expect(f.ports.playbackEnded).toHaveBeenCalledOnce();
    },
  );

  it('invalidates the old playback before synchronous cancellation callbacks run', () => {
    const f = fixture();
    f.playback.speak('one', 'First');
    f.speech.cancel.mockImplementation(() => f.callbacks[0]!.failed('interrupted'));
    f.playback.speak('one', 'Replacement');
    expect(f.ports.playbackEnded).not.toHaveBeenCalled();
    expect(f.ports.changed.mock.calls).toEqual([['one'], ['one']]);
  });

  it('toggles the active reply off and uses the same speak action for another reply', () => {
    const f = fixture();
    f.playback.toggle('one', 'First');
    f.playback.toggle('one', 'First');
    expect(f.speech.speak).toHaveBeenCalledOnce();
    expect(f.ports.changed).toHaveBeenLastCalledWith(null);
    expect(f.ports.playbackEnded).toHaveBeenCalledOnce();
    f.playback.toggle('two', 'Second');
    expect(f.speech.speak).toHaveBeenCalledTimes(2);
    expect(f.ports.changed).toHaveBeenLastCalledWith('two');
  });

  it('stop ignores both synchronous and delayed callbacks from canceled speech', () => {
    const f = fixture();
    f.playback.speak('one', 'Reply');
    f.speech.cancel.mockImplementation(() => f.callbacks[0]!.ended());
    f.playback.stop();
    f.callbacks[0]!.failed('device-error');
    expect(f.ports.changed.mock.calls).toEqual([['one'], [null]]);
    expect(f.ports.playbackEnded).toHaveBeenCalledOnce();
    expect(f.ports.error).not.toHaveBeenCalled();
  });

  it('can stop even if feature availability changes during playback', () => {
    const f = fixture();
    f.playback.speak('one', 'Reply');
    f.state.enabled = false;
    f.state.speech = undefined;
    f.playback.stop();
    expect(f.speech.cancel).toHaveBeenCalledTimes(2);
    expect(f.ports.changed).toHaveBeenLastCalledWith(null);
  });

  it('does nothing when voice is disabled', () => {
    const f = fixture();
    f.state.enabled = false;
    expect(f.playback.speak('one', 'Reply')).toBe(false);
    expect(f.speech.cancel).not.toHaveBeenCalled();
    expect(f.ports.changed).not.toHaveBeenCalled();
    expect(f.ports.error).not.toHaveBeenCalled();
  });

  it('reports missing browser support without starting playback or pausing listening', () => {
    const f = fixture();
    f.state.speech = undefined;
    expect(f.playback.speak('one', 'Reply')).toBe(false);
    expect(f.ports.error).toHaveBeenCalledWith('Spoken replies are unavailable in this browser.');
    expect(f.ports.playbackStarted).not.toHaveBeenCalled();
    expect(f.ports.changed).not.toHaveBeenCalled();
  });

  it('reads automatically only when opted in, with a completed reply supplied by the host', () => {
    const f = fixture();
    const reply = { id: 'one', text: 'Complete reply' };
    expect(f.playback.readAutomatically(reply)).toBe(false);
    f.state.automatic = true;
    expect(f.playback.readAutomatically(undefined)).toBe(false);
    expect(f.playback.readAutomatically(reply)).toBe(true);
    expect(f.speech.speak).toHaveBeenCalledOnce();
    f.state.automatic = false;
    expect(f.playback.readAutomatically(reply)).toBe(false);
    f.state.automatic = true;
    f.state.enabled = false;
    expect(f.playback.readAutomatically(reply)).toBe(false);
    expect(f.speech.speak).toHaveBeenCalledOnce();
  });

  it.each(['cancel', 'speak'] as const)(
    'cleans up and reports a synchronous %s failure',
    (method) => {
      const f = fixture();
      f.speech[method].mockImplementation(() => {
        throw new Error('Device failure');
      });
      expect(f.playback.speak('one', 'Reply')).toBe(false);
      expect(f.ports.changed).toHaveBeenLastCalledWith(null);
      expect(f.ports.playbackEnded).toHaveBeenCalledOnce();
      expect(f.ports.error).toHaveBeenCalledWith(
        'The device could not read this reply. Try its play button.',
      );
    },
  );

  it('resumes listening even when explicit stop encounters a device exception', () => {
    const f = fixture();
    f.playback.speak('one', 'Reply');
    f.speech.cancel.mockImplementation(() => {
      throw new Error('Device failure');
    });
    f.playback.stop();
    expect(f.ports.changed).toHaveBeenLastCalledWith(null);
    expect(f.ports.playbackEnded).toHaveBeenCalledOnce();
  });

  it('disposes without publishing state, errors or resuming capture, and ignores late events', () => {
    const f = fixture();
    f.playback.speak('one', 'Reply');
    f.speech.cancel.mockImplementation(() => f.callbacks[0]!.failed('device-error'));
    f.playback.dispose();
    f.playback.dispose();
    f.callbacks[0]!.ended();
    f.playback.stop();
    f.playback.toggle('one', 'Reply');
    expect(f.playback.speak('two', 'Reply')).toBe(false);
    f.state.automatic = true;
    expect(f.playback.readAutomatically({ id: 'one', text: 'Reply' })).toBe(false);
    expect(f.ports.changed.mock.calls).toEqual([['one']]);
    expect(f.ports.playbackEnded).not.toHaveBeenCalled();
    expect(f.ports.error).not.toHaveBeenCalled();
    expect(f.speech.cancel).toHaveBeenCalledTimes(2);
    expect(f.speech.speak).toHaveBeenCalledOnce();
  });

  it('tolerates cancellation failure during teardown', () => {
    const f = fixture();
    f.speech.cancel.mockImplementation(() => {
      throw new Error('Device failure');
    });
    expect(() => f.playback.dispose()).not.toThrow();
    expect(f.ports.error).not.toHaveBeenCalled();
    expect(f.ports.playbackEnded).not.toHaveBeenCalled();
  });
});
