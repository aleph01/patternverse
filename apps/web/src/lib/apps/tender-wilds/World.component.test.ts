// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, expect, it, vi } from 'vitest';
import World from './World.svelte';
import { newGame } from './game';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('moves while arrows are held and stops on release or when focus leaves the garden', async () => {
  const frames = new Map<number, FrameRequestCallback>();
  let nextId = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextId, callback);
    return nextId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  const { container } = render(World, {
    game: newGame(Date.now()),
    now: Date.now(),
    selectedPlot: 0,
    selectedGarden: -1,
    busy: false,
    onPlot: vi.fn(),
    onGarden: vi.fn(),
    onMap: vi.fn(),
    onVisit: vi.fn(),
  });
  const ground = screen.getByRole('button', { name: /Wander around your garden/ });
  const bird = container.querySelector<SVGGElement>('.tw-wanderer')!;
  const position = () => bird.style.transform;
  const initial = position();
  const foot = container.querySelector<SVGGElement>('.bird-foot')!;
  const restingFoot = foot.style.transform;
  await fireEvent.keyDown(ground, { key: 'ArrowRight' });
  expect(position()).not.toBe(initial);
  expect(foot.style.transform).not.toBe(restingFoot);
  const tapped = position();
  const [id, callback] = [...frames.entries()][0];
  frames.delete(id);
  callback(performance.now() + 20);
  await tick();
  expect(position()).not.toBe(tapped);
  await fireEvent.keyUp(ground, { key: 'ArrowRight' });
  expect(foot.style.transform).toBe(restingFoot);
  expect(frames.size).toBe(0);
  await fireEvent.keyDown(ground, { key: 'ArrowLeft' });
  expect(frames.size).toBe(1);
  await fireEvent.focusIn(document.body);
  expect(frames.size).toBe(0);
  const stopped = position();
  await fireEvent.keyDown(document.body, { key: 'ArrowRight' });
  expect(position()).toBe(stopped);
  expect(frames.size).toBe(0);
});
