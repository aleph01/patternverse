import { resolve } from 'node:path';

/** A fixed artifact lets browser checks coexist with other sessions rebuilding the workspace. */
export const publicBuildDirectory = resolve(process.env.PATTERNVERSE_TEST_BUILD_DIR ?? 'build');
export const publicBuildFile = (file: string): string => resolve(publicBuildDirectory, file);
