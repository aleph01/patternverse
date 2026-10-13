import { describe, expect, it, vi } from 'vitest';
import { createVoiceController } from './voice-controller';
import type { VoiceListeningCallbacks } from './browser-voice';
import type { VoiceContext } from './voice-commands';

const settle = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
function setup() {
  let callbacks!: VoiceListeningCallbacks;
  let context: VoiceContext & { sessionId: string } = {
    sessionId: 'one',
    surface: 'chat',
    choices: [],
    modalities: [],
    selectedPattern: false,
  };
  const stop = vi.fn();
  const execute = vi.fn(async () => 'Done');
  const interpret = vi.fn<(messages: unknown, signal: AbortSignal) => Promise<string>>(
    async () => '{"type":"patterns","query":""}',
  );
  const changed = vi.fn();
  const control = createVoiceController({
    listen: (value) => {
      callbacks = value;
      return { stop };
    },
    context: () => context,
    speaking: () => false,
    execute,
    interpret,
    changed,
  });
  return {
    control,
    stop,
    execute,
    interpret,
    changed,
    say: (text: string) => callbacks.onFinal(text),
    interim: (text: string) => callbacks.onInterim(text),
    setSession: (id: string) => {
      context = { ...context, sessionId: id };
    },
  };
}
describe('voice controller lifecycle', () => {
  it('never executes interim text and drops late finals after stopping', async () => {
    const test = setup();
    await test.control.start();
    test.interim('send');
    await settle();
    expect(test.execute).not.toHaveBeenCalled();
    expect(test.changed).toHaveBeenLastCalledWith(expect.objectContaining({ interim: '' }));
    test.interim('I am thinking');
    expect(test.changed).toHaveBeenLastCalledWith(
      expect.objectContaining({ interim: 'I am thinking' }),
    );
    test.say('I am thinking');
    await settle();
    expect(test.execute).toHaveBeenCalledWith({ type: 'draft', text: 'I am thinking' });
    test.control.stop();
    test.say('send');
    await settle();
    expect(test.execute).toHaveBeenCalledTimes(1);
    expect(test.stop).toHaveBeenCalledOnce();
  });
  it('discards interpretation when the session changes', async () => {
    const test = setup();
    let finish!: (value: string) => void;
    test.interpret.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await test.control.start();
    test.say('could you show the patterns?');
    await settle();
    test.setSession('two');
    finish('{"type":"patterns","query":""}');
    await settle();
    expect(test.execute).not.toHaveBeenCalled();
    expect(test.changed).toHaveBeenLastCalledWith(
      expect.objectContaining({ feedback: 'The view changed. Please say the command again.' }),
    );
  });
  it('recognizes stop immediately while interpretation is pending', async () => {
    const test = setup();
    let signal!: AbortSignal;
    test.interpret.mockImplementation((_messages, value) => {
      signal = value;
      return new Promise(() => {});
    });
    await test.control.start();
    test.say('could you show some patterns?');
    await settle();
    test.say('stop listening');
    expect(signal.aborted).toBe(true);
    expect(test.stop).toHaveBeenCalledOnce();
  });
  it('pauses recognition for readback and resumes unless the user stopped', async () => {
    const test = setup();
    await test.control.start();
    test.control.playbackStarted();
    test.say('send');
    await settle();
    expect(test.execute).not.toHaveBeenCalled();
    test.control.playbackEnded();
    await settle();
    test.say('send');
    await settle();
    expect(test.execute).toHaveBeenCalledOnce();
    test.control.playbackStarted();
    test.control.stop();
    test.control.playbackEnded();
    expect(test.changed).toHaveBeenLastCalledWith(expect.objectContaining({ phase: 'off' }));
  });
});
