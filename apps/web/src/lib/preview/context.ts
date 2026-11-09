import { getContext, setContext } from 'svelte';
import { createPreviewMode, type PreviewMode } from './mode';

const key = Symbol('patternverse-preview');

export function providePreviewMode(available = true): PreviewMode {
  return setContext(key, createPreviewMode(available));
}

export function getPreviewMode(): PreviewMode {
  // Independently mounted components remain public-only without a provider.
  return getContext<PreviewMode | undefined>(key) ?? createPreviewMode(false);
}
