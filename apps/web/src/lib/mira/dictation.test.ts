import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VoiceListeningCallbacks } from './browser-voice';
import { createMiraDictation, type DictationCallbacks, type DictationPhase } from './dictation';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function setup(desktop = false) {
  const state = {
    desktop,
    enabled: true,
    handsFree: false,
    sessionId: 'one',
    draft: 'Existing draft',
    phase: 'idle' as DictationPhase,
  };
  const browserCallbacks: DictationCallbacks[] = [];
  const nativeCallbacks: VoiceListeningCallbacks[] = [];
  const browser = { stop: vi.fn(), cancel: vi.fn() };
  const native = { stop: vi.fn(), finish: vi.fn(async () => {}) };
  const ports = {
    enabled: () => state.enabled,
    handsFreeActive: () => state.handsFree,
    desktop: () => state.desktop,
    sessionId: () => state.sessionId,
    draft: () => state.draft,
    draftChanged: vi.fn((text: string) => {
      state.draft = text;
    }),
    phaseChanged: vi.fn((phase: DictationPhase) => {
      state.phase = phase;
    }),
    clearMessages: vi.fn(),
    error: vi.fn(),
    focusComposer: vi.fn(),
    startBrowser: vi.fn((callbacks: DictationCallbacks) => {
      browserCallbacks.push(callbacks);
      return browser;
    }),
    startNative: vi.fn(async (callbacks: VoiceListeningCallbacks) => {
      nativeCallbacks.push(callbacks);
      return native;
    }),
    after: (delay: number, callback: () => void) => {
      const timer = setTimeout(callback, delay);
      return () => clearTimeout(timer);
    },
  };
  return {
    state,
    ports,
    browserCallbacks,
    nativeCallbacks,
    browser,
    native,
    controller: createMiraDictation(ports),
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Mira composer dictation coordination', () => {
  it('does not capture when disabled or hands-free commands own the microphone', async () => {
    const test = setup();
    test.state.enabled = false;
    await test.controller.toggle();
    test.state.enabled = true;
    test.state.handsFree = true;
    await test.controller.toggle();
    expect(test.ports.startBrowser).not.toHaveBeenCalled();
    expect(test.ports.phaseChanged).not.toHaveBeenCalled();
  });

  it('keeps the original draft, revises interim text, and finishes without sending', async () => {
    const test = setup();
    await test.controller.toggle();
    expect(test.state.phase).toBe('recording');
    const callbacks = test.browserCallbacks[0];
    callbacks.onText('interim');
    callbacks.onText('final transcript');
    expect(test.state.draft).toBe('Existing draft final transcript');
    await test.controller.toggle();
    expect(test.state.phase).toBe('transcribing');
    await test.controller.toggle();
    expect(test.browser.stop).toHaveBeenCalledTimes(1);
    callbacks.onText('last words');
    callbacks.onEnd();
    expect(test.state.draft).toBe('Existing draft last words');
    expect(test.state.phase).toBe('idle');
    expect(test.ports.focusComposer).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels a stalled browser finish after three seconds and ignores old callbacks', async () => {
    const test = setup();
    await test.controller.toggle();
    const old = test.browserCallbacks[0];
    await test.controller.toggle();
    vi.advanceTimersByTime(3_000);
    expect(test.state.phase).toBe('idle');
    expect(test.browser.cancel).toHaveBeenCalledTimes(1);
    await test.controller.toggle();
    old.onText('stale transcript');
    old.onEnd();
    old.onError('stale error');
    expect(test.state.phase).toBe('recording');
    expect(test.state.draft).toBe('Existing draft');
    expect(test.ports.error).not.toHaveBeenCalled();
    test.controller.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops browser capture at the existing two-minute limit', async () => {
    const test = setup();
    await test.controller.toggle();
    vi.advanceTimersByTime(120_000);
    expect(test.browser.stop).toHaveBeenCalledTimes(1);
    test.browserCallbacks[0].onEnd();
    expect(test.state.phase).toBe('idle');
  });

  it('releases failed browser capture and allows another attempt', async () => {
    const test = setup();
    await test.controller.toggle();
    test.browserCallbacks[0].onError('Microphone denied');
    expect(test.ports.error).toHaveBeenCalledWith('Microphone denied');
    expect(test.state.phase).toBe('idle');
    expect(vi.getTimerCount()).toBe(0);
    await test.controller.toggle();
    expect(test.ports.startBrowser).toHaveBeenCalledTimes(2);
    test.controller.dispose();
  });

  it('reports browser startup failures without leaving capture busy', async () => {
    const test = setup();
    test.ports.startBrowser.mockImplementation(() => {
      throw new Error('Unsupported');
    });
    await test.controller.toggle();
    expect(test.state.phase).toBe('idle');
    expect(test.ports.error).toHaveBeenCalledWith('Unsupported');
  });

  it.each([false, true])('cancels capture and timers on disposal (desktop=%s)', async (desktop) => {
    const test = setup(desktop);
    await test.controller.toggle();
    const calls = test.ports.phaseChanged.mock.calls.length;
    test.controller.dispose();
    await test.controller.toggle();
    if (desktop) {
      expect(test.native.stop).toHaveBeenCalledTimes(1);
      test.nativeCallbacks[0].onFinal('late text');
    } else {
      expect(test.browser.cancel).toHaveBeenCalledTimes(1);
      test.browserCallbacks[0].onText('late text');
      test.browserCallbacks[0].onEnd();
    }
    expect(test.ports.phaseChanged).toHaveBeenCalledTimes(calls);
    expect(test.state.draft).toBe('Existing draft');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves ordered native finals and replaces interim previews', async () => {
    const test = setup(true);
    await test.controller.toggle();
    const callbacks = test.nativeCallbacks[0];
    callbacks.onInterim('first preview');
    callbacks.onInterim('first revision');
    expect(test.state.draft).toBe('Existing draft first revision');
    callbacks.onFinal('first sentence');
    callbacks.onInterim('second preview');
    expect(test.state.draft).toBe('Existing draft first sentence second preview');
    callbacks.onFinal('second sentence');
    expect(test.state.draft).toBe('Existing draft first sentence second sentence');
    test.controller.dispose();
  });

  it('awaits native final transcription once before returning focus', async () => {
    const test = setup(true);
    const gate = deferred<void>();
    test.native.finish.mockReturnValue(gate.promise);
    await test.controller.toggle();
    const finish = test.controller.toggle();
    await test.controller.toggle();
    expect(test.native.finish).toHaveBeenCalledTimes(1);
    expect(test.state.phase).toBe('transcribing');
    test.nativeCallbacks[0].onFinal('final words');
    gate.resolve();
    await finish;
    expect(test.state.draft).toBe('Existing draft final words');
    expect(test.state.phase).toBe('idle');
    expect(test.native.stop).toHaveBeenCalledTimes(1);
    expect(test.ports.focusComposer).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['dispose', 'switch'] as const)(
    'releases a late native permission grant after %s',
    async (action) => {
      const test = setup(true);
      const gate = deferred<typeof test.native>();
      test.ports.startNative.mockReturnValue(gate.promise);
      const start = test.controller.toggle();
      await test.controller.toggle();
      expect(test.ports.startNative).toHaveBeenCalledTimes(1);
      if (action === 'dispose') test.controller.dispose();
      else test.state.sessionId = 'two';
      const publications = test.ports.phaseChanged.mock.calls.length;
      gate.resolve(test.native);
      await start;
      expect(test.native.stop).toHaveBeenCalledTimes(1);
      expect(test.ports.draftChanged).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
      if (action === 'dispose') expect(test.ports.phaseChanged).toHaveBeenCalledTimes(publications);
      else expect(test.state.phase).toBe('idle');
    },
  );

  it('ignores a native permission failure after disposal', async () => {
    const test = setup(true);
    const gate = deferred<typeof test.native>();
    test.ports.startNative.mockReturnValue(gate.promise);
    const start = test.controller.toggle();
    test.controller.dispose();
    gate.reject(new Error('Late failure'));
    await start;
    expect(test.ports.error).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'does not dictate into a different session (desktop=%s)',
    async (desktop) => {
      const test = setup(desktop);
      await test.controller.toggle();
      test.state.sessionId = 'two';
      test.state.draft = 'New conversation';
      if (desktop) {
        test.nativeCallbacks[0].onFinal('wrong chat');
        test.nativeCallbacks[0].onInterim('wrong chat');
      } else test.browserCallbacks[0].onText('wrong chat');
      expect(test.state.draft).toBe('New conversation');
      test.controller.cancel();
      expect(test.state.phase).toBe('idle');
    },
  );

  it('stops a native listener that failed before its startup promise returned', async () => {
    const test = setup(true);
    test.ports.startNative.mockImplementation(async (callbacks) => {
      callbacks.onError('Capture failed');
      return test.native;
    });
    await test.controller.toggle();
    expect(test.native.stop).toHaveBeenCalledTimes(1);
    expect(test.state.phase).toBe('idle');
    expect(test.ports.error).toHaveBeenCalledWith('Capture failed');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not end a newer capture when cancelled native finishing fails late', async () => {
    const test = setup(true);
    const gate = deferred<void>();
    test.native.finish.mockReturnValue(gate.promise);
    await test.controller.toggle();
    const finishing = test.controller.toggle();
    test.controller.cancel();
    await test.controller.toggle();
    gate.reject(new Error('Late finish'));
    await finishing;
    expect(test.state.phase).toBe('recording');
    expect(test.ports.error).not.toHaveBeenCalled();
    expect(test.ports.focusComposer).not.toHaveBeenCalled();
    test.controller.dispose();
  });

  it('finishes native capture at the two-minute limit', async () => {
    const test = setup(true);
    await test.controller.toggle();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(test.native.finish).toHaveBeenCalledTimes(1);
    expect(test.native.stop).toHaveBeenCalledTimes(1);
    expect(test.state.phase).toBe('idle');
  });
});
