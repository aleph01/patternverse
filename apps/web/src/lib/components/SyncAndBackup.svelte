<script lang="ts">
  import { resolve } from '$app/paths';
  import { PUBLIC_DROPBOX_APP_KEY } from '$env/static/public';
  import { onMount } from 'svelte';
  import { createSyncSettings, initialSyncSettings } from '$lib/client/sync-settings';
  import { browserSyncSettings } from '$lib/client/sync-settings-browser';
  import type { SyncChoice } from '$lib/client/dropbox-sync';
  import WorkspaceSyncReview from './WorkspaceSyncReview.svelte';
  import WorkspaceSyncUpgrade from './WorkspaceSyncUpgrade.svelte';

  // Opt in only from a private/test host until real-account upgrade/rollback validation.
  let {
    compact = false,
    workspaceSync = false,
    dropboxSignInOnly = false,
  }: { compact?: boolean; workspaceSync?: boolean; dropboxSignInOnly?: boolean } = $props();
  const accountOnly = $derived(workspaceSync && dropboxSignInOnly);
  let sync = $state(initialSyncSettings());
  const settings = createSyncSettings(
    browserSyncSettings({
      appKey: PUBLIC_DROPBOX_APP_KEY,
      callbackPath: resolve('/auth/dropbox/callback'),
      mode: () =>
        accountOnly ? 'dropbox-account' : workspaceSync ? 'workspace-phrase' : 'legacy-phrase',
    }),
    (state) => {
      sync = state;
    },
  );
  onMount(() => {
    settings.mount();
    return settings.dispose;
  });
  function toggleAutomaticSync(event: Event) {
    const control = event.currentTarget as HTMLInputElement;
    control.checked = settings.setAutomaticSync(control.checked);
  }
</script>

<section class="sync-settings" class:compact aria-labelledby="sync-heading">
  <div class="my-section-heading">
    <p>Sync and backup</p>
    <h2 id="sync-heading">keep your work close.</h2>
  </div>

  <div class="sync-status-grid">
    <article class="device-status">
      <div class="status-kicker">
        <span class="status-dot active" aria-hidden="true"></span>
        <span>This device</span>
      </div>
      <h3>saved locally</h3>
      <p>Your personal workspace is available offline in this browser.</p>
      <strong>All local changes saved</strong>
    </article>

    <article class="cloud-status" class:connected={sync.connection}>
      <div class="status-kicker">
        <span class="status-dot" class:active={sync.connection} aria-hidden="true"></span>
        <span>Cloud storage</span>
      </div>
      {#if sync.connection}
        <h3>Dropbox connected</h3>
        <p>{sync.connection.displayName ?? sync.connection.email ?? 'Your Dropbox account'}</p>
        <button type="button" disabled={sync.syncing} onclick={() => void settings.disconnect()}
          >Disconnect</button
        >
      {:else}
        <h3>not connected</h3>
        <p>
          Connect Dropbox to synchronize your personal workspace and saved Mira conversations
          between devices. {accountOnly && sync.automaticSync
            ? 'Saved work syncs automatically while this app is open and online. You can turn this off below before connecting.'
            : 'Sync starts only when you choose “Sync now”.'}
        </p>
        {#if accountOnly}
          <p>
            No extra password is needed. Synced content is stored without Patternverse encryption in
            your Dropbox app folder. Dropbox and anyone with access to your account can read it.
          </p>
        {/if}
        <button
          class="button-link primary"
          type="button"
          disabled={sync.connecting}
          onclick={() => void settings.connect()}
        >
          {sync.connecting ? 'Opening Dropbox…' : 'Connect Dropbox'}
        </button>
      {/if}
    </article>
  </div>

  {#if accountOnly}
    <div class="automatic-sync-settings">
      <label class="automatic-sync-toggle">
        <span><strong>Automatic Dropbox sync</strong><small>On this device</small></span>
        <input
          type="checkbox"
          role="switch"
          checked={sync.automaticSync}
          onchange={toggleAutomaticSync}
          aria-describedby="automatic-sync-description"
        />
      </label>
      <p id="automatic-sync-description">
        Sync saved work while the app is open, online, and connected to Dropbox. Conflicts pause for
        your review. Turn this off to use “Sync now” only. An already-running sync finishes safely.
      </p>
      {#if sync.preferenceMessage}<p role="status">{sync.preferenceMessage}</p>{/if}
      {#if sync.preferenceError}<p role="alert">{sync.preferenceError}</p>{/if}
    </div>
  {/if}

  {#if sync.connection}
    <div class="sync-controls">
      <h3>{accountOnly ? 'Dropbox sync' : 'Encrypted cross-device sync'}</h3>
      {#if accountOnly}
        <p>
          Sync your workspace content, saved responses, ratings and saved conversations using your
          Dropbox account—no extra password. Synced content is stored without Patternverse
          encryption in your Dropbox app folder. Dropbox and anyone with access to your account can
          read it. Device settings and AI credentials are never synced.
        </p>
        <p class="automatic-sync-status">
          Automatic sync {sync.automaticSync ? 'on' : 'off'}
          {#if sync.lastSyncedAt}<br />Last synced {new Date(sync.lastSyncedAt).toLocaleTimeString(
              [],
              {
                hour: '2-digit',
                minute: '2-digit',
              },
            )}{/if}
        </p>
      {:else}
        <p>
          {workspaceSync
            ? 'Workspace content, saved responses, ratings and conversations'
            : 'Personal library items and conversations'} are encrypted before they leave this device.
          Choose a strong phrase when linking your first device, then enter that same phrase on another
          device. This device remembers its key, so you do not need to unlock on every visit. Your OpenRouter
          key is never synced.
        </p>
        <label for="sync-phrase"
          >{sync.remembered
            ? workspaceSync
              ? 'Sync phrase (only if unlocking again)'
              : 'Sync phrase (only if changing key)'
            : 'Sync phrase'}</label
        >
        <input
          id="sync-phrase"
          type="password"
          value={sync.syncPhrase}
          oninput={(event) => settings.setPhrase(event.currentTarget.value)}
          autocomplete="new-password"
        />
      {/if}
      {#if sync.workspaceReview}
        <WorkspaceSyncReview
          result={sync.workspaceReview}
          busy={sync.syncing}
          onresolve={(selected, token) => void settings.resolve(selected, token)}
          onrecover={(selected, token) => void settings.recover(selected, token)}
          onretry={() => void settings.synchronize()}
          oncancel={settings.cancelReview}
        />
      {/if}
      {#if sync.workspaceUpgrade}
        <WorkspaceSyncUpgrade
          result={sync.workspaceUpgrade}
          busy={sync.syncing}
          onupgrade={(token) => void settings.upgrade(token)}
          oncancel={settings.cancelUpgrade}
        />
      {/if}
      {#if sync.conflicts.length}
        <div class="sync-conflicts" role="group" aria-label="Sync conflicts">
          <p>Choose which version to keep for each item changed on both devices.</p>
          {#each sync.conflicts as conflict (conflict.key)}
            <label>
              <span>{conflict.title}</span>
              <select
                value={sync.choices[conflict.key] ?? ''}
                onchange={(event) =>
                  settings.chooseLegacy(conflict.key, event.currentTarget.value as SyncChoice)}
              >
                <option value="">Choose a version</option>
                <option value="local">This device</option>
                <option value="remote">Dropbox</option>
              </select>
            </label>
          {/each}
        </div>
      {/if}
      {#if !sync.workspaceReview && !sync.workspaceUpgrade}
        <button
          class="button-link primary"
          type="button"
          disabled={sync.syncing ||
            (sync.conflicts.length > 0 && sync.conflicts.some((item) => !sync.choices[item.key]))}
          onclick={() => void settings.synchronize()}
          >{sync.syncing
            ? 'Syncing…'
            : sync.conflicts.length
              ? 'Resolve and sync'
              : 'Sync now'}</button
        >
      {/if}
    </div>
  {/if}

  {#if sync.connectionMessage}
    <p class="connection-message sync-connection-message" aria-live="polite">
      {sync.connectionMessage}
    </p>
  {/if}
</section>

<style>
  /* Retain the existing selector weights while relocating the feature rules.
   * Shared review/upgrade children still receive the legacy sync control styles.
   * Layout and compact overrides stay separate from the shared token decisions.
   */
  :global {
    .sync-settings {
      --muted: var(--text-muted-on-dark);
      --ink-muted: var(--text-muted-on-dark);
      padding: clamp(5rem, 10vw, 9rem) max(3vw, calc((100vw - 1440px) / 2));
      border-bottom: var(--border-width) solid var(--ink);
      background: var(--surface-dark);
      color: var(--text-on-dark);
    }
    .my-section-heading > p {
      margin: 0 0 var(--space-5);
      font-size: var(--text-xs);
      font-weight: var(--weight-eyebrow);
      letter-spacing: 0.04em;
      text-transform: lowercase;
    }
    .my-section-heading h2 {
      max-width: 12ch;
      margin: 0;
      font-size: clamp(3.2rem, 7vw, 7rem);
      line-height: 0.9;
      letter-spacing: -0.06em;
      text-transform: lowercase;
    }
    .sync-status-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-top: clamp(4rem, 8vw, 7rem);
      border-top: var(--border-width) solid var(--border-on-dark);
      border-bottom: var(--border-width) solid var(--border-on-dark);
    }
    .sync-status-grid article {
      display: flex;
      min-height: 360px;
      flex-direction: column;
      align-items: flex-start;
      padding: clamp(1.5rem, 4vw, 3rem);
    }
    .sync-status-grid article + article {
      border-left: var(--border-width) solid var(--border-on-dark);
    }
    .status-kicker {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.72rem;
      font-weight: var(--weight-eyebrow);
      letter-spacing: 0.04em;
      text-transform: lowercase;
    }
    .status-dot {
      width: 0.65rem;
      height: 0.65rem;
      border: var(--border-width) solid currentColor;
      border-radius: 50%;
    }
    .status-dot.active {
      border-color: var(--green);
      background: var(--green);
    }
    .sync-status-grid h3 {
      margin: auto 0 var(--space-4);
      font-size: clamp(2.3rem, 5vw, 5.2rem);
      line-height: 0.9;
      letter-spacing: -0.06em;
      text-transform: lowercase;
    }
    .sync-status-grid p {
      max-width: 34ch;
      margin: 0 0 var(--space-6);
      color: var(--muted);
      line-height: 1.5;
    }
    .sync-status-grid strong {
      color: var(--green);
      font-size: var(--text-xs);
      text-transform: lowercase;
    }
    .sync-settings button {
      min-height: var(--control-min-height);
      padding: 0.7rem var(--space-4);
      border: var(--border-width) solid currentColor;
      color: inherit;
      background: transparent;
      font-size: var(--text-control);
      font-weight: var(--weight-control);
      text-transform: lowercase;
      cursor: pointer;
    }
    .sync-settings button:disabled {
      cursor: wait;
      opacity: 0.65;
    }
    .sync-settings .button-link.primary {
      border-color: var(--green);
      color: var(--ink);
      background: var(--green);
    }
    .sync-settings .button-link.primary:hover,
    .sync-settings .button-link.primary:focus-visible {
      color: var(--text-on-dark);
      background: var(--green-dark);
    }
    .sync-connection-message {
      margin: 0;
      color: var(--muted);
      font-size: 0.82rem;
      line-height: 1.5;
      padding-top: var(--space-5);
    }
    .sync-controls {
      display: grid;
      justify-items: start;
      gap: 0.8rem;
      max-width: 680px;
      padding-top: var(--space-8);
    }
    .sync-controls > h3,
    .sync-controls > p {
      margin: 0;
    }
    .sync-controls > p {
      color: var(--muted);
      line-height: 1.5;
    }
    .sync-controls label {
      font-size: 0.8rem;
      font-weight: var(--weight-label);
    }
    .sync-controls input,
    .sync-controls select {
      width: min(100%, 420px);
      min-height: var(--control-min-height);
      padding: 0.65rem 0.8rem;
      border: var(--border-width) solid var(--border-control-on-dark);
      border-radius: var(--radius-control);
      background: var(--surface-dark-raised);
      color: var(--text-on-dark);
      font: inherit;
    }
    .sync-conflicts {
      display: grid;
      gap: var(--space-4);
      width: 100%;
      padding: var(--space-4);
      border: var(--border-width) solid var(--border-control-on-dark);
    }
    .sync-conflicts label {
      display: grid;
      gap: 0.4rem;
    }
    @media (max-width: 760px) {
      .sync-status-grid {
        grid-template-columns: 1fr;
      }
      .sync-status-grid article {
        min-height: 300px;
      }
      .sync-status-grid article + article {
        border-top: var(--border-width) solid var(--border-on-dark);
        border-left: 0;
      }
    }
  }
  .automatic-sync-settings {
    border-top: var(--border-width) solid var(--border-on-dark);
    padding-top: 1.4rem;
    margin-top: var(--space-8);
  }
  .automatic-sync-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    font-size: 0.9rem;
  }
  .automatic-sync-toggle span {
    display: grid;
    gap: 0.3rem;
  }
  .automatic-sync-toggle small {
    color: var(--muted);
    font-weight: 400;
  }
  .automatic-sync-toggle input {
    width: 22px;
    height: 22px;
    min-height: 0;
    flex-shrink: 0;
    accent-color: var(--green);
    cursor: pointer;
  }
  .automatic-sync-settings p {
    color: var(--muted);
    font-size: 0.85rem;
    line-height: 1.6;
  }
  .automatic-sync-settings [role='alert'] {
    color: #ffb4a8;
  }
  .sync-settings.compact {
    padding: var(--space-6);
    border: 1px solid #33372f;
    border-radius: var(--radius-panel);
  }
  .compact :global(.my-section-heading h2) {
    max-width: none;
    font-size: 1.65rem;
    line-height: 1.2;
  }
  .compact :global(.sync-status-grid) {
    margin-top: var(--space-6);
  }
  .compact :global(.sync-status-grid article) {
    min-height: 210px;
    padding: var(--space-5);
  }
  .compact :global(.sync-status-grid h3) {
    font-size: 1.5rem;
    line-height: 1.2;
    margin-bottom: 0.65rem;
  }
  .compact :global(.sync-status-grid p) {
    font-size: 0.82rem;
  }
  @media (max-width: 800px) {
    .sync-settings.compact {
      padding: var(--space-4);
    }
    .compact :global(.sync-status-grid) {
      grid-template-columns: 1fr;
    }
    .compact :global(.sync-status-grid article + article) {
      border-left: 0;
      border-top: var(--border-width) solid var(--border-on-dark);
    }
  }
</style>
