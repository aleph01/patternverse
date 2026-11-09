import { describe, expect, it } from 'vitest';
import {
  canRunStandalonePattern,
  isDropboxSignInOnlyEnabled,
  isWorkspaceDropboxSyncEnabled,
  resolveReleaseFeatures,
} from './release-features';

describe('release feature configuration', () => {
  it('requires an explicit sign-in-only opt-in and enabled workspace sync', () => {
    expect(isDropboxSignInOnlyEnabled(true, { VITE_RELEASE_PROFILE: 'full' })).toBe(false);
    expect(isDropboxSignInOnlyEnabled(false, { DEV: false })).toBe(false);
    expect(
      isDropboxSignInOnlyEnabled(false, {
        VITE_DROPBOX_SIGN_IN_ONLY: 'true',
        VITE_WORKSPACE_DROPBOX_SYNC: 'false',
      }),
    ).toBe(false);
    expect(
      isDropboxSignInOnlyEnabled(false, {
        VITE_DROPBOX_SIGN_IN_ONLY: 'true',
        VITE_FEATURE_DROPBOX_SYNC: 'false',
      }),
    ).toBe(false);
    expect(
      isDropboxSignInOnlyEnabled(false, {
        VITE_FEATURE_DROPBOX_SYNC: 'true',
        VITE_WORKSPACE_DROPBOX_SYNC: 'true',
        VITE_DROPBOX_SIGN_IN_ONLY: 'true',
      }),
    ).toBe(true);
  });
  const allOff = {
    voice: false,
    guidedExercises: false,
    standalonePatterns: true,
    advancedModels: false,
    dropboxSync: true,
  };
  const allOn = {
    voice: true,
    guidedExercises: true,
    standalonePatterns: true,
    advancedModels: true,
    dropboxSync: true,
  };

  it('uses the core profile for a public web build', () => {
    expect(resolveReleaseFeatures(false, { DEV: false })).toEqual(allOff);
  });

  it('preserves the full desktop and local development experiences', () => {
    expect(resolveReleaseFeatures(true, { DEV: false })).toEqual(allOn);
    expect(resolveReleaseFeatures(false, { DEV: true })).toEqual(allOn);
  });

  it('can switch each feature independently without changing saved data', () => {
    expect(
      resolveReleaseFeatures(false, { VITE_RELEASE_PROFILE: 'core', VITE_FEATURE_VOICE: 'true' }),
    ).toEqual({ ...allOff, voice: true });
    expect(resolveReleaseFeatures(true, { VITE_FEATURE_DROPBOX_SYNC: 'false' })).toEqual({
      ...allOn,
      dropboxSync: false,
    });
    expect(resolveReleaseFeatures(false, { VITE_FEATURE_STANDALONE_PATTERNS: 'false' })).toEqual({
      ...allOff,
      standalonePatterns: false,
    });
  });

  it('allows non-AI therapy patterns under the standalone flag but retains the AI gate', () => {
    expect(canRunStandalonePattern(allOff, true, false)).toBe(true);
    expect(canRunStandalonePattern(allOff, true, true)).toBe(false);
    expect(canRunStandalonePattern(allOff, false, true)).toBe(true);
    expect(canRunStandalonePattern({ ...allOff, standalonePatterns: false }, true, false)).toBe(
      false,
    );
  });

  it('enables encrypted workspace sync by default in public, full and desktop builds', () => {
    for (const environment of [
      { DEV: false },
      { DEV: true },
      { VITE_RELEASE_PROFILE: 'full' },
      { VITE_FEATURE_DROPBOX_SYNC: 'true' },
    ]) {
      expect(isWorkspaceDropboxSyncEnabled(false, environment)).toBe(true);
      expect(isWorkspaceDropboxSyncEnabled(true, environment)).toBe(true);
      expect(isDropboxSignInOnlyEnabled(false, environment)).toBe(false);
      expect(isDropboxSignInOnlyEnabled(true, environment)).toBe(false);
    }
  });

  it('honors explicit Dropbox and workspace-sync opt-outs', () => {
    expect(
      isWorkspaceDropboxSyncEnabled(false, {
        VITE_RELEASE_PROFILE: 'core',
        VITE_FEATURE_DROPBOX_SYNC: 'true',
        VITE_WORKSPACE_DROPBOX_SYNC: 'true',
      }),
    ).toBe(true);
    expect(isWorkspaceDropboxSyncEnabled(false, { VITE_WORKSPACE_DROPBOX_SYNC: 'true' })).toBe(
      true,
    );
    expect(
      isWorkspaceDropboxSyncEnabled(true, {
        VITE_FEATURE_DROPBOX_SYNC: 'false',
        VITE_WORKSPACE_DROPBOX_SYNC: 'true',
      }),
    ).toBe(false);
    expect(isWorkspaceDropboxSyncEnabled(true, { VITE_WORKSPACE_DROPBOX_SYNC: 'false' })).toBe(
      false,
    );
  });
});
