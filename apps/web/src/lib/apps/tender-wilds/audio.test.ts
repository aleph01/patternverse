// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createGardenAudio, SOUND_PREFERENCE } from './audio';

const parameter = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
});
let context: ReturnType<typeof fakeContext>;
function fakeContext() {
  return {
    state: 'running',
    currentTime: 1,
    destination: {},
    resume: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    createGain: vi.fn(() => ({ gain: parameter(), connect: vi.fn(), disconnect: vi.fn() })),
    createOscillator: vi.fn(() => ({
      frequency: parameter(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    })),
  };
}
beforeEach(() => {
  localStorage.removeItem(SOUND_PREFERENCE);
  context = fakeContext();
  vi.stubGlobal(
    'AudioContext',
    vi.fn(function () {
      return context;
    }),
  );
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.removeItem(SOUND_PREFERENCE);
});

it('stays silent by default, remembers the switch and immediately stops active effects when muted', async () => {
  const audio = createGardenAudio();
  await audio.unlock();
  audio.play('harvest');
  expect(AudioContext).not.toHaveBeenCalled();
  await audio.setEnabled(true);
  audio.play('harvest');
  expect(context.createOscillator).toHaveBeenCalledTimes(3);
  const voices = context.createOscillator.mock.results.map((result) => result.value);
  await audio.setEnabled(false);
  expect(voices.every((voice) => voice.disconnect.mock.calls.length === 1)).toBe(true);
  audio.play('reward');
  expect(context.createOscillator).toHaveBeenCalledTimes(3);
  expect(localStorage.getItem(SOUND_PREFERENCE)).toBe('off');
  audio.dispose();
  expect(context.close).toHaveBeenCalledOnce();
});
it('restores the preference but waits for a gesture, and suppresses sounds in hidden tabs', async () => {
  localStorage.setItem(SOUND_PREFERENCE, 'on');
  const audio = createGardenAudio();
  expect(audio.enabled).toBe(true);
  expect(AudioContext).not.toHaveBeenCalled();
  await audio.unlock();
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  audio.action('bridge');
  expect(context.createOscillator).not.toHaveBeenCalled();
  audio.dispose();
});
it('does not report enabled if the browser refuses to start audio', async () => {
  context.state = 'suspended';
  context.resume.mockRejectedValueOnce(new Error('Blocked'));
  const audio = createGardenAudio();
  await expect(audio.setEnabled(true)).rejects.toThrow('Sound could not start');
  expect(audio.enabled).toBe(false);
  audio.play('step');
  expect(context.createOscillator).not.toHaveBeenCalled();
  audio.dispose();
});
