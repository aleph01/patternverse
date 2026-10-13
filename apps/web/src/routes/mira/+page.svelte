<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import '$lib/mira/workspace.css';
  import { resolve } from '$app/paths';
  import { onMount, tick, untrack } from 'svelte';
  import MiraPatternContext from '$lib/mira/MiraPatternContext.svelte';
  import {
    createArticleReferenceLoader,
    articleReferenceKey,
    type MiraArticleReference,
  } from '$lib/mira/article-reference';
  import { readableArticleSource } from '$lib/mira/article-source';
  import { renderMarkdownPreview } from '$lib/client/markdown-preview';
  import { downloadText } from '$lib/client/download';
  import MiraMark from '$lib/mira/MiraMark.svelte';
  import { ChevronLeft, History, Settings2, BookOpen, ChevronDown } from '@lucide/svelte';
  import { canRetryReply, type Effect, type Session } from '@patternverse/companion-core';
  import { createMiraConversation } from '$lib/mira/conversation';
  import { createMiraLifecycle } from '$lib/mira/lifecycle';
  import {
    createMiraOverlays,
    type MiraOverlay,
    type MiraOpenOverlay,
  } from '$lib/mira/overlay-controller';
  import {
    createMiraLocalProvider,
    type MiraLocalProviderState,
  } from '$lib/mira/local-provider-controller';
  import {
    createMiraOpenRouterProvider,
    type MiraOpenRouterProviderState,
  } from '$lib/mira/openrouter-provider-controller';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import {
    findMiraPattern,
    parseMiraPatternQuery,
    type MiraPatternSummary,
  } from '$lib/mira/context';
  import { MODALITIES, modalityById, availableModalityId } from '$lib/mira/modalities';
  import { startBrowserDictation, startBrowserVoiceControl } from '$lib/mira/browser-voice';
  import { startNativeVoiceControl } from '$lib/mira/native-voice-listener';
  import { createVoiceController, type VoiceState } from '$lib/mira/voice-controller';
  import { createMiraVoiceDispatch } from '$lib/mira/voice-dispatch';
  import { createMiraReplyPlayback } from '$lib/mira/reply-playback';
  import { createBrowserReplySpeech } from '$lib/mira/browser-reply-speech';
  import { searchVoiceChoices } from '$lib/mira/voice-commands';
  import VoiceFeedback from '$lib/mira/VoiceFeedback.svelte';
  import ModalityPicker from '$lib/mira/ModalityPicker.svelte';
  import MiraSettingsPanel from '$lib/mira/MiraSettingsPanel.svelte';
  import MiraSessionsPanel from '$lib/mira/MiraSessionsPanel.svelte';
  import MiraSessionHeading from '$lib/mira/MiraSessionHeading.svelte';
  import MiraTranscript from '$lib/mira/MiraTranscript.svelte';
  import MiraComposer from '$lib/mira/MiraComposer.svelte';
  import { messagePatternContexts } from '$lib/mira/pattern-mentions';
  import type { MiraSettingsDrafts } from '$lib/mira/panels';
  import { formatUsd, isCurrentUtcMonth } from '$lib/mira/cost-format';
  import { beginOpenRouterConnection } from '$lib/mira/openrouter-auth';
  import GuidedTechnique from '$lib/mira/GuidedTechnique.svelte';
  import {
    createNativeReplyProvider,
    downloadLocalModel,
    hasNativeMira,
    localRuntimeStatus,
    localSetup,
    restartLocalRuntime,
    selectLocalModel,
    requestLocalText,
  } from '$lib/mira/native';
  import { createMiraArchive } from '$lib/mira/archive-controller';
  import { createMiraDictation, type DictationPhase } from '$lib/mira/dictation';
  import {
    createOpenRouterReplyProvider,
    DEFAULT_OPENROUTER_MODEL,
    getOpenRouterKeyUsage,
    listZdrModels,
    interpretOpenRouterVoiceCommand,
  } from '$lib/mira/openrouter';
  import {
    createPrivateMiraStore,
    type MiraSettings,
    type PrivateMiraStore,
  } from '$lib/mira/private-store';
  import { resolveReleaseFeatures, canRunStandalonePattern } from '$lib/release-features';

  let { data } = $props();
  let store = $state<PrivateMiraStore | undefined>(undefined);
  let sessions = $state<readonly Session[]>([]);
  let settings = $state<MiraSettings>({
    model: '',
    openRouterKey: '',
    promptOverrides: {},
    activeSessionId: null,
    monthlyBudgetUsd: null,
  });
  let personal = $state<readonly MiraPatternSummary[]>([]);
  let context = $state<ReturnType<typeof parseMiraPatternQuery>>(null);
  let ready = $state(false);
  let overlay = $state<MiraOverlay>('chat');
  const view = $derived(overlay === 'settings' || overlay === 'sessions' ? overlay : 'chat');
  const pickerSelecting = $derived(overlay === 'patterns');
  const modalitySelecting = $derived(overlay === 'modalities');
  let draft = $state('');
  let draftPatterns = $state<readonly MiraPatternSummary[]>([]);
  let settingsDrafts = $state<MiraSettingsDrafts>({
    key: '',
    model: '',
    budget: '',
    prompt: '',
    promptModality: 'narm',
  });
  let openRouterState = $state<MiraOpenRouterProviderState>({
    connectingOpenRouter: false,
    keyUsage: null,
    usageCheckedAt: null,
    usageError: '',
    loadingUsage: false,
    models: [],
    loadingModels: false,
    modelsChecked: false,
  });
  const {
    connectingOpenRouter,
    keyUsage,
    usageCheckedAt,
    usageError,
    loadingUsage,
    models,
    loadingModels,
    modelsChecked,
  } = $derived(openRouterState);
  let sending = $state(false);
  let streamingReply = $state<{ sessionId: string; text: string } | null>(null);
  let error = $state('');
  let notice = $state('');
  let renameId = $state<string | null>(null);
  let renameDraft = $state('');
  let archivePassphrase = $state('');
  let importFile = $state<File | null>(null);
  let transferring = $state(false);
  let composer = $state<HTMLTextAreaElement>();
  let desktop = $state(false);
  const features = $derived(resolveReleaseFeatures(desktop));
  let localProviderState = $state<MiraLocalProviderState>({
    runtime: { status: 'starting' },
    localChoices: [],
    modelProgress: '',
  });
  const { runtime, localChoices, modelProgress } = $derived(localProviderState);
  let voicePhase = $state<DictationPhase>('idle');
  let speakingId = $state<string | null>(null);
  const replyPlayback = createMiraReplyPlayback({
    enabled: () => features.voice,
    automatic: () => Boolean(settings.autoSpeak),
    speech: () => createBrowserReplySpeech(window),
    changed: (id) => {
      speakingId = id;
    },
    playbackStarted: () => voiceControl.playbackStarted(),
    playbackEnded: () => voiceControl.playbackEnded(),
    error: (message) => {
      error = message;
    },
  });
  const speakReply = replyPlayback.speak;
  const toggleSpokenReply = replyPlayback.toggle;
  const stopSpokenReply = replyPlayback.stop;
  const overlays = createMiraOverlays<HTMLElement>({
    changed: (next) => {
      overlay = next;
    },
    activeFocus: () =>
      document.activeElement instanceof HTMLElement ? document.activeElement : null,
    afterRender: tick,
    focusOverlay: (surface) => {
      const selector =
        surface === 'settings' || surface === 'sessions'
          ? '.mira-app-panel[role="dialog"]'
          : '.mira-technique-dialog[role="dialog"]';
      document.querySelector<HTMLElement>(selector)?.focus();
    },
    restoreFocus: (target) => {
      if (target.isConnected && !target.closest('[inert]')) target.focus();
      else composer?.focus();
    },
  });
  const localProvider = createMiraLocalProvider({
    enabled: () => desktop,
    available: () => Boolean(store),
    settings: () => settings,
    saveSettings: saveProviderSettings,
    status: localRuntimeStatus,
    setup: localSetup,
    restart: restartLocalRuntime,
    select: selectLocalModel,
    download: downloadLocalModel,
    every: (milliseconds, callback) => {
      const interval = window.setInterval(callback, milliseconds);
      return () => window.clearInterval(interval);
    },
    changed: (change) => {
      localProviderState = { ...localProviderState, ...change };
    },
    error: (message) => {
      error = message;
    },
    notice: (message) => {
      notice = message;
    },
  });
  const openRouterProvider = createMiraOpenRouterProvider({
    enabled: () => !desktop,
    available: () => Boolean(store),
    sending: () => sending,
    settings: () => settings,
    draftKey: () => settingsDrafts.key,
    saveSettings: saveProviderSettings,
    usage: getOpenRouterKeyUsage,
    models: listZdrModels,
    beginConnection: () =>
      beginOpenRouterConnection({
        callbackUrl: new URL(resolve('/auth/openrouter/callback'), window.location.origin).href,
        returnUrl: window.location.href,
        storage: sessionStorage,
      }),
    navigate: (authorization) => window.location.assign(authorization),
    now: () => new Date().toISOString(),
    changed: (change) => {
      openRouterState = { ...openRouterState, ...change };
    },
    disconnected: () => {
      settingsDrafts.key = '';
    },
    clearMessages,
    error: (message) => {
      error = message;
    },
    notice: (message) => {
      notice = message;
    },
  });
  const refreshNativeRuntime = localProvider.refresh;
  const retryNativeRuntime = localProvider.retry;
  const chooseLocalModel = localProvider.choose;
  const installLocalModel = localProvider.install;
  const refreshUsage = openRouterProvider.refreshUsage;
  const refreshModels = () => openRouterProvider.refreshModels(settingsDrafts.key);
  const connectOpenRouter = openRouterProvider.connect;
  const disconnectOpenRouter = openRouterProvider.disconnect;
  const saveConnection = () =>
    openRouterProvider.saveConnection(settingsDrafts.key, settingsDrafts.model);
  const saveModelChoice = () =>
    openRouterProvider.saveConnection(settings.openRouterKey, settingsDrafts.model);
  const conversation = createMiraConversation({
    store: () => store,
    sessions: () => sessions,
    sessionsChanged: (next) => {
      sessions = next;
    },
    replyChanged: (next) => {
      sending = next.sending;
      streamingReply = next.streamingReply;
    },
    now: () => new Date().toISOString(),
    randomId: () => crypto.randomUUID(),
  });
  let guided = $state<ReturnType<typeof GuidedTechnique>>();
  let modalitySearch = $state('');
  let voiceState = $state<VoiceState>({ phase: 'off', heard: '', feedback: '' });
  const modalityChoices = MODALITIES.map(({ id, name }) => ({ id, label: name }));
  const visibleModalities = $derived(searchVoiceChoices(modalityChoices, modalitySearch));
  const executeVoiceCommand = createMiraVoiceDispatch({
    surface: () => overlay,
    draft: () => draft,
    draftChanged: (text) => {
      draft = text;
    },
    sending: () => sending,
    send,
    patterns: () => guided,
    openPatterns: openPracticePicker,
    openModalities: openModalityPicker,
    searchModalities: (query) => {
      modalitySearch = query;
    },
    selectModality,
    latestReply: () => active?.messages.findLast((message) => message.role === 'assistant'),
    speakReply,
    stopReading: stopSpokenReply,
    close: closePanel,
    openPanel,
    stopVoiceControl: () => voiceControl.stop(),
  });
  const voiceControl = createVoiceController({
    listen: (callbacks) =>
      desktop ? startNativeVoiceControl(callbacks) : startBrowserVoiceControl(window, callbacks),
    context: () => ({
      sessionId: active?.id ?? null,
      surface: overlay,
      choices: modalitySelecting
        ? visibleModalities
        : pickerSelecting
          ? (guided?.voiceChoices() ?? [])
          : [],
      modalities: modalityChoices,
      selectedPattern: guided?.hasSelection() ?? false,
    }),
    speaking: () => speakingId !== null,
    execute: executeVoiceCommand,
    interpret: async (messages, signal) => {
      if (sending)
        throw new Error('mira is replying. Try a direct command, or wait for the reply.');
      if (desktop) return requestLocalText(settings.model, messages, signal);
      try {
        return await interpretOpenRouterVoiceCommand(settings, messages, signal);
      } finally {
        if (!lifecycle.disposed) void refreshUsage();
      }
    },
    changed: (state) => {
      if (!lifecycle.disposed) voiceState = state;
    },
  });

  const dictation = createMiraDictation({
    enabled: () => features.voice,
    handsFreeActive: () => voiceState.phase !== 'off',
    desktop: () => desktop,
    sessionId: () => active?.id,
    draft: () => draft,
    draftChanged: (text) => {
      draft = text;
    },
    phaseChanged: (phase) => {
      voicePhase = phase;
    },
    clearMessages,
    error: (message) => {
      error = message;
    },
    focusComposer: () => composer?.focus(),
    startBrowser: (callbacks) => startBrowserDictation(window, callbacks),
    startNative: (callbacks) => startNativeVoiceControl(callbacks, { previewIntervalMs: 800 }),
    after: (delay, callback) => {
      const timeout = window.setTimeout(callback, delay);
      return () => window.clearTimeout(timeout);
    },
  });
  const toggleVoiceInput = dictation.toggle;
  const archive = createMiraArchive({
    store: () => store,
    sessions: () => sessions,
    settings: () => settings,
    cryptography: () => crypto,
    now: () => new Date().toISOString(),
    download: (encrypted, filename) => {
      downloadText(encrypted, filename, 'application/json', { revokeAfterMs: 60_000 });
    },
    refresh: async () => {
      await conversation.refresh();
      if (lifecycle.disposed) return;
      const next = await store!.loadSettings();
      if (lifecycle.disposed) return;
      settings = next;
      settingsDrafts.prompt =
        settings.promptOverrides[settingsDrafts.promptModality] ??
        modalityById(settingsDrafts.promptModality).prompt;
    },
    busyChanged: (busy) => {
      transferring = busy;
    },
    clearMessages,
    error: (message) => {
      error = message;
    },
    notice: (message) => {
      notice = message;
    },
    exported: () => {
      archivePassphrase = '';
    },
    imported: () => {
      archivePassphrase = '';
      importFile = null;
    },
  });
  const exportSessions = () => archive.export(archivePassphrase);
  const importSessions = () => archive.import(importFile, archivePassphrase);

  async function selectModality(id: string) {
    if (!modalityChoices.some((item) => item.id === id)) return;
    const selecting = overlay;
    await chooseModality(id);
    if (selecting === 'modalities' || selecting === 'patterns') overlays.close(selecting);
  }
  function toggleVoiceControl() {
    if (!features.voice) return;
    if (voiceState.phase !== 'off') voiceControl.stop();
    else if (voicePhase === 'idle') {
      stopSpokenReply();
      void voiceControl.start();
    }
  }

  const active = $derived(
    sessions.find((session) => session.id === settings.activeSessionId) ?? null,
  );
  let draftSessionId: string | null = null;
  $effect(() => {
    const id = active?.id ?? null;
    untrack(() => {
      if (draftSessionId !== id) {
        draftSessionId = id;
        draftPatterns = [];
      }
    });
  });
  const selectedPattern = $derived(findMiraPattern(context, [...personal, ...data.patterns]));
  const activePattern = $derived(
    findMiraPattern(active?.activePattern ?? null, [...personal, ...data.patterns]),
  );
  let articleReferences = $state<Record<string, MiraArticleReference>>({});
  let referenceErrors = $state<Record<string, string>>({});
  const loadArticleReference = createArticleReferenceLoader({
    publicReference: async (id) => {
      const response = await fetch(resolve('/mira/reference/[id]', { id }), {
        signal: lifecycle.signal,
      });
      if (!response.ok)
        throw new Error('Could not load this article. Check your connection and try again.');
      return response.json();
    },
    personalReference: async (id) => {
      const workspace = await getLocalWorkspace();
      lifecycle.signal.throwIfAborted();
      const entity = await workspace.getEntity(id);
      lifecycle.signal.throwIfAborted();
      if (!entity || entity.type !== 'pattern' || entity.sourceId !== 'personal') return undefined;
      const body = readableArticleSource(entity.body);
      return {
        sourceId: entity.sourceId,
        id: entity.id,
        title: entity.title,
        summary: entity.summary ?? '',
        body,
        html: await renderMarkdownPreview(body),
        standaloneHref: null,
      };
    },
  });
  async function displayArticleReference(pattern: MiraPatternSummary) {
    if (lifecycle.disposed) return;
    const key = articleReferenceKey(pattern);
    referenceErrors = { ...referenceErrors, [key]: '' };
    try {
      const reference = await loadArticleReference(pattern);
      if (!lifecycle.disposed) articleReferences = { ...articleReferences, [key]: reference };
    } catch (cause) {
      if (!lifecycle.disposed) referenceErrors = { ...referenceErrors, [key]: messageOf(cause) };
    }
  }
  $effect(() => {
    const pattern = activePattern;
    if (pattern)
      untrack(() => {
        void displayArticleReference(pattern);
      });
  });
  const activeReference = $derived(
    activePattern ? articleReferences[articleReferenceKey(activePattern)] : undefined,
  );
  const activeReferenceError = $derived(
    activePattern ? (referenceErrors[articleReferenceKey(activePattern)] ?? '') : '',
  );
  const activePatternHref = $derived(
    activePattern?.sourceId === 'personal'
      ? `${resolve('/editor')}?id=${encodeURIComponent(activePattern.id)}`
      : activePattern
        ? resolve('/[type=entityType]/[id]', { type: 'pattern', id: activePattern.id })
        : resolve('/library'),
  );
  const activePracticeHref = $derived(
    canRunStandalonePattern(features, true, false) && activeReference?.standaloneHref
      ? resolve(
          activeReference.standaloneHref as
            `/pattern/${string}/run` | `/pattern/${string}/practice`,
        )
      : undefined,
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
    if (!lifecycle.disposed)
      context = parseMiraPatternQuery(new URLSearchParams(window.location.search));
  });
  const lifecycle = createMiraLifecycle({
    desktop: () => desktop,
    defaultModel: DEFAULT_OPENROUTER_MODEL,
    openStore: () => {
      store = createPrivateMiraStore();
      return store;
    },
    restoreSessions: conversation.restore,
    entry: () => {
      const entry = new URLSearchParams(window.location.search);
      return { sessionId: entry.get('session'), settings: entry.get('panel') === 'settings' };
    },
    settingsChanged: (next) => {
      settings = next;
      settingsDrafts.key = settings.openRouterKey;
      settingsDrafts.model = settings.model;
      settingsDrafts.budget = settings.monthlyBudgetUsd?.toString() ?? '';
      settingsDrafts.prompt =
        settings.promptOverrides[settingsDrafts.promptModality] ??
        modalityById(settingsDrafts.promptModality).prompt;
    },
    listPersonal: async (signal) => {
      const workspace = await getLocalWorkspace();
      signal.throwIfAborted();
      return workspace.listEntities();
    },
    personalChanged: (entries) => {
      personal = entries;
    },
    refreshUsage: () => void refreshUsage(),
    refreshNativeRuntime,
    openSettings: () => openPanel('settings', undefined, true),
    startPolling: localProvider.startPolling,
    subscriptions: [
      () => {
        const shortcut = (event: KeyboardEvent) => {
          if (
            !lifecycle.disposed &&
            (features.guidedExercises || features.standalonePatterns) &&
            event.shiftKey &&
            event.code === 'Space' &&
            view === 'chat' &&
            active
          ) {
            event.preventDefault();
            void openPracticePicker();
          }
        };
        window.addEventListener('keydown', shortcut);
        return () => window.removeEventListener('keydown', shortcut);
      },
      () => {
        const suspendVoice = () => {
          if (!lifecycle.disposed && document.hidden && voiceState.phase !== 'off')
            voiceControl.stop(
              'Voice control stopped while the app was in the background. Tap the waveform to resume.',
            );
        };
        document.addEventListener('visibilitychange', suspendVoice);
        return () => document.removeEventListener('visibilitychange', suspendVoice);
      },
    ],
    cleanup: [
      () => voiceControl.stop(),
      conversation.dispose,
      localProvider.dispose,
      openRouterProvider.dispose,
      overlays.dispose,
      dictation.dispose,
      archive.dispose,
      replyPlayback.dispose,
    ],
    cleanupFailed: () => {
      console.error('Could not fully stop Mira background tasks.');
    },
    error: (message) => {
      error = message;
    },
    ready: () => {
      ready = true;
    },
  });
  onMount(() => {
    desktop = hasNativeMira();
    void lifecycle.start();
    return lifecycle.dispose;
  });

  async function saveProviderSettings(
    change: Partial<Pick<MiraSettings, 'model' | 'openRouterKey'>>,
  ) {
    if (!store || lifecycle.disposed) return false;
    const next = { ...settings, ...change };
    await store.saveSettings(next);
    if (lifecycle.disposed) return false;
    settings = next;
    return true;
  }

  function clearMessages() {
    if (lifecycle.disposed) return;
    error = '';
    notice = '';
  }
  async function openPanel(
    panel: 'sessions' | 'settings',
    trigger?: HTMLElement,
    preserveMessage = false,
  ) {
    if (!(await openOverlay(panel, trigger, preserveMessage))) return;
    if (panel === 'settings' && !desktop && settings.openRouterKey) void refreshUsage();
    if (panel === 'settings' && !desktop && settingsDrafts.key.trim() && !modelsChecked)
      void refreshModels();
  }
  async function togglePanel(panel: 'sessions' | 'settings', trigger: HTMLElement) {
    if (overlay === panel) closePanel();
    else await openPanel(panel, trigger);
  }
  function openOverlay(surface: MiraOpenOverlay, trigger?: HTMLElement, preserveMessage = false) {
    if (lifecycle.disposed || overlay === surface) return Promise.resolve(false);
    stopSpokenReply();
    if (!preserveMessage) clearMessages();
    return overlays.open(surface, trigger);
  }
  function setPickerSelecting(selecting: boolean) {
    if (selecting) void openOverlay('patterns');
    else overlays.close('patterns');
  }
  function closePanel() {
    overlays.close();
    clearMessages();
  }
  function messageOf(cause: unknown) {
    return cause instanceof Error ? cause.message : 'Something went wrong. Please try again.';
  }
  async function activate(id: string) {
    if (!store || lifecycle.disposed) return;
    dictation.cancel();
    settings = { ...settings, activeSessionId: id };
    draft = '';
    draftPatterns = [];
    closePanel();
    await store.saveSettings(settings);
  }
  async function newSession(withContext = false) {
    if (!store || lifecycle.disposed) return;
    clearMessages();
    const session = await conversation.create(
      availableModalityId(settings.preferredModalityId ?? active?.modalityId),
      withContext ? context : null,
    );
    if (!lifecycle.disposed) await activate(session.id);
  }
  async function openPracticePicker(trigger?: HTMLElement) {
    if (!active) await newSession(Boolean(context && selectedPattern));
    if (!active || lifecycle.disposed) return;
    await openOverlay('patterns', trigger);
    return !lifecycle.disposed && overlay === 'patterns';
  }
  async function openModalityPicker(query = '', trigger?: HTMLElement) {
    if (!active || lifecycle.disposed) return;
    modalitySearch = query;
    await openOverlay('modalities', trigger);
  }
  async function useContext(session: Session) {
    if (!context || lifecycle.disposed) return;
    await conversation.apply(session, {
      type: 'select-pattern',
      pattern: context,
      at: new Date().toISOString(),
    });
    await activate(session.id);
  }
  async function removePattern() {
    if (active && !lifecycle.disposed)
      await conversation.apply(active, {
        type: 'select-pattern',
        pattern: null,
        at: new Date().toISOString(),
      });
  }
  async function chooseLibraryPattern(pattern: MiraPatternSummary) {
    if (!active || lifecycle.disposed) return;
    await conversation.apply(active, {
      type: 'select-pattern',
      pattern: { sourceId: pattern.sourceId, entityId: pattern.id },
      at: new Date().toISOString(),
    });
    if (!lifecycle.disposed) overlays.close('patterns');
  }
  async function chooseModality(id: string) {
    if (!active || lifecycle.disposed || id === active.modalityId) return;
    conversation.cancelReply();
    await conversation.apply(active, {
      type: 'set-modality',
      modalityId: id,
      at: new Date().toISOString(),
    });
    if (lifecycle.disposed) return;
    notice =
      'Modality changed. The transcript remains; the previous pattern selection was cleared.';
  }
  async function send(retry = false) {
    const session = active;
    const submittedDraft = draft;
    const submittedPatterns = draftPatterns;
    const text = retry
      ? session?.messages.at(-1)?.text
      : draft.trim() || (draftPatterns.length ? "I'd like to explore the mentioned patterns." : '');
    if (!store || lifecycle.disposed || !session || !text || sending) return;
    if (retry && !canRetryReply(session)) return;
    if (voiceState.phase === 'interpreting') {
      notice = 'Please wait for voice command interpretation to finish.';
      return;
    }
    if (desktop && (runtime.status !== 'ready' || !settings.model)) {
      error = 'Prepare and choose a local model before sending.';
      void openPanel('settings', undefined, true);
      return;
    }
    if (!desktop && (!settings.openRouterKey || !settings.model)) {
      error = 'Connect with OpenRouter and choose a zero-retention model before sending.';
      void openPanel('settings', undefined, true);
      return;
    }
    if (!desktop && settings.monthlyBudgetUsd !== null && settings.monthlyBudgetUsd !== undefined) {
      sending = true;
      try {
        await refreshUsage();
      } finally {
        if (!lifecycle.disposed) sending = false;
      }
    }
    if (lifecycle.disposed || active?.id !== session.id) return;
    clearMessages();
    if (!retry && draft === submittedDraft) draft = '';
    const mentions = retry
      ? []
      : submittedPatterns.map((pattern) => ({
          sourceId: pattern.sourceId,
          entityId: pattern.id,
          title: pattern.title,
        }));
    if (!retry && draftPatterns === submittedPatterns) draftPatterns = [];
    const providerOptions = {
      settings,
      patternContext: async (effect: Effect) => {
        return messagePatternContexts(
          effect,
          [...personal, ...data.patterns],
          loadArticleReference,
        );
      },
    };
    const provider = desktop
      ? createNativeReplyProvider(providerOptions)
      : createOpenRouterReplyProvider(providerOptions);
    try {
      const completed = await conversation.send(session, text, provider, retry, mentions);
      if (!lifecycle.disposed) {
        const reply = completed?.messages.at(-1);
        replyPlayback.readAutomatically(reply?.role === 'assistant' ? reply : undefined);
      }
    } catch (cause) {
      if (!lifecycle.disposed) error = messageOf(cause);
    } finally {
      if (!lifecycle.disposed) {
        if (!desktop) void refreshUsage();
        composer?.focus();
      }
    }
  }

  async function toggleAutoSpeak() {
    if (!store || lifecycle.disposed) return;
    const next = { ...settings, autoSpeak: !settings.autoSpeak };
    await store.saveSettings(next);
    if (lifecycle.disposed) return;
    settings = next;
  }
  async function deleteSession(session: Session) {
    if (
      !store ||
      lifecycle.disposed ||
      !confirm(
        `Delete “${session.title}” and its conversation from this device? This cannot be undone.`,
      )
    )
      return;
    await conversation.remove(session.id);
    if (lifecycle.disposed) return;
    if (settings.activeSessionId === session.id) {
      settings = { ...settings, activeSessionId: sessions[0]?.id ?? null };
      await store.saveSettings(settings);
      if (lifecycle.disposed) return;
    }
    notice = 'Session deleted from this device.';
  }
  async function renameSession(session: Session) {
    if (lifecycle.disposed) return;
    const title = renameDraft.trim();
    if (!title) {
      error = 'Enter a session name.';
      return;
    }
    await conversation.apply(session, {
      type: 'rename',
      title: title.slice(0, 120),
      at: new Date().toISOString(),
    });
    if (lifecycle.disposed) return;
    renameId = null;
    renameDraft = '';
    clearMessages();
  }
  async function saveBudget() {
    if (!store || lifecycle.disposed) return;
    const amount = settingsDrafts.budget.trim() ? Number(settingsDrafts.budget) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000)) {
      error = 'Enter a monthly budget greater than $0, or leave it empty to remove the limit.';
      return;
    }
    const next = { ...settings, monthlyBudgetUsd: amount };
    await store.saveSettings(next);
    if (lifecycle.disposed) return;
    settings = next;
    notice = amount === null ? 'Monthly Mira budget removed.' : 'Monthly Mira budget saved.';
    error = '';
  }
  function selectPromptModality(id: string) {
    settingsDrafts.promptModality = id;
    settingsDrafts.prompt = settings.promptOverrides[id] ?? modalityById(id).prompt;
  }
  async function savePrompt() {
    if (lifecycle.disposed) return;
    if (!store || !settingsDrafts.prompt.trim()) {
      error = 'The modality prompt cannot be empty.';
      return;
    }
    const next = {
      ...settings,
      promptOverrides: {
        ...settings.promptOverrides,
        [settingsDrafts.promptModality]: settingsDrafts.prompt.trim(),
      },
    };
    await store.saveSettings(next);
    if (lifecycle.disposed) return;
    settings = next;
    error = '';
    notice = 'Modality prompt saved.';
  }
  async function restorePrompt() {
    if (!store || lifecycle.disposed) return;
    const remaining = Object.fromEntries(
      Object.entries(settings.promptOverrides).filter(
        ([id]) => id !== settingsDrafts.promptModality,
      ),
    );
    const next = { ...settings, promptOverrides: remaining };
    await store.saveSettings(next);
    if (lifecycle.disposed) return;
    settings = next;
    settingsDrafts.prompt = modalityById(settingsDrafts.promptModality).prompt;
    notice = 'Default modality prompt restored.';
    error = '';
  }
</script>

{#snippet voiceFeedback()}
  {#if features.voice}<VoiceFeedback state={voiceState} onStop={() => voiceControl.stop()} />{/if}
{/snippet}

<svelte:head>
  <title>mira — patternverse</title>
  <meta name="description" content="mira, your private reflective companion within Patternverse." />
</svelte:head>

<main class="mira-app">
  <header class="mira-app-header">
    <div class="mira-brand">
      <a href={resolve('/apps/mira')} aria-label="mira home"
        ><ChevronLeft size={23} strokeWidth={1.5} /><MiraMark /><span>mira</span></a
      >
    </div>
    <div class="mira-header-tools">
      <button
        type="button"
        class="mira-icon-button"
        aria-label="Previous sessions"
        title="Previous sessions"
        aria-expanded={view === 'sessions'}
        disabled={!ready}
        onclick={(event) => void togglePanel('sessions', event.currentTarget)}
        ><History size={19} /></button
      >
      <button
        type="button"
        class="mira-icon-button"
        aria-label="Settings"
        title="Settings"
        aria-expanded={view === 'settings'}
        disabled={!ready}
        onclick={(event) => void togglePanel('settings', event.currentTarget)}
        ><Settings2 size={19} /></button
      >
    </div>
  </header>
  <div class="mira-app-body">
    <div class="mira-workspace">
      {#if error && view === 'chat'}<p class="mira-app-alert" role="alert">{error}</p>{/if}
      {#if notice && view === 'chat'}<p class="mira-app-notice" role="status">{notice}</p>{/if}
      {#if ready && view !== 'chat'}<button
          type="button"
          class="mira-panel-backdrop"
          aria-label="Close panel"
          onclick={closePanel}
        ></button>{/if}

      {#if !ready}
        <div class="mira-app-empty"><p>Opening private sessions…</p></div>
      {:else}
        {#if view === 'sessions'}
          <MiraSessionsPanel
            {sessions}
            bind:renameId
            bind:renameDraft
            bind:archivePassphrase
            bind:importFile
            {transferring}
            actions={{
              newSession: () => newSession(),
              activate,
              renameSession,
              deleteSession,
              exportSessions,
              importSessions,
            }}
            {error}
            {notice}
            feedback={voiceFeedback}
            onClose={closePanel}
          />
        {/if}
        {#if view === 'settings'}
          <MiraSettingsPanel
            {active}
            {desktop}
            {settings}
            {features}
            provider={{
              runtime,
              localChoices,
              modelProgress,
              connectingOpenRouter,
              sending,
              models,
              loadingModels,
              modelsChecked,
            }}
            usage={{ keyUsage, usageCheckedAt, usageError, loadingUsage }}
            bind:drafts={settingsDrafts}
            actions={{
              chooseModality,
              retryNativeRuntime,
              chooseLocalModel,
              installLocalModel,
              connectOpenRouter,
              disconnectOpenRouter,
              saveConnection,
              refreshModels,
              saveModelChoice,
              toggleAutoSpeak,
              refreshUsage,
              saveBudget,
              selectPromptModality,
              savePrompt,
              restorePrompt,
              keyEdited: openRouterProvider.keyEdited,
            }}
            {error}
            {notice}
            feedback={voiceFeedback}
            onClose={closePanel}
          />
        {/if}
        <section class="mira-chat" aria-label="mira conversation" inert={view !== 'chat'}>
          {#if !desktop && keyUsage && isCurrentUtcMonth(usageCheckedAt) && settings.monthlyBudgetUsd != null && keyUsage.monthlyUsd >= settings.monthlyBudgetUsd}
            <p class="mira-chat-budget-warning" role="status">
              OpenRouter spending has reached your monthly warning threshold ({formatUsd(
                keyUsage.monthlyUsd,
              )} of {formatUsd(settings.monthlyBudgetUsd)}). You can still send messages.
            </p>
          {/if}
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
                Start a conversation for reflection and self-help. You can change its approach
                later.
              </p>
              {#if features.guidedExercises || features.standalonePatterns}<button
                  type="button"
                  class="mira-welcome-practices"
                  aria-label="Choose a pattern or practice"
                  onclick={(event) => void openPracticePicker(event.currentTarget)}
                  ><BookOpen size={19} /> Patterns &amp; practices <ChevronDown size={16} /></button
                >{/if}
              <button
                type="button"
                class="mira-primary"
                onclick={() => newSession(Boolean(context && selectedPattern))}
                >New session <span aria-hidden="true">→</span></button
              >
            </div>
          {:else}
            <div class="mira-mobile-context" aria-label="Conversation controls">
              <button
                type="button"
                aria-label="Choose therapy approach"
                onclick={(event) => void openModalityPicker('', event.currentTarget)}
              >
                <span>{modalityById(active.modalityId).name}</span><ChevronDown size={16} />
              </button>
              {#if features.guidedExercises || features.standalonePatterns}<button
                  type="button"
                  aria-label="Choose a pattern or practice"
                  aria-expanded={pickerSelecting}
                  onclick={(event) => void openPracticePicker(event.currentTarget)}
                  ><BookOpen size={17} /><span>Patterns &amp; practices</span><ChevronDown
                    size={16}
                  /></button
                >{/if}
            </div>
            <MiraSessionHeading
              title={active.title}
              approachName={modalityById(active.modalityId).name}
              renaming={renameId === active.id}
              bind:renameDraft
              onRename={() => {
                if (!active) return;
                renameId = active.id;
                renameDraft = active.title;
              }}
              onSave={() => {
                if (active) void renameSession(active);
              }}
              onCancel={() => {
                renameId = null;
                renameDraft = '';
              }}
            />
            {#if activePattern}
              <MiraPatternContext
                pattern={activePattern}
                reference={activeReference}
                error={activeReferenceError}
                returnHref={activePatternHref}
                practiceHref={activePracticeHref}
                onremove={removePattern}
                onretry={() => activePattern && displayArticleReference(activePattern)}
              />
            {:else if active.activePattern}
              <div class="mira-active-pattern">
                <span>The selected pattern is unavailable on this device.</span>
                <button
                  type="button"
                  onclick={removePattern}
                  aria-label="Remove selected library pattern">×</button
                >
              </div>
            {/if}
            <MiraTranscript
              messages={active.messages}
              pending={sending && Boolean(active.pendingReplyId)}
              streamingText={streamingReply?.sessionId === active.id ? streamingReply.text : ''}
              retryAvailable={!sending && canRetryReply(active)}
              voiceEnabled={features.voice}
              {speakingId}
              onToggleSpeech={toggleSpokenReply}
              onRetry={() => void send(true)}
            />
            {#if (features.guidedExercises || features.standalonePatterns) && store}<GuidedTechnique
                bind:this={guided}
                sessionId={active.id}
                modalityId={active.modalityId}
                {store}
                requestedTechnique={page.url.searchParams.get('technique')}
                patterns={libraryPatterns}
                onPatternSelect={chooseLibraryPattern}
                bind:selecting={() => pickerSelecting, setPickerSelecting}
                restoreFocus={false}
                {voiceFeedback}
              />{/if}
            {#if modalitySelecting}
              <ModalityPicker
                choices={visibleModalities}
                bind:search={modalitySearch}
                selected={active.modalityId}
                onSelect={(id) => void selectModality(id)}
                onClose={() => overlays.close('modalities')}
                restoreFocus={false}
                feedback={voiceFeedback}
              />
            {/if}
            {#if !pickerSelecting && !modalitySelecting && view === 'chat'}{@render voiceFeedback()}{/if}
            {#key active.id}<MiraComposer
                {draft}
                mentionPatterns={data.patterns}
                therapyCollections={data.therapyCollections}
                {draftPatterns}
                onDraftPatternsChange={(patterns) => {
                  draftPatterns = patterns;
                }}
                interim={voiceState.interim ?? ''}
                {desktop}
                dictationPhase={voicePhase}
                voiceControlPhase={voiceState.phase}
                {sending}
                voiceEnabled={features.voice}
                patternsEnabled={features.guidedExercises || features.standalonePatterns}
                approachName={modalityById(active.modalityId).name}
                bind:element={composer}
                onDraftChange={(value) => {
                  draft = value;
                  voiceState = { ...voiceState, interim: '' };
                }}
                onSend={() => void send()}
                onPatterns={(trigger) => void openPracticePicker(trigger)}
                onApproach={(trigger) => void openModalityPicker('', trigger)}
                onDictation={toggleVoiceInput}
                onVoiceControl={toggleVoiceControl}
              />{/key}
          {/if}
          <p class="mira-legal-note">
            AI for reflection, not therapy or emergency care.
            <a href={resolve('/legal')}>Safety &amp; use</a> ·
            <a href={resolve('/privacy')}>Privacy</a>
          </p>
        </section>
      {/if}
    </div>
  </div>
</main>

<style>
  .mira-legal-note {
    margin: 0.5rem 1rem 0.75rem;
    text-align: center;
    color: #575750;
    font-size: 0.75rem;
    line-height: 1.6;
  }
  .mira-legal-note a {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
</style>
