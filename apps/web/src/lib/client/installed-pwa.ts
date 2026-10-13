import { readable } from 'svelte/store';

/** Installation is a display context, not merely having an active service worker. */
export const installedPwa = readable(false, (set) => {
  if (typeof window === 'undefined') return;

  const modes = ['standalone', 'minimal-ui'].map((mode) =>
    window.matchMedia(`(display-mode: ${mode})`),
  );
  const update = () => {
    const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
    set(
      !('__TAURI_INTERNALS__' in window) &&
        (iosStandalone === true || modes.some((mode) => mode.matches)),
    );
  };

  update();
  modes.forEach((mode) => mode.addEventListener('change', update));
  return () => modes.forEach((mode) => mode.removeEventListener('change', update));
});
