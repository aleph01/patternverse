// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, it } from 'vitest';
import PatternImage from './PatternImage.svelte';
import ShowContent from './ShowContent.svelte';
import type { PatternImage as Config } from '$lib/pattern-run/image';

const image: Config = {
  url: 'https://example.com/decision-tree.png',
  alt: 'Three possible next steps.',
  title: 'Explore your options',
};
const originalDialogMethods = Object.fromEntries(
  ['showModal', 'close'].map((key) => [
    key,
    Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, key),
  ]),
);
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
});
afterEach(() => {
  cleanup();
  for (const key of ['showModal', 'close']) {
    const descriptor = originalDialogMethods[key];
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
    else delete (HTMLDialogElement.prototype as unknown as Record<string, unknown>)[key];
  }
});

it('renders accessible image content with its Markdown caption', async () => {
  render(ShowContent, {
    effect: {
      effect_id: 'picture',
      run_id: 'run',
      request: { kind: 'content.image', payload: { image, markdown: 'Notice **each branch**.' } },
    },
  });
  expect(screen.getByRole('heading', { name: image.title! })).toBeTruthy();
  const element = screen.getByRole('img', { name: image.alt });
  expect(element.getAttribute('src')).toBe(image.url);
  expect(element.getAttribute('referrerpolicy')).toBe('no-referrer');
  await waitFor(() => expect(screen.getByText('each branch').tagName).toBe('STRONG'));
});

it('enlarges meaningful images and closes without submitting an interaction', async () => {
  render(PatternImage, { image });
  await fireEvent.click(screen.getByRole('button', { name: `Enlarge image: ${image.title}` }));
  expect(screen.getByRole('dialog', { name: image.title! })).toBeTruthy();
  await fireEvent.click(screen.getByRole('button', { name: 'Close enlarged image' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('keeps decorative images out of the image controls and exposes load failures', async () => {
  render(PatternImage, { image: { ...image, alt: '', title: null } });
  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.queryByRole('button', { name: /Enlarge/ })).toBeNull();
  expect(document.querySelector('img')!.alt).toBe('');
  await fireEvent.error(document.querySelector('img')!);
  expect(screen.getByRole('status').textContent).toContain('could not be loaded');
  expect(screen.getByRole('link', { name: 'Open image source' }).getAttribute('href')).toBe(
    image.url,
  );
});

it('shows a text alternative on failure and recovers when the source changes', async () => {
  const view = render(PatternImage, { image });
  await fireEvent.error(screen.getByRole('img'));
  expect(screen.getByText(image.alt)).toBeTruthy();
  await view.rerender({ image: { ...image, url: 'https://example.com/another.png' } });
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.getByRole('img').getAttribute('src')).toContain('another.png');
});
