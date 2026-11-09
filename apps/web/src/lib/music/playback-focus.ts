let active: (() => void) | undefined;

/** Only one provider frame or synthesized transport may own playback at a time. */
export function stopMusicPlayback() {
  const stop = active;
  active = undefined;
  stop?.();
}
export function claimMusicPlayback(stop: () => void) {
  stopMusicPlayback();
  active = stop;
}
export function releaseMusicPlayback(stop: () => void) {
  if (active === stop) active = undefined;
}
