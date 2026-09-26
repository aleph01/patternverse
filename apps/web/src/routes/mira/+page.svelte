<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import '$lib/mira/workspace.css';
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import {
    ArrowUp,
    BookOpen,
    History,
    MessageCircle,
    Mic,
    Plus,
    Settings2,
    Square,
    Volume2,
  } from '@lucide/svelte';
  import {
    createSession,
    submitMessage,
    transition,
    type Effect,
    type Session,
  } from '@patternverse/companion-core';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import PatternverseLogo from '$lib/components/PatternverseLogo.svelte';
  import {
    findMiraPattern,
    parseMiraPatternQuery,
    type MiraPatternSummary,
  } from '$lib/mira/context';
  import { MODALITIES, modalityById } from '$lib/mira/modalities';
  import { recordedBlobToWhisperWav } from '$lib/mira/audio';
  import { startBrowserDictation, type BrowserDictation } from '$lib/mira/browser-voice';
  import GuidedTechnique from '$lib/mira/GuidedTechnique.svelte';
  import {
    createNativeReplyProvider,
    downloadLocalModel,
    hasNativeMira,
    localRuntimeStatus,
    localSetup,
    requestNativeMicrophone,
    restartLocalRuntime,
    selectLocalModel,
    transcribeLocally,
    type LocalModelChoice,
    type LocalRuntimeStatus,
  } from '$lib/mira/native';
  import { exportPortableArchive, importPortableArchive } from '$lib/mira/portable';
  import {
    createOpenRouterReplyProvider,
    DEFAULT_OPENROUTER_MODEL,
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
  let desktop = $state(false);
  let runtime = $state<LocalRuntimeStatus>({ status: 'starting' });
  let localChoices = $state<readonly LocalModelChoice[]>([]);
  let modelProgress = $state('');
  let pickerSelecting = $state(false);
  let voicePhase = $state<'idle' | 'requesting' | 'recording' | 'transcribing'>('idle');
  let speakingId = $state<string | null>(null);
  let controller: AbortController | undefined;
  let browserDictation: BrowserDictation | undefined;
  let recorder: MediaRecorder | undefined;
  let microphoneStream: MediaStream | undefined;
  let recordingTimeout: number | undefined;
  let dictationFinishTimeout: number | undefined;
  let disposed = false;

  const active = $derived(
    sessions.find((session) => session.id === settings.activeSessionId) ?? null,
  );
  const selectedPattern = $derived(findMiraPattern(context, [...personal, ...data.patterns]));
  const activePattern = $derived(
    findMiraPattern(active?.activePattern ?? null, [...personal, ...data.patterns]),
  );
  const libraryPatterns = $derived(
    [...personal, ...data.patterns].filter((entry) => entry.type === 'pattern'),
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
    desktop = hasNativeMira();
    const localPoll = desktop
      ? window.setInterval(() => void refreshNativeRuntime().catch(() => undefined), 3000)
      : undefined;
    const shortcut = (event: KeyboardEvent) => {
      if (event.shiftKey && event.code === 'Space' && view === 'chat' && active) {
        event.preventDefault();
        pickerSelecting = true;
      }
    };
    window.addEventListener('keydown', shortcut);
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
        model: !desktop && !preferences.model ? DEFAULT_OPENROUTER_MODEL : preferences.model,
        activeSessionId: restored.some((item) => item.id === preferences.activeSessionId)
          ? preferences.activeSessionId
          : (restored[0]?.id ?? null),
      };
      keyDraft = settings.openRouterKey;
      modelDraft = settings.model;
      promptDraft = settings.promptOverrides[promptModality] ?? modalityById(promptModality).prompt;
      if (desktop) await refreshNativeRuntime();
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
      disposed = true;
      controller?.abort();
      if (localPoll !== undefined) window.clearInterval(localPoll);
      window.removeEventListener('keydown', shortcut);
      if (recordingTimeout !== undefined) window.clearTimeout(recordingTimeout);
      if (dictationFinishTimeout !== undefined) window.clearTimeout(dictationFinishTimeout);
      browserDictation?.cancel();
      window.speechSynthesis?.cancel();
      if (recorder?.state === 'recording') recorder.stop();
      microphoneStream?.getTracks().forEach((track) => track.stop());
    };
  });

  async function refreshNativeRuntime() {
    if (!desktop) return;
    runtime = await localRuntimeStatus();
    if (runtime.status !== 'ready') return;
    const setup = await localSetup();
    localChoices = setup.choices;
    const chosen =
      setup.choices.find((item) => item.id === settings.model && item.installed) ??
      setup.choices.find((item) => item.id === setup.selectedModelId && item.installed) ??
      setup.choices.find((item) => item.recommended && item.installed) ??
      setup.choices.find((item) => item.installed);
    if (chosen && chosen.id !== settings.model && store) {
      settings = { ...settings, model: chosen.id };
      await store.saveSettings(settings);
    }
  }

  async function retryNativeRuntime() {
    error = '';
    try {
      runtime = await restartLocalRuntime();
      await refreshNativeRuntime();
    } catch (cause) {
      error = messageOf(cause);
    }
  }

  async function chooseLocalModel(id: string) {
    if (!store) return;
    await selectLocalModel(id);
    settings = { ...settings, model: id };
    await store.saveSettings(settings);
    notice = 'Local model selected.';
  }

  async function installLocalModel(id: string) {
    modelProgress = 'Preparing local model download…';
    try {
      await downloadLocalModel(id, (event) => {
        if (event.kind === 'progress' && event.totalBytes && event.completedBytes !== undefined) {
          modelProgress = `Downloading local model · ${Math.floor((event.completedBytes / event.totalBytes) * 100)}%`;
        } else if (event.kind === 'complete') {
          modelProgress = '';
          void refreshNativeRuntime()
            .then(() => chooseLocalModel(id))
            .catch((cause) => (error = messageOf(cause)));
        } else if (event.kind === 'failed' || event.kind === 'cancelled') {
          modelProgress = '';
          error = event.detailCode || 'Local model download did not finish.';
        }
      });
    } catch (cause) {
      modelProgress = '';
      error = messageOf(cause);
    }
  }

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
  async function chooseLibraryPattern(pattern: MiraPatternSummary) {
    if (!active) return;
    await saveSession(
      transition(active, {
        type: 'select-pattern',
        pattern: { sourceId: pattern.sourceId, entityId: pattern.id },
        at: new Date().toISOString(),
      }).session,
    );
    pickerSelecting = false;
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
    if (desktop && (runtime.status !== 'ready' || !settings.model)) {
      view = 'settings';
      error = 'Prepare and choose a local model before sending.';
      return;
    }
    if (!desktop && (!settings.openRouterKey || !settings.model)) {
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
    const providerOptions = {
      settings,
      patternContext: async (effect: Effect) => {
        const found = findMiraPattern(effect.activePattern, [...personal, ...data.patterns]);
        return found ? { title: found.title, summary: found.summary ?? '' } : null;
      },
    };
    const provider = desktop
      ? createNativeReplyProvider(providerOptions)
      : createOpenRouterReplyProvider(providerOptions);
    try {
      await submitMessage(
        session.id,
        message,
        replyId,
        { sessions: store, replies: provider, clock: { now: () => new Date().toISOString() } },
        controller.signal,
      );
      if (settings.autoSpeak) {
        const completed = await store.load(session.id);
        const reply = completed?.messages.at(-1);
        if (reply?.role === 'assistant') speakReply(reply.id, reply.text);
      }
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

  async function toggleVoiceInput() {
    if (voicePhase === 'recording') {
      if (desktop && recorder?.state === 'recording') recorder.stop();
      else if (browserDictation) {
        voicePhase = 'transcribing';
        dictationFinishTimeout = window.setTimeout(() => {
          browserDictation?.cancel();
          browserDictation = undefined;
          voicePhase = 'idle';
        }, 3_000);
        browserDictation.stop();
      }
      return;
    }
    if (voicePhase !== 'idle') return;
    if (!desktop) {
      const originalDraft = draft.trim();
      voicePhase = 'requesting';
      clearMessages();
      try {
        browserDictation = startBrowserDictation(window, {
          onText: (text) => {
            if (!disposed) draft = [originalDraft, text].filter(Boolean).join(' ');
          },
          onEnd: () => {
            browserDictation = undefined;
            if (recordingTimeout !== undefined) window.clearTimeout(recordingTimeout);
            if (dictationFinishTimeout !== undefined) window.clearTimeout(dictationFinishTimeout);
            if (!disposed) {
              voicePhase = 'idle';
              composer?.focus();
            }
          },
          onError: (message) => {
            if (recordingTimeout !== undefined) window.clearTimeout(recordingTimeout);
            if (dictationFinishTimeout !== undefined) window.clearTimeout(dictationFinishTimeout);
            browserDictation = undefined;
            if (!disposed) {
              error = message;
              voicePhase = 'idle';
            }
          },
        });
        voicePhase = 'recording';
        recordingTimeout = window.setTimeout(() => browserDictation?.stop(), 120_000);
      } catch (cause) {
        browserDictation = undefined;
        voicePhase = 'idle';
        error = messageOf(cause);
      }
      return;
    }
    voicePhase = 'requesting';
    clearMessages();
    try {
      await requestNativeMicrophone();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      microphoneStream = stream;
      const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const current = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      const sessionId = active?.id;
      current.addEventListener('dataavailable', (event) => {
        if (event.data.size) chunks.push(event.data);
      });
      current.addEventListener('stop', () => {
        microphoneStream?.getTracks().forEach((track) => track.stop());
        microphoneStream = undefined;
        recorder = undefined;
        if (recordingTimeout !== undefined) window.clearTimeout(recordingTimeout);
        if (disposed) return;
        voicePhase = 'transcribing';
        void (async () => {
          try {
            const wav = await recordedBlobToWhisperWav(
              new Blob(chunks, { type: current.mimeType }),
            );
            const text = await transcribeLocally(wav);
            if (!disposed && active?.id === sessionId && text) {
              draft = [draft.trim(), text].filter(Boolean).join(' ');
              composer?.focus();
            }
          } catch (cause) {
            if (!disposed) error = messageOf(cause);
          } finally {
            if (!disposed) voicePhase = 'idle';
          }
        })();
      });
      recorder = current;
      current.start(1000);
      voicePhase = 'recording';
      recordingTimeout = window.setTimeout(() => {
        if (current.state === 'recording') current.stop();
      }, 120_000);
    } catch (cause) {
      microphoneStream?.getTracks().forEach((track) => track.stop());
      microphoneStream = undefined;
      recorder = undefined;
      voicePhase = 'idle';
      error = messageOf(cause);
    }
  }

  function speakReply(id: string, text: string) {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      error = 'Spoken replies are unavailable in this browser.';
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = navigator.language || 'en-US';
    utterance.rate = 0.96;
    utterance.onend = () => {
      if (speakingId === id) speakingId = null;
    };
    utterance.onerror = () => {
      if (speakingId === id) speakingId = null;
    };
    speakingId = id;
    window.speechSynthesis.speak(utterance);
  }

  function toggleSpokenReply(id: string, text: string) {
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      speakingId = null;
    } else speakReply(id, text);
  }

  function stopSpokenReply() {
    window.speechSynthesis?.cancel();
    speakingId = null;
  }

  async function toggleAutoSpeak() {
    if (!store) return;
    const next = { ...settings, autoSpeak: !settings.autoSpeak };
    await store.saveSettings(next);
    settings = next;
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
  <title>mira — patternverse</title>
  <meta name="description" content="mira, your private reflective companion within Patternverse." />
</svelte:head>

<main class="mira-app">
  <header class="mira-app-header">
    <div class="mira-brand">
      <a href={resolve('/')} aria-label="Patternverse home"><PatternverseLogo compact /></a><span
        >/ mira</span
      >
    </div>
    <div class="mira-header-tools">
      <span class="mira-runtime-label"
        ><span aria-hidden="true" class:available={desktop && runtime.status === 'ready'}
        ></span>{desktop
          ? runtime.status === 'ready'
            ? 'Local model ready'
            : 'Local model ' + runtime.status
          : 'Browser · OpenRouter'}</span
      >
    </div>
  </header>
  <div class="mira-app-body">
    <nav aria-label="mira sections" class="mira-app-tabs">
      <button
        type="button"
        aria-label="Conversation"
        title="Conversation"
        aria-current={view === 'chat' ? 'page' : undefined}
        onclick={() => {
          stopSpokenReply();
          view = 'chat';
          clearMessages();
        }}><MessageCircle size={19} /></button
      >
      <button
        type="button"
        aria-label="Sessions"
        title="Sessions"
        aria-current={view === 'sessions' ? 'page' : undefined}
        onclick={() => {
          stopSpokenReply();
          view = 'sessions';
          clearMessages();
        }}><History size={19} /></button
      >
      <a href={resolve('/my')} aria-label="Pattern library" title="Pattern library"
        ><BookOpen size={19} /></a
      >
      <button
        type="button"
        aria-label="Settings"
        title="Settings"
        aria-current={view === 'settings' ? 'page' : undefined}
        onclick={() => {
          stopSpokenReply();
          view = 'settings';
          clearMessages();
        }}><Settings2 size={19} /></button
      >
    </nav>
    <div class="mira-workspace">
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
              Export a portable archive or import one you chose. Nothing is imported automatically.
              The archive excludes your OpenRouter key.
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
                onclick={exportSessions}
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
              {#if desktop}
                <h3 id="mira-provider-heading">Local model</h3>
                <p>
                  Conversations run in this app’s local model process. No cloud fallback is used.
                  Download a model once, then choose it here.
                </p>
                {#if runtime.status !== 'ready'}<p role="status">
                    Local runtime: {runtime.status}{runtime.detailCode
                      ? ` · ${runtime.detailCode}`
                      : ''}
                  </p>{/if}
                {#if runtime.status === 'unavailable' || runtime.status === 'stopped'}<button
                    type="button"
                    onclick={retryNativeRuntime}>Retry local runtime</button
                  >{/if}
                {#each localChoices as choice (choice.id)}
                  <div class="mira-local-model">
                    <div>
                      <strong>{choice.title}</strong><small>{choice.id} · {choice.summary}</small>
                    </div>
                    {#if choice.installed}
                      <button
                        type="button"
                        class:chosen={settings.model === choice.id}
                        onclick={() => chooseLocalModel(choice.id)}
                        >{settings.model === choice.id ? 'Selected' : 'Use model'}</button
                      >
                    {:else}
                      <button
                        type="button"
                        disabled={!choice.canInstall || Boolean(modelProgress)}
                        onclick={() => installLocalModel(choice.id)}>Download</button
                      >
                    {/if}
                  </div>
                {/each}
                {#if modelProgress}<p role="status">{modelProgress}</p>{/if}
                {#if localChoices.length === 0}<p>Preparing local model choices…</p>{/if}
              {:else}
                <h3 id="mira-provider-heading">AI connection</h3>
                <p>
                  Messages are encrypted on this device. Sending a message shares its recent context
                  with your chosen OpenRouter model for processing. Zero-data-retention routing is
                  required; it is not fully local AI.
                </p>
                <p>
                  By default, OpenRouter chooses a suitable model for each conversation with
                  zero-retention routing required. You can choose a specific model below.
                </p>
                <label for="mira-key">OpenRouter API key</label><input
                  id="mira-key"
                  type="password"
                  bind:value={keyDraft}
                  autocomplete="off"
                  spellcheck="false"
                />
                <button
                  type="button"
                  onclick={refreshModels}
                  disabled={loadingModels || !keyDraft.trim()}
                  >{loadingModels ? 'Checking models…' : 'Find zero-retention models'}</button
                >
                <label for="mira-model">Model</label>
                {#if models.length > 0}
                  <select id="mira-model" bind:value={modelDraft}
                    ><option value={DEFAULT_OPENROUTER_MODEL}
                      >Automatic · zero-retention required</option
                    >{#each models as model (model.id)}<option value={model.id}
                        >{model.name} · {model.id}</option
                      >{/each}</select
                  >
                {:else}<input
                    id="mira-model"
                    bind:value={modelDraft}
                    placeholder="openrouter/auto"
                    spellcheck="false"
                  />{/if}
                <button type="button" class="mira-primary" onclick={saveConnection}
                  >Save connection</button
                >
              {/if}
              <label class="mira-speech-preference">
                <input
                  type="checkbox"
                  checked={settings.autoSpeak ?? false}
                  onchange={toggleAutoSpeak}
                />
                <span>Read new replies aloud automatically</span>
              </label>
              <p class="mira-speech-note">
                Spoken replies use the voices available in your browser or device.
              </p>
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
        <section class="mira-chat" aria-label="mira conversation">
          {#if context && selectedPattern && (active?.activePattern?.entityId !== context.entityId || active?.activePattern?.sourceId !== context.sourceId)}
            <div class="mira-context-choice">
              <div>
                <p class="mira-eyebrow">From your library · {selectedPattern.sourceId}</p>
                <h2>{selectedPattern.title}</h2>
                <p>
                  Explore this pattern with mira in a new or existing session. This attaches it as
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
                  <p class="mira-message-role">{message.role === 'user' ? 'You' : 'mira'}</p>
                  <p>{message.text}</p>
                  {#if message.role === 'assistant'}<button
                      type="button"
                      class="mira-speak-button"
                      aria-label={speakingId === message.id
                        ? 'Stop spoken reply'
                        : 'Play spoken reply'}
                      title={speakingId === message.id ? 'Stop reading' : 'Read aloud'}
                      onclick={() => toggleSpokenReply(message.id, message.text)}
                      >{#if speakingId === message.id}<Square size={16} />{:else}<Volume2
                          size={17}
                        />{/if}</button
                    >{/if}
                </article>{/each}
              {#if sending && active.pendingReplyId}<p class="mira-thinking" role="status">
                  mira is reflecting…
                </p>{/if}
            </div>
            {#if store}<GuidedTechnique
                sessionId={active.id}
                modalityId={active.modalityId}
                {store}
                patterns={libraryPatterns}
                onPatternSelect={chooseLibraryPattern}
                bind:selecting={pickerSelecting}
              />{/if}
            <form
              class="mira-composer"
              onsubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <label class="visually-hidden" for="mira-message">Message mira</label><textarea
                id="mira-message"
                bind:this={composer}
                bind:value={draft}
                readonly={!desktop && voicePhase !== 'idle'}
                rows="1"
                maxlength="30000"
                placeholder="Message mira…"
                onkeydown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}></textarea>
              <div class="mira-composer-footer">
                <div class="mira-composer-tools">
                  <button
                    type="button"
                    class="mira-icon-button"
                    aria-label="Choose a pattern or therapy technique"
                    aria-keyshortcuts="Shift+Space"
                    title="Patterns &amp; techniques · Shift+Space"
                    onclick={() => (pickerSelecting = true)}><Plus size={20} /></button
                  >
                  <span class="mira-modality-chip">{modalityById(active.modalityId).name}</span>
                  {#if voicePhase !== 'idle'}<span class="mira-voice-state" role="status"
                      >{voicePhase === 'recording'
                        ? '● Recording…'
                        : voicePhase === 'transcribing'
                          ? desktop
                            ? 'Transcribing locally…'
                            : 'Finishing dictation…'
                          : 'Opening microphone…'}</span
                    >{/if}
                </div>
                <div class="mira-composer-tools">
                  <button
                    type="button"
                    class="mira-icon-button"
                    aria-label={voicePhase === 'recording' ? 'Stop dictation' : 'Start voice input'}
                    title={voicePhase === 'recording' ? 'Stop dictation' : 'Dictate a message'}
                    disabled={voicePhase === 'requesting' || voicePhase === 'transcribing'}
                    onclick={toggleVoiceInput}
                    >{#if voicePhase === 'recording'}<Square size={17} />{:else}<Mic
                        size={19}
                      />{/if}</button
                  >
                  <button
                    type="submit"
                    class="mira-send-button"
                    aria-label="Send message"
                    title="Send"
                    disabled={!draft.trim() || sending}><ArrowUp size={19} /></button
                  >
                </div>
              </div>
            </form>
            <p class="mira-chat-disclaimer">
              mira is an AI companion, not a therapist or emergency service. {desktop
                ? 'Replies and dictation are processed on this device.'
                : 'Replies are processed by your chosen provider when you send. Browser dictation may use Apple’s speech service.'}
            </p>
          {/if}
        </section>
      {/if}
    </div>
  </div>
</main>
