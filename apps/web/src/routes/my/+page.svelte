<script lang="ts">
  import { onMount } from 'svelte';
  import PersonalWorkspace from '$lib/components/PersonalWorkspace.svelte';
  import SyncAndBackup from '$lib/components/SyncAndBackup.svelte';
  import WorkspaceSettings from '$lib/components/WorkspaceSettings.svelte';
  import WorkspaceBackup from '$lib/components/WorkspaceBackup.svelte';
  import Situations from '$lib/components/Situations.svelte';
  import PracticeHistory from '$lib/components/PracticeHistory.svelte';
  import { page } from '$app/state';
  import { LockKeyhole, Folder, Cloud, Settings, NotebookPen, ListOrdered } from '@lucide/svelte';
  import {
    isDropboxSignInOnlyEnabled,
    isWorkspaceDropboxSyncEnabled,
    resolveReleaseFeatures,
  } from '$lib/release-features';
  let { data } = $props();

  let desktop = $state(false);
  let pane = $state<'content' | 'situations' | 'history' | 'sync' | 'settings'>('content');
  $effect(() => {
    const requested = page.url.searchParams.get('pane');
    if (
      requested === 'history' ||
      requested === 'situations' ||
      requested === 'sync' ||
      requested === 'settings'
    )
      pane = requested;
  });
  const features = $derived(resolveReleaseFeatures(desktop));
  const workspaceSync = $derived(isWorkspaceDropboxSyncEnabled(desktop));
  const dropboxSignInOnly = $derived(isDropboxSignInOnlyEnabled(desktop));
  onMount(() => {
    desktop = '__TAURI_INTERNALS__' in window;
  });
</script>

<svelte:head>
  <title>My Workspace — Patternverse</title>
  <meta
    name="description"
    content="Your private patterns and saved library items, kept on this device."
  />
</svelte:head>

<main class="my-page">
  <header class="workspace-heading">
    <p><LockKeyhole size={13} aria-hidden="true" /> Your private corner of patternverse</p>
    <h1>your workspace.</h1>
    <span>Create, organize, and keep what matters to you.</span>
  </header>
  <div class="workspace-layout">
    <aside>
      <nav aria-label="Workspace navigation">
        <button
          aria-pressed={pane === 'content'}
          onclick={() => {
            pane = 'content';
          }}><Folder size={16} aria-hidden="true" />Your content</button
        ><button
          aria-pressed={pane === 'situations'}
          onclick={() => {
            pane = 'situations';
          }}><ListOrdered size={16} aria-hidden="true" />situations</button
        ><button
          aria-pressed={pane === 'history'}
          onclick={() => {
            pane = 'history';
          }}><NotebookPen size={16} aria-hidden="true" />Practice history</button
        ><button
          aria-pressed={pane === 'sync'}
          onclick={() => {
            pane = 'sync';
          }}><Cloud size={16} aria-hidden="true" />Sync & backup</button
        ><button
          aria-pressed={pane === 'settings'}
          onclick={() => {
            pane = 'settings';
          }}><Settings size={16} aria-hidden="true" />Settings</button
        >
      </nav>
      <p class="local-note">
        <strong>Saved on this device</strong>Dropbox is optional.<br />Your content stays private.
      </p>
    </aside>
    <div class="workspace-main">
      {#if pane === 'content'}<PersonalWorkspace
          commonsEntities={data.entities}
        />{:else if pane === 'situations'}<Situations
        />{:else if pane === 'history'}<PracticeHistory
          commonsEntities={data.entities}
        />{:else if pane === 'sync'}{#if features.dropboxSync}<SyncAndBackup
            compact
            {workspaceSync}
            {dropboxSignInOnly}
          />{:else}<section class="sync-unavailable">
            <h2>sync & backup</h2>
            <p>Your workspace is saved locally on this device. Dropbox sync is available soon.</p>
            <p>
              Clearing this browser’s data can remove your work. Download a workspace backup below
              to keep a copy of your content.
            </p>
          </section>{/if}<WorkspaceBackup />{:else}<WorkspaceSettings />{/if}
    </div>
  </div>
</main>

<style>
  .my-page {
    max-width: 1240px;
    margin: 0 auto;
    padding: 2.8rem 4vw 4rem;
    background: white;
  }
  .workspace-heading {
    margin-bottom: 2.8rem;
  }
  .workspace-heading p {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0 0 0.8rem;
    font-size: 0.72rem;
    color: var(--green-dark);
    font-weight: 700;
  }
  .workspace-heading h1 {
    font-size: clamp(2rem, 4vw, 2.7rem);
    line-height: 1.1;
    letter-spacing: -0.055em;
    margin: 0 0 0.75rem;
    font-weight: 850;
  }
  .workspace-heading > span {
    font-size: 0.94rem;
    color: var(--muted);
  }
  .workspace-layout {
    display: grid;
    grid-template-columns: 174px minmax(0, 1fr);
    gap: 2.7rem;
  }
  nav {
    display: grid;
    gap: 0.4rem;
  }
  nav button {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-height: 44px;
    padding: 0.75rem 0.8rem;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: 0.82rem;
    font-weight: 650;
    text-align: left;
    cursor: pointer;
  }
  nav button[aria-pressed='true'] {
    background: #e9f6ee;
    color: var(--green-dark);
  }
  .local-note {
    border-top: 1px solid #e1e6dc;
    margin: 2rem 0;
    padding-top: 1rem;
    font-size: 0.7rem;
    line-height: 1.8;
    color: var(--muted);
  }
  .local-note strong {
    display: block;
    color: var(--ink);
  }
  .workspace-main {
    min-width: 0;
  }
  .sync-unavailable h2 {
    margin: 0;
    font-size: 1.5rem;
  }
  .sync-unavailable p {
    max-width: 60ch;
    font-size: 0.9rem;
    line-height: 1.7;
    color: var(--muted);
  }
  @media (max-width: 800px) {
    .my-page {
      padding: 1.8rem 5vw 3rem;
    }
    .workspace-heading {
      margin-bottom: 1.7rem;
    }
    .workspace-layout {
      grid-template-columns: minmax(0, 1fr);
      gap: 1.6rem;
    }
    nav {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.35rem;
    }
    nav button {
      min-width: 0;
      flex-shrink: 0;
      gap: 0.4rem;
      padding: 0.65rem 0.6rem;
      font-size: 0.75rem;
    }
    .local-note {
      display: none;
    }
  }
</style>
