<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Session } from '@patternverse/companion-core';
  import { modalityById } from './modalities';
  import type { MiraSessionsActions } from './panels';
  import MiraPanel from './MiraPanel.svelte';

  let {
    sessions,
    renameId = $bindable(),
    renameDraft = $bindable(),
    archivePassphrase = $bindable(),
    importFile = $bindable(),
    transferring,
    actions,
    error,
    notice,
    feedback,
    onClose,
  }: {
    sessions: readonly Session[];
    renameId: string | null;
    renameDraft: string;
    archivePassphrase: string;
    importFile: File | null;
    transferring: boolean;
    actions: MiraSessionsActions;
    error: string;
    notice: string;
    feedback: Snippet;
    onClose: () => void;
  } = $props();
</script>

<MiraPanel
  heading="Sessions"
  headingId="mira-sessions-heading"
  closeLabel="Close sessions"
  {error}
  {notice}
  {feedback}
  {onClose}
>
  <button type="button" class="mira-drawer-new" onclick={() => actions.newSession()}
    >New session <span aria-hidden="true">＋</span></button
  >
  {#if sessions.length === 0}<p>No sessions yet. Start one whenever you are ready.</p>{/if}
  <div class="mira-session-grid">
    {#each sessions as session (session.id)}
      <article class="mira-session-card">
        <p>
          {modalityById(session.modalityId).name} · {new Date(
            session.updatedAt,
          ).toLocaleDateString()}
        </p>
        {#if renameId === session.id}
          <form
            onsubmit={(event) => {
              event.preventDefault();
              void actions.renameSession(session);
            }}
          >
            <label for={`mira-rename-${session.id}`}>Session name</label><input
              id={`mira-rename-${session.id}`}
              bind:value={renameDraft}
              maxlength="120"
            />
            <button type="submit">Save</button><button
              type="button"
              onclick={() => {
                renameId = null;
                renameDraft = '';
              }}>Cancel</button
            >
          </form>
        {:else}
          <h3>{session.title}</h3>
          <span>{session.messages.length} messages</span>
          <div class="mira-session-actions">
            <button type="button" onclick={() => actions.activate(session.id)}>Open</button><button
              type="button"
              onclick={() => {
                renameId = session.id;
                renameDraft = session.title;
              }}>Rename</button
            ><button type="button" class="danger" onclick={() => actions.deleteSession(session)}
              >Delete</button
            >
          </div>
        {/if}
      </article>
    {/each}
  </div>
  <section class="mira-archive" aria-labelledby="mira-archive-heading">
    <h3 id="mira-archive-heading">Encrypted backup &amp; transfer</h3>
    <p>
      Export a portable archive or import one you chose. Nothing is imported automatically. The
      archive excludes your OpenRouter key.
    </p>
    <label for="mira-archive-passphrase">Archive passphrase</label>
    <input
      id="mira-archive-passphrase"
      type="password"
      bind:value={archivePassphrase}
      autocomplete="new-password"
      minlength="8"
    />
    <div class="mira-settings-actions">
      <button
        type="button"
        onclick={actions.exportSessions}
        disabled={transferring || !sessions.length}>Export encrypted archive</button
      >
      <label class="mira-file-label" for="mira-import-file">Choose archive</label>
      <input
        id="mira-import-file"
        type="file"
        accept="application/json,.json"
        onchange={(event) => {
          importFile = event.currentTarget.files?.[0] ?? null;
        }}
      />
      <button type="button" onclick={actions.importSessions} disabled={transferring || !importFile}
        >Import selected archive</button
      >
    </div>
    {#if importFile}<p>Selected: {importFile.name}</p>{/if}
  </section>
</MiraPanel>
