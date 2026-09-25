<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import {
    createSession,
    submitMessage,
    transition,
    type Session,
  } from '@patternverse/companion-core';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import {
    findMiraPattern,
    parseMiraPatternQuery,
    type MiraPatternSummary,
  } from '$lib/mira/context';
  import { MODALITIES, modalityById } from '$lib/mira/modalities';
  import GuidedTechnique from '$lib/mira/GuidedTechnique.svelte';
  import { exportPortableArchive, importPortableArchive } from '$lib/mira/portable';
  import {
    createOpenRouterReplyProvider,
    listZdrModels,
    type ZdrModel,
  } from '$lib/mira/openrouter';
  import {
    createPrivateMiraStore,
    type MiraSettings,
    type PrivateMiraStore,
  } from '$lib/mira/private-store';

  let { data } = $props();
  let store = $state<PrivateMiraStore | undefined>(undefined);
  let sessions = $state<readonly Session[]>([]);
  let settings = $state<MiraSettings>({
    model: '',
    openRouterKey: '',
    promptOverrides: {},
    activeSessionId: null,
  });
  let personal = $state<readonly MiraPatternSummary[]>([]);
  let context = $state<ReturnType<typeof parseMiraPatternQuery>>(null);
  let ready = $state(false);
  let view = $state<'chat' | 'sessions' | 'settings'>('chat');
  let draft = $state('');
  let keyDraft = $state('');
  let modelDraft = $state('');
  let promptDraft = $state('');
  let promptModality = $state('narm');
  let models = $state<readonly ZdrModel[]>([]);
  let loadingModels = $state(false);
  let sending = $state(false);
  let error = $state('');
  let notice = $state('');
  let renameId = $state<string | null>(null);
  let renameDraft = $state('');
  let archivePassphrase = $state('');
  let importFile = $state<File | null>(null);
  let transferring = $state(false);
  let composer = $state<HTMLTextAreaElement>();
  let controller: AbortController | undefined;

  const active = $derived(
    sessions.find((session) => session.id === settings.activeSessionId) ?? null,
  );
  const selectedPattern = $derived(findMiraPattern(context, [...personal, ...data.patterns]));
  const activePattern = $derived(
    findMiraPattern(active?.activePattern ?? null, [...personal, ...data.patterns]),
  );
  const returnHref = $derived(
    selectedPattern?.sourceId === 'personal'
      ? `${resolve('/editor')}?id=${encodeURIComponent(selectedPattern.id)}`
      : selectedPattern
        ? resolve('/[type=entityType]/[id]', { type: 'pattern', id: selectedPattern.id })
        : resolve('/'),
  );

  afterNavigate(() => {
    context = parseMiraPatternQuery(new URLSearchParams(window.location.search));
  });
  onMount(() => {
    let alive = true;
    async function initialize() {
      store = createPrivateMiraStore();
      const [saved, preferences] = await Promise.all([store.list(), store.loadSettings()]);
      const restored = await Promise.all(
        saved.map(async (session) => {
          if (!session.pendingReplyId) return session;
          const next = transition(session, {
            type: 'reply-failed',
            replyId: session.pendingReplyId,
            at: new Date().toISOString(),
          }).session;
          await store?.save(next);
          return next;
        }),
      );
      if (!alive) return;
      sessions = restored;
      settings = {
        ...preferences,
        activeSessionId: restored.some((item) => item.id === preferences.activeSessionId)
          ? preferences.activeSessionId
          : (restored[0]?.id ?? null),
      };
      keyDraft = settings.openRouterKey;
      modelDraft = settings.model;
      promptDraft = settings.promptOverrides[promptModality] ?? modalityById(promptModality).prompt;
    }
    void initialize()
      .catch((cause) => {
        if (alive) error = `Private Mira storage could not be opened: ${messageOf(cause)}`;
      })
      .finally(() => {
        if (alive) ready = true;
      });
    void getLocalWorkspace()
      .then((workspace) => workspace.listEntities())
      .then((entries) => {
        if (alive) personal = entries.filter((entry) => entry.type === 'pattern');
      })
      .catch(() => {
        /* Never substitute a Commons pattern for a failed private lookup. */
      });
    return () => {
      alive = false;
      controller?.abort();
    };
  });

  function clearMessages() {
    error = '';
    notice = '';
  }
  function messageOf(cause: unknown) {
    return cause instanceof Error ? cause.message : 'Something went wrong. Please try again.';
  }
  async function saveSession(session: Session) {
    if (!store) throw new Error('Private storage is unavailable.');
    await store.save(session);
    sessions = [session, ...sessions.filter((item) => item.id !== session.id)].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }
  async function activate(id: string) {
    if (!store) return;
    settings = { ...settings, activeSessionId: id };
    await store.saveSettings(settings);
    draft = '';
    view = 'chat';
    clearMessages();
  }
  async function newSession(withContext = false) {
    if (!store) return;
    clearMessages();
    const now = new Date().toISOString();
    const fresh = createSession(crypto.randomUUID(), active?.modalityId ?? 'narm', now);
    const session =
      withContext && context
        ? transition(fresh, { type: 'select-pattern', pattern: context, at: now }).session
        : fresh;
    await saveSession(session);
    await activate(session.id);
  }
  async function useContext(session: Session) {
    if (!context) return;
    await saveSession(
      transition(session, {
        type: 'select-pattern',
        pattern: context,
        at: new Date().toISOString(),
      }).session,
    );
    await activate(session.id);
  }
  async function removePattern() {
    if (active)
      await saveSession(
        transition(active, { type: 'select-pattern', pattern: null, at: new Date().toISOString() })
          .session,
      );
  }
  async function chooseModality(id: string) {
    if (!active || id === active.modalityId) return;
    controller?.abort();
    await saveSession(
      transition(active, { type: 'set-modality', modalityId: id, at: new Date().toISOString() })
        .session,
    );
    notice =
      'Modality changed. The transcript remains; the previous pattern selection was cleared.';
  }
  async function send() {
    const session = active;
    const text = draft.trim();
    if (!store || !session || !text || sending) return;
    if (!settings.openRouterKey || !settings.model) {
      view = 'settings';
      error = 'Connect OpenRouter and choose a zero-retention model before sending.';
      return;
    }
    clearMessages();
    const now = new Date().toISOString();
    const message = { id: crypto.randomUUID(), role: 'user' as const, text, createdAt: now };
    const replyId = crypto.randomUUID();
    draft = '';
    sending = true;
    controller = new AbortController();
    sessions = sessions.map((item) =>
      item.id === session.id
        ? transition(item, { type: 'submit', message, replyId }).session
        : item,
    );
    const provider = createOpenRouterReplyProvider({
      settings,
      patternContext: async (effect) => {
        const found = findMiraPattern(effect.activePattern, [...personal, ...data.patterns]);
        return found ? { title: found.title, summary: found.summary ?? '' } : null;
      },
    });
    try {
      await submitMessage(
        session.id,
        message,
        replyId,
        { sessions: store, replies: provider, clock: { now: () => new Date().toISOString() } },
        controller.signal,
      );
      if (session.title === 'New session') {
        const latest = await store.load(session.id);
        if (latest)
          await store.save(
            transition(latest, { type: 'rename', title: text.slice(0, 62), at: now }).session,
          );
      }
    } catch (cause) {
      error = messageOf(cause);
    } finally {
      const latest = await store.load(session.id);
      if (latest)
        sessions = [latest, ...sessions.filter((item) => item.id !== latest.id)].sort(
          (left, right) => right.updatedAt.localeCompare(left.updatedAt),
        );
      sending = false;
      controller = undefined;
      composer?.focus();
    }
  }
  async function deleteSession(session: Session) {
    if (
      !store ||
      !confirm(
        `Delete “${session.title}” and its conversation from this device? This cannot be undone.`,
      )
    )
      return;
    if (session.id === active?.id) controller?.abort();
    await store.remove(session.id);
    sessions = sessions.filter((item) => item.id !== session.id);
    if (settings.activeSessionId === session.id) {
      settings = { ...settings, activeSessionId: sessions[0]?.id ?? null };
      await store.saveSettings(settings);
    }
    notice = 'Session deleted from this device.';
  }
  async function renameSession(session: Session) {
    const title = renameDraft.trim();
    if (!title) {
      error = 'Enter a session name.';
      return;
    }
    await saveSession(
      transition(session, {
        type: 'rename',
        title: title.slice(0, 120),
        at: new Date().toISOString(),
      }).session,
    );
    renameId = null;
    renameDraft = '';
    clearMessages();
  }
  async function saveConnection() {
    if (!store) return;
    const next = { ...settings, openRouterKey: keyDraft.trim(), model: modelDraft.trim() };
    await store.saveSettings(next);
    settings = next;
    notice = 'Provider settings saved encrypted on this device.';
    error = '';
  }
  async function refreshModels() {
    loadingModels = true;
    clearMessages();
    try {
      models = await listZdrModels(keyDraft);
      if (!models.length) notice = 'No zero-retention models are currently available for this key.';
    } catch (cause) {
      error = messageOf(cause);
    } finally {
      loadingModels = false;
    }
  }
  function selectPromptModality(id: string) {
    promptModality = id;
    promptDraft = settings.promptOverrides[id] ?? modalityById(id).prompt;
  }
  async function savePrompt() {
    if (!store || !promptDraft.trim()) {
      error = 'The modality prompt cannot be empty.';
      return;
    }
    const next = {
      ...settings,
      promptOverrides: { ...settings.promptOverrides, [promptModality]: promptDraft.trim() },
    };
    await store.saveSettings(next);
    settings = next;
    error = '';
    notice = 'Modality prompt saved.';
  }
  async function restorePrompt() {
    if (!store) return;
    const remaining = Object.fromEntries(
      Object.entries(settings.promptOverrides).filter(([id]) => id !== promptModality),
    );
    const next = { ...settings, promptOverrides: remaining };
    await store.saveSettings(next);
    settings = next;
    promptDraft = modalityById(promptModality).prompt;
    notice = 'Default modality prompt restored.';
    error = '';
  }

  async function exportSessions() {
    const availableStore = store;
    if (!availableStore || transferring) return;
    transferring = true;
    clearMessages();
    try {
      const runs = (
        await Promise.all(
          sessions.map(async (session) => {
            const record = await availableStore.loadRun(session.id);
            return record ? { sessionId: session.id, saved: record.saved } : null;
          }),
        )
      ).filter((run): run is { sessionId: string; saved: unknown } => run !== null);
      const encrypted = await exportPortableArchive(
        sessions,
        settings,
        archivePassphrase,
        crypto,
        runs,
      );
      const url = URL.createObjectURL(new Blob([encrypted], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `patternverse-mira-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      archivePassphrase = '';
      notice =
        'Encrypted archive downloaded. Keep its passphrase somewhere safe; it cannot be recovered.';
    } catch (cause) {
      error = messageOf(cause);
    } finally {
      transferring = false;
    }
  }

  async function importSessions() {
    if (!store || !importFile || transferring) return;
    transferring = true;
    clearMessages();
    try {
      const count = await importPortableArchive(store, await importFile.text(), archivePassphrase);
      sessions = await store.list();
      settings = await store.loadSettings();
      promptDraft = settings.promptOverrides[promptModality] ?? modalityById(promptModality).prompt;
      archivePassphrase = '';
      importFile = null;
      notice = `Imported ${count} session${count === 1 ? '' : 's'} without replacing existing sessions.`;
    } catch (cause) {
      error = messageOf(cause);
    } finally {
      transferring = false;
    }
  }
</script>

<svelte:head>
  <title>Mira — Patternverse</title>
  <meta name="description" content="Mira, your private reflective companion within Patternverse." />
</svelte:head>

<main class="mira-app">
  <header class="mira-app-header">
    <div>
      <p class="mira-eyebrow">Patternverse · Companion</p>
      <h1>Mira<span>.</span></h1>
    </div>
    <nav aria-label="Mira sections" class="mira-app-tabs">
      <button
        type="button"
        aria-current={view === 'chat' ? 'page' : undefined}
        onclick={() => {
          view = 'chat';
          clearMessages();
        }}>Conversation</button
      >
      <button
        type="button"
        aria-current={view === 'sessions' ? 'page' : undefined}
        onclick={() => {
          view = 'sessions';
          clearMessages();
        }}>Sessions</button
      >
      <button
        type="button"
        aria-current={view === 'settings' ? 'page' : undefined}
        onclick={() => {
          view = 'settings';
          clearMessages();
        }}>Settings</button
      >
    </nav>
  </header>
  {#if error}<p class="mira-app-alert" role="alert">{error}</p>{/if}
  {#if notice}<p class="mira-app-notice" role="status">{notice}</p>{/if}

  {#if !ready}
    <div class="mira-app-empty"><p>Opening private sessions…</p></div>
  {:else if view === 'sessions'}
    <section class="mira-app-panel" aria-labelledby="mira-sessions-heading">
      <div class="mira-section-heading">
        <div>
          <p class="mira-eyebrow">Private on this device</p>
          <h2 id="mira-sessions-heading">Sessions</h2>
        </div>
        <button type="button" onclick={() => newSession()}
          >New session <span aria-hidden="true">＋</span></button
        >
      </div>
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
                  void renameSession(session);
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
                <button type="button" onclick={() => activate(session.id)}>Open</button><button
                  type="button"
                  onclick={() => {
                    renameId = session.id;
                    renameDraft = session.title;
                  }}>Rename</button
                ><button type="button" class="danger" onclick={() => deleteSession(session)}
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
          <button type="button" onclick={exportSessions} disabled={transferring || !sessions.length}
            >Export encrypted archive</button
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
          <button type="button" onclick={importSessions} disabled={transferring || !importFile}
            >Import selected archive</button
          >
        </div>
        {#if importFile}<p>Selected: {importFile.name}</p>{/if}
      </section>
    </section>
  {:else if view === 'settings'}
    <section class="mira-app-panel mira-settings" aria-labelledby="mira-settings-heading">
      <div class="mira-section-heading">
        <div>
          <p class="mira-eyebrow">Your preferences</p>
          <h2 id="mira-settings-heading">Settings</h2>
        </div>
      </div>
      <div class="mira-settings-grid">
        <section aria-labelledby="mira-provider-heading">
          <h3 id="mira-provider-heading">AI connection</h3>
          <p>
            Messages are encrypted on this device. Sending a message shares its recent context with
            your chosen OpenRouter model for processing. Zero-data-retention routing is required; it
            is not fully local AI.
          </p>
          <label for="mira-key">OpenRouter API key</label><input
            id="mira-key"
            type="password"
            bind:value={keyDraft}
            autocomplete="off"
            spellcheck="false"
          />
          <button type="button" onclick={refreshModels} disabled={loadingModels || !keyDraft.trim()}
            >{loadingModels ? 'Checking models…' : 'Find zero-retention models'}</button
          >
          <label for="mira-model">Model</label>
          {#if models.length > 0}
            <select id="mira-model" bind:value={modelDraft}
              ><option value="">Choose a model</option>{#each models as model (model.id)}<option
                  value={model.id}>{model.name} · {model.id}</option
                >{/each}</select
            >
          {:else}<input
              id="mira-model"
              bind:value={modelDraft}
              placeholder="Select after checking available models"
              spellcheck="false"
            />{/if}
          <button type="button" class="mira-primary" onclick={saveConnection}
            >Save connection</button
          >
        </section>
        <section aria-labelledby="mira-prompt-heading">
          <h3 id="mira-prompt-heading">Therapy modalities</h3>
          <p>
            Each modality has an editable guidance prompt. The selected modality belongs to each
            session and can change during it.
          </p>
          <label for="mira-prompt-modality">Prompt to edit</label><select
            id="mira-prompt-modality"
            value={promptModality}
            onchange={(event) => selectPromptModality(event.currentTarget.value)}
            >{#each MODALITIES as modality (modality.id)}<option value={modality.id}
                >{modality.name}</option
              >{/each}</select
          >
          <label for="mira-prompt-text">Guidance</label><textarea
            id="mira-prompt-text"
            bind:value={promptDraft}
            rows="14"
            maxlength="30000"></textarea>
          <div class="mira-settings-actions">
            <button type="button" class="mira-primary" onclick={savePrompt}>Save prompt</button
            ><button type="button" onclick={restorePrompt}>Restore default</button>
          </div>
        </section>
      </div>
    </section>
  {:else}
    <section class="mira-chat" aria-label="Mira conversation">
      {#if context && selectedPattern && (active?.activePattern?.entityId !== context.entityId || active?.activePattern?.sourceId !== context.sourceId)}
        <div class="mira-context-choice">
          <div>
            <p class="mira-eyebrow">From your library · {selectedPattern.sourceId}</p>
            <h2>{selectedPattern.title}</h2>
            <p>
              Explore this pattern with Mira in a new or existing session. This attaches it as
              context; it does not start a guided exercise.
            </p>
          </div>
          <div class="mira-context-actions">
            <button type="button" onclick={() => newSession(true)}>New session</button
            >{#if active}<button type="button" onclick={() => useContext(active)}
                >Use current session</button
              >{/if}
            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- returnHref is composed from resolved app routes. -->
            <a href={returnHref}>Back to pattern</a>
          </div>
        </div>
      {:else if context && !selectedPattern}<p class="mira-app-notice">
          This pattern could not be found in its original library source.
        </p>{/if}
      {#if !active}
        <div class="mira-app-empty">
          <p class="mira-eyebrow">A place to begin</p>
          <h2>Make room to reflect.</h2>
          <p>
            Start a private conversation. You can choose a therapy modality and change it later.
          </p>
          <button
            type="button"
            class="mira-primary"
            onclick={() => newSession(Boolean(context && selectedPattern))}
            >New session <span aria-hidden="true">→</span></button
          >
        </div>
      {:else}
        <div class="mira-chat-toolbar">
          <div>
            <p class="mira-eyebrow">Private conversation</p>
            <h2>{active.title}</h2>
          </div>
          <div>
            <label for="mira-active-modality">Therapy modality</label><select
              id="mira-active-modality"
              value={active.modalityId}
              onchange={(event) => chooseModality(event.currentTarget.value)}
              >{#each MODALITIES as modality (modality.id)}<option value={modality.id}
                  >{modality.name}</option
                >{/each}</select
            >
          </div>
        </div>
        {#if active.activePattern}<div class="mira-active-pattern">
            <span>Library pattern: {activePattern?.title ?? active.activePattern.entityId}</span
            >{#if activePattern?.hasPractice && activePattern.sourceId === 'commons'}<a
                href={resolve(`/pattern/${activePattern.id}/practice`)}
                >Open interactive practice ↗</a
              >{/if}
            <button
              type="button"
              onclick={removePattern}
              aria-label="Remove selected library pattern">×</button
            >
          </div>{/if}
        <div class="mira-messages" aria-live="polite">
          {#if active.messages.length === 0}<p class="mira-chat-welcome">
              What would you like to explore?
            </p>{/if}
          {#each active.messages as message (message.id)}<article
              class:from-user={message.role === 'user'}
            >
              <p class="mira-message-role">{message.role === 'user' ? 'You' : 'Mira'}</p>
              <p>{message.text}</p>
            </article>{/each}
          {#if sending && active.pendingReplyId}<p class="mira-thinking" role="status">
              Mira is reflecting…
            </p>{/if}
        </div>
        {#if store}<GuidedTechnique
            sessionId={active.id}
            modalityId={active.modalityId}
            {store}
          />{/if}
        <form
          class="mira-composer"
          onsubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label class="visually-hidden" for="mira-message">Message Mira</label><textarea
            id="mira-message"
            bind:this={composer}
            bind:value={draft}
            rows="3"
            maxlength="30000"
            placeholder="Write what's on your mind…"
            onkeydown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}></textarea><button
            type="submit"
            class="mira-primary"
            disabled={!draft.trim() || sending}>Send <span aria-hidden="true">↗</span></button
          >
        </form>
        <p class="mira-chat-disclaimer">
          Mira is an AI companion, not a therapist or emergency service. Replies are processed by
          your chosen provider when you send.
        </p>
      {/if}
    </section>
  {/if}
</main>
