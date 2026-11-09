import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { withNavigationCache } from '../../scripts/navigation-adapter.mjs';

const publicBuild = process.env.PATTERNVERSE_PUBLIC_BUILD === 'true';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Dev, type checks and Vitest regenerate files here. A public build must
    // keep its server/client manifests and startup identifier together.
    outDir: publicBuild ? '.svelte-kit/production' : '.svelte-kit',
    files: {
      routes: publicBuild ? 'src/.public-routes' : 'src/routes',
    },
    // The client registers a release-specific URL in the existing worker scope.
    serviceWorker: { register: false },
    // Static pages receive hashes for their generated bootstrap scripts, not unsafe-inline.
    csp: {
      mode: 'auto',
      directives: {
        'default-src': ['self'],
        'script-src': [
          'self',
          'wasm-unsafe-eval',
          'https://www.youtube.com',
          'https://player.vimeo.com',
          'https://geo.dailymotion.com',
        ],
        'frame-src': [
          'self',
          'https://www.youtube.com',
          'https://www.youtube-nocookie.com',
          'https://player.vimeo.com',
          'https://geo.dailymotion.com',
          'https://www.dailymotion.com',
        ],
        'style-src': ['self', 'unsafe-inline'],
        'img-src': ['self', 'data:', 'blob:', 'https:'],
        'font-src': ['self', 'data:'],
        'media-src': ['self', 'blob:', 'https:'],
        // Public library sources may be hosted on arbitrary HTTPS origins.
        'connect-src': [
          'self',
          'https:',
          'ipc:',
          'http://ipc.localhost',
          'ws://localhost:*',
          'ws://127.0.0.1:*',
        ],
        'worker-src': ['self', 'blob:'],
        'object-src': ['none'],
        'base-uri': ['self'],
        'form-action': ['self'],
      },
    },
    adapter: withNavigationCache(
      adapter({
        pages: 'build',
        assets: 'build',
        strict: true,
      }),
    ),
  },
};

export default config;
