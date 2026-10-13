<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { resolve } from '$app/paths';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import { subscribeWorkspaceChanges } from '$lib/client/workspace-changes';
  import { createWorkspaceRefresh } from '$lib/client/workspace-refresh';
  import {
    readLibraryPreferences,
    saveLibraryPreferences,
    type LibraryPreferences,
  } from '$lib/client/library-preferences';

  let name = $state('');
  let storedName = $state('');
  let preferences = $state<LibraryPreferences>({ layout: 'cards', pageSize: 20 });
  let ready = $state(false);
  let saving = $state(false);
  let message = $state('');
  let error = $state('');
  let resumeRefresh = async () => {};
  $effect(() => {
    if (!saving && name === storedName) void untrack(resumeRefresh);
  });
  onMount(() => {
    preferences = readLibraryPreferences();
    const reader = createWorkspaceRefresh({
      read: async () => (await getLocalWorkspace()).getWorkspace(),
      apply: (workspace) => {
        name = storedName = workspace.name;
        ready = true;
        error = '';
      },
      failed: () => {
        error = 'Your local workspace is unavailable.';
      },
      canRefresh: () => !saving && name === storedName,
    });
    resumeRefresh = reader.resume;
    const refresh = () => {
      void reader.refresh();
    };
    refresh();
    const unsubscribe = subscribeWorkspaceChanges(['workspace'], refresh);
    window.addEventListener('focus', refresh);
    return () => {
      reader.dispose();
      unsubscribe();
      window.removeEventListener('focus', refresh);
    };
  });
  async function save() {
    if (!ready || saving) return;
    saving = true;
    message = '';
    error = '';
    try {
      const workspace = await getLocalWorkspace();
      name = storedName = (await workspace.renameWorkspace(name)).name;
      saveLibraryPreferences(preferences);
      message = 'Settings saved on this device.';
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Settings could not be saved.';
    } finally {
      saving = false;
    }
  }
</script>

<section aria-labelledby="settings-title">
  <h2 id="settings-title">settings</h2>
  <p>Make this workspace yours. These preferences stay on this device.</p>
  <form
    onsubmit={(event) => {
      event.preventDefault();
      void save();
    }}
  >
    <fieldset disabled={!ready || saving}>
      <label>Workspace name<input bind:value={name} required maxlength="120" /></label>
      <label
        >Default library view<select bind:value={preferences.layout}
          ><option value="cards">Cards</option><option value="list">List</option></select
        ></label
      >
      <label
        >Items per page<select bind:value={preferences.pageSize}
          ><option value={20}>20 items</option><option value={50}>50 items</option></select
        ></label
      >
      <button type="submit">{saving ? 'Saving…' : 'Save settings'}</button>
    </fieldset>
  </form>
  {#if message}<p role="status">{message}</p>{/if}
  {#if error}<p role="alert">{error}</p>{/if}
  <div class="mira-settings-link">
    <h3>Mira settings</h3>
    <p>AI connections and conversation preferences are managed separately in Mira.</p>
    <a href={resolve('/apps/mira')}>Open Mira →</a>
  </div>
</section>

<style>
  h2 {
    margin: 0;
    font-size: 1.5rem;
    letter-spacing: -0.04em;
  }
  p {
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.6;
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 1.7rem 0;
    display: grid;
    gap: 1.3rem;
    max-width: 560px;
  }
  label {
    display: grid;
    gap: 0.55rem;
    font-size: 0.82rem;
    font-weight: 700;
  }
  input,
  select {
    width: 100%;
    min-height: 44px;
    border: 1px solid #d7d9d4;
    border-radius: 6px;
    padding: 0.65rem 0.8rem;
    background: white;
    color: var(--ink);
    font: inherit;
  }
  button {
    justify-self: start;
    min-height: 44px;
    border: 1px solid var(--ink);
    border-radius: 6px;
    padding: 0.7rem 1.1rem;
    background: var(--ink);
    color: white;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
  }
  .mira-settings-link {
    border-top: 1px solid #e2e4df;
    padding-top: 1.4rem;
    margin-top: 2rem;
  }
  h3 {
    margin: 0;
    font-size: 1rem;
  }
  a {
    color: var(--green-dark);
    font-size: 0.85rem;
    font-weight: 700;
  }
  [role='alert'] {
    color: #a62b1f;
  }
</style>
