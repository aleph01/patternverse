// Restore the device's text size before the first paint, including before hydration.
try {
  const size = localStorage.getItem('patternverse:font-size');
  if (size === 'small' || size === 'large') document.documentElement.dataset.fontSize = size;
} catch {
  // Keep the standard size when browser storage is unavailable.
}
