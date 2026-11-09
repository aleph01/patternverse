export type NavigationManifest = {
  pages: Record<string, string>;
  redirects: Record<string, { status: number; location: string }>;
};

// The static adapter embeds hashes after prerendering and before publishing the worker.
// Base64 keeps generated URL strings out of JavaScript/template-literal escaping.
export const navigationManifest: NavigationManifest = JSON.parse(
  atob('__PATTERNVERSE_NAVIGATION_MANIFEST__'),
);
