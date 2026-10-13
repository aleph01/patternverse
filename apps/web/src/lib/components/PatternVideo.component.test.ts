// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PatternVideo from './PatternVideo.svelte';
import ShowContent from './ShowContent.svelte';
import type { PatternVideo as Config } from '$lib/pattern-run/video';

const config: Config = {
  provider: 'file',
  url: 'https://example.com/clip.mp4',
  id: null,
  title: 'A short clip',
  start_seconds: 10,
  end_seconds: 30,
  autoplay: false,
  muted: false,
  loop_video: false,
  captions: null,
};
const pause = vi.fn(),
  play = vi.fn().mockResolvedValue(undefined);
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

it('shows a video effect with a title and a usable source link', () => {
  render(ShowContent, {
    effect: {
      effect_id: 'clip',
      run_id: 'run',
      request: { kind: 'content.video', payload: { video: config, markdown: '' } },
    },
  });
  expect(screen.getByRole('heading', { name: 'A short clip' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Open source video' }).getAttribute('href')).toBe(
    config.url,
  );
  expect(document.querySelector('video')?.controls).toBe(true);
});
it('seeks to start, stops at end and pauses with the practice', async () => {
  const view = render(PatternVideo, { video: config });
  const element = document.querySelector('video')!;
  Object.defineProperty(element, 'duration', { value: 100 });
  await fireEvent.loadedMetadata(element);
  expect(element.currentTime).toBe(10);
  element.currentTime = 30;
  await fireEvent.timeUpdate(element);
  expect(element.currentTime).toBe(10);
  expect(pause).toHaveBeenCalled();
  expect(play).not.toHaveBeenCalled();
  await view.rerender({ video: config, runningAllowed: false });
  expect(pause).toHaveBeenCalled();
});
it('loops the excerpt and reports an impossible duration', async () => {
  render(PatternVideo, { video: { ...config, loop_video: true } });
  const element = document.querySelector('video')!;
  element.currentTime = 30;
  await fireEvent.timeUpdate(element);
  expect(play).toHaveBeenCalled();
  Object.defineProperty(element, 'duration', { value: 20 });
  await fireEvent.loadedMetadata(element);
  expect(screen.getByRole('alert').textContent).toContain('outside');
});
