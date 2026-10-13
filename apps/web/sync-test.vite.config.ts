import { resolve } from 'node:path';
import { mergeConfig } from 'vite';
import appConfig from './vite.config.ts';

// Test-only module harness; do not broaden the ordinary app's file-serving policy.
export default mergeConfig(appConfig, {
  server: {
    fs: {
      allow: [
        resolve(process.cwd()),
        resolve(process.cwd(), '../../packages'),
        resolve(process.cwd(), '../../node_modules'),
      ],
    },
  },
});
