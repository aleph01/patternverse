/** Build-time switches for the first public web release. Existing local data is never changed. */
export type ReleaseFeature =
  'voice' | 'guidedExercises' | 'standalonePatterns' | 'advancedModels' | 'dropboxSync';
export type ReleaseFeatures = Readonly<Record<ReleaseFeature, boolean>>;

type ReleaseEnvironment = Readonly<Record<string, string | boolean | undefined>>;

const setting: Record<ReleaseFeature, string> = {
  voice: 'VITE_FEATURE_VOICE',
  guidedExercises: 'VITE_FEATURE_GUIDED_EXERCISES',
  standalonePatterns: 'VITE_FEATURE_STANDALONE_PATTERNS',
  advancedModels: 'VITE_FEATURE_ADVANCED_MODELS',
  dropboxSync: 'VITE_FEATURE_DROPBOX_SYNC',
};

/** The desktop retains its full feature set; public web builds start with the core experience. */
export function resolveReleaseFeatures(
  desktop: boolean,
  environment: ReleaseEnvironment = import.meta.env,
): ReleaseFeatures {
  const full =
    desktop ||
    environment.VITE_RELEASE_PROFILE === 'full' ||
    (environment.VITE_RELEASE_PROFILE !== 'core' && environment.DEV === true);
  const enabled = (feature: ReleaseFeature): boolean => {
    const override = environment[setting[feature]];
    return override === 'true' ? true : override === 'false' ? false : full;
  };
  return {
    voice: enabled('voice'),
    guidedExercises: enabled('guidedExercises'),
    standalonePatterns: environment[setting.standalonePatterns] === 'false' ? false : true,
    advancedModels: enabled('advancedModels'),
    dropboxSync: enabled('dropboxSync'),
  };
}

/** Expanded workspace sync stays opt-in, including in full/desktop builds. */
export function isWorkspaceDropboxSyncEnabled(
  desktop: boolean,
  environment: ReleaseEnvironment = import.meta.env,
): boolean {
  return (
    resolveReleaseFeatures(desktop, environment).dropboxSync &&
    environment.VITE_WORKSPACE_DROPBOX_SYNC === 'true'
  );
}

/** Preview rollout only; never switch an existing encrypted archive implicitly. */
export function isDropboxSignInOnlyEnabled(
  desktop: boolean,
  environment: ReleaseEnvironment = import.meta.env,
): boolean {
  return (
    isWorkspaceDropboxSyncEnabled(desktop, environment) &&
    environment.VITE_DROPBOX_SIGN_IN_ONLY === 'true'
  );
}

/** Scripted patterns and declarative practices can run without enabling AI-guided therapy. */
export function canRunStandalonePattern(
  features: ReleaseFeatures,
  isTherapy: boolean,
  needsAi: boolean,
): boolean {
  return isTherapy && needsAi
    ? features.guidedExercises
    : features.standalonePatterns || (isTherapy && features.guidedExercises);
}
