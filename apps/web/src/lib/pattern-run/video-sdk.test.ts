// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { loadVideoSdk } from './video-sdk';

afterEach(() => {
  vi.useRealTimers();
  document.head.replaceChildren();
});

it('shares pending downloads and polls readiness without loading an already available SDK', async () => {
  vi.useFakeTimers();
  let ready = false;
  const source = 'https://example.com/shared-sdk.js';
  const first = loadVideoSdk(source, () => ready);
  expect(loadVideoSdk(source, () => ready)).toBe(first);
  expect(document.head.querySelectorAll('script')).toHaveLength(1);
  ready = true;
  await vi.advanceTimersByTimeAsync(50);
  await first;
  await loadVideoSdk('https://example.com/already-ready.js', () => true);
  expect(document.head.querySelectorAll('script')).toHaveLength(1);
  expect(vi.getTimerCount()).toBe(0);
});

it('cleans up timeouts and allows a failed provider download to be retried', async () => {
  vi.useFakeTimers();
  const source = 'https://example.com/retry-sdk.js';
  const first = loadVideoSdk(source, () => false);
  const failure = expect(first).rejects.toThrow('did not respond');
  await vi.advanceTimersByTimeAsync(15_000);
  await failure;
  expect(document.head.querySelector('script')).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
  const retry = loadVideoSdk(source, () => false);
  const retryFailure = expect(retry).rejects.toThrow('Could not load');
  document.head.querySelector('script')!.dispatchEvent(new Event('error'));
  await retryFailure;
  expect(vi.getTimerCount()).toBe(0);
});
