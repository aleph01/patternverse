<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import '$lib/mira/workspace.css';
  import { resolve } from '$app/paths';
  import { onMount, tick } from 'svelte';
  import {
    ArrowUp,
    History,
    Mic,
    Plus,
    Settings2,
    Square,
    Volume2,
    AudioLines,
    X,
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
  import {
    startBrowserDictation,
    startBrowserVoiceControl,
    type BrowserDictation,
  } from '$lib/mira/browser-voice';
  import { startNativeVoiceControl } from '$lib/mira/native-voice-listener';
  import { createVoiceController, type VoiceState } from '$lib/mira/voice-controller';
  import { searchVoiceChoices, type VoiceCommand } from '$lib/mira/voice-commands';
  import VoiceFeedback from '$lib/mira/VoiceFeedback.svelte';
  import ModalityPicker from '$lib/mira/ModalityPicker.svelte';
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
    requestLocalText,
    type LocalModelChoice,
    type LocalRuntimeStatus,
  } from '$lib/mira/native';
  import { exportPortableArchive, importPortableArchive } from '$lib/mira/portable';
  import {
    createOpenRouterReplyProvider,
    DEFAULT_OPENROUTER_MODEL,
    getOpenRouterKeyUsage,
    listZdrModels,
    interpretOpenRouterVoiceCommand,
    type OpenRouterKeyUsage,
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
    monthlyBudgetUsd: null,
  });
  let personal = $state<readonly MiraPatternSummary[]>([]);
  let context = $state<ReturnType<typeof parseMiraPatternQuery>>(null);
  let ready = $state(false);
  let view = $state<'chat' | 'sessions' | 'settings'>('chat');
  let draft = $state('');
  let keyDraft = $state('');
  let modelDraft = $state('');
  let budgetDraft = $state('');
  let keyUsage = $state<OpenRouterKeyUsage | null>(null);
  let usageCheckedAt = $state<string | null>(null);
  let usageError = $state('');
  let loadingUsage = $state(false);
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
  let panelReturnFocus: HTMLElement | undefined;
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
  let guided = $state<ReturnType<typeof GuidedTechnique>>();
  let modalitySelecting = $state(false);
  let modalitySearch = $state('');
  let voiceState = $state<VoiceState>({ phase: 'off', heard: '', feedback: '' });
  const modalityChoices = MODALITIES.map(({ id, name }) => ({ id, label: name }));
  const visibleModalities = $derived(searchVoiceChoices(modalityChoices, modalitySearch));
  const voiceControl = createVoiceController({
    listen: (callbacks) =>
      desktop ? startNativeVoiceControl(callbacks) : startBrowserVoiceControl(window, callbacks),
    context: () => ({
      sessionId: active?.id ?? null,
      surface: modalitySelecting ? 'modalities' : pickerSelecting ? 'patterns' : view,
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
        if (!disposed) void refreshUsage();
      }
    },
    changed: (state) => {
      if (!disposed) voiceState = state;
    },
  });

  /** Route spoken intents through the same application actions used by visible controls. */
  async function executeVoiceCommand(command: VoiceCommand): Promise<string> {
    switch (command.type) {
      case 'draft':
        if (view !== 'chat' || pickerSelecting || modalitySelecting)
          return 'Close this panel to draft a message.';
        draft = `${draft.trimEnd()}${draft.trim() ? ' ' : ''}${command.text}`.slice(0, 30000);
        return 'Draft updated · say “send” when ready.';
      case 'send':
        if (view !== 'chat' || pickerSelecting || modalitySelecting)
          return 'Close this panel before sending your message.';
        if (sending) return 'mira is still replying. Your draft is kept.';
        if (!draft.trim()) return 'Your message is empty.';
        void send();
        return 'Sending your message…';
      case 'patterns':
        closePanel();
        modalitySelecting = false;
        await tick();
        guided?.searchPatterns(command.query);
        return 'Choose a numbered result, then say “start”.';
      case 'modalities':
        closePanel();
        pickerSelecting = false;
        modalitySearch = command.query;
        modalitySelecting = true;
        return 'Choose a numbered therapy approach.';
      case 'search':
        if (modalitySelecting) modalitySearch = command.query;
        else if (pickerSelecting) guided?.searchPatterns(command.query);
        return 'Search updated.';
      case 'select':
        if (modalitySelecting) {
          await setVoiceModality(command.id);
          return 'Therapy approach changed.';
        }
        return pickerSelecting
          ? (guided?.selectPattern(command.id) ?? 'Open patterns first.')
          : 'Open a selector first.';
      case 'modality':
        await setVoiceModality(command.id);
        return 'Therapy approach changed.';
      case 'start':
        return pickerSelecting
          ? ((await guided?.startSelection()) ?? 'Select a pattern first.')
          : 'Open patterns and select one first.';
      case 'describe':
        return guided?.describeSelection() ?? 'Select a pattern first.';
      case 'read': {
        const reply = active?.messages.findLast((message) => message.role === 'assistant');
        if (!reply) return 'There is no reply to read yet.';
        return speakReply(reply.id, reply.text)
          ? 'Reading the latest reply.'
          : 'Spoken replies are unavailable in this browser.';
      }
      case 'stop-reading':
        stopSpokenReply();
        return 'Reading stopped.';
      case 'close':
        if (pickerSelecting) guided?.dismissSelection();
        modalitySelecting = false;
        pickerSelecting = false;
        closePanel();
        return 'Back to the conversation.';
      case 'settings':
      case 'sessions':
        pickerSelecting = false;
        modalitySelecting = false;
        if (view !== command.type) await openPanel(command.type);
        return `${command.type === 'settings' ? 'Settings' : 'Previous sessions'} opened.`;
      case 'stop':
        voiceControl.stop();
        return 'Voice control stopped.';
      case 'notice':
        return command.text;
    }
  }
  async function setVoiceModality(id: string) {
    if (!modalityChoices.some((item) => item.id === id)) return;
    await chooseModality(id);
    modalitySelecting = false;
    pickerSelecting = false;
  }
  function toggleVoiceControl() {
    if (voiceState.phase !== 'off') voiceControl.stop();
    else if (voicePhase === 'idle') {
      stopSpokenReply();
      void voiceControl.start();
    }
  }

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
  const formatUsd = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  const isCurrentUtcMonth = (checkedAt: string | null) => {
    if (!checkedAt) return false;
    const checked = new Date(checkedAt);
    const now = new Date();
    return (
      checked.getUTCFullYear() === now.getUTCFullYear() &&
      checked.getUTCMonth() === now.getUTCMonth()
    );
  };

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
    const suspendVoice = () => {
      if (document.hidden && voiceState.phase !== 'off')
        voiceControl.stop(
          'Voice control stopped while the app was in the background. Tap the waveform to resume.',
        );
    };
    document.addEventListener('visibilitychange', suspendVoice);
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
      if (!desktop && !preferences.model) await store.saveSettings(settings);
      keyDraft = settings.openRouterKey;
      modelDraft = settings.model;
      budgetDraft = settings.monthlyBudgetUsd?.toString() ?? '';
      promptDraft = settings.promptOverrides[promptModality] ?? modalityById(promptModality).prompt;
      if (!desktop && settings.openRouterKey && settings.monthlyBudgetUsd != null)
        void refreshUsage();
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
      voiceControl.stop();
      document.removeEventListener('visibilitychange', suspendVoice);
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
  async function openPanel(
    panel: 'sessions' | 'settings',
    trigger?: HTMLElement,
    preserveMessage = false,
  ) {
    if (view === panel) {
      closePanel();
      return;
    }
    stopSpokenReply();
    if (!preserveMessage) clearMessages();
    panelReturnFocus = trigger;
    view = panel;
    await tick();
    document.querySelector<HTMLElement>('.mira-app-panel[role="dialog"]')?.focus();
    if (panel === 'settings' && !desktop && settings.openRouterKey) void refreshUsage();
  }
  function closePanel() {
    const wasOpen = view !== 'chat';
    view = 'chat';
    clearMessages();
    if (wasOpen) void tick().then(() => panelReturnFocus?.focus());
  }
  function handlePanelKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key !== 'Tab') return;
    const panel = event.currentTarget;
    if (!(panel instanceof HTMLElement)) return;
    const elements = [
      ...panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)',
      ),
    ];
    if (!elements.length) return;
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
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
    closePanel();
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
      error = 'Connect OpenRouter and choose a zero-retention model before sending.';
      void openPanel('settings', undefined, true);
      return;
    }
    if (!desktop && settings.monthlyBudgetUsd !== null && settings.monthlyBudgetUsd !== undefined) {
      sending = true;
      try {
        const usage = await getOpenRouterKeyUsage(settings.openRouterKey);
        keyUsage = usage;
        usageCheckedAt = new Date().toISOString();
        usageError = '';
      } catch (cause) {
        usageError = messageOf(cause);
      } finally {
        sending = false;
      }
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
      if (!desktop) void refreshUsage();
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
    if (voiceState.phase !== 'off') return;
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
      return false;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = navigator.language || 'en-US';
    utterance.rate = 0.96;
    utterance.onend = () => {
      if (speakingId === id) {
        speakingId = null;
        voiceControl.playbackEnded();
      }
    };
    utterance.onerror = (event) => {
      if (speakingId === id) {
        speakingId = null;
        voiceControl.playbackEnded();
        if (event.error !== 'canceled' && event.error !== 'interrupted')
          error = 'The device could not read this reply. Try its play button.';
      }
    };
    speakingId = id;
    voiceControl.playbackStarted();
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function toggleSpokenReply(id: string, text: string) {
    if (speakingId === id) {
      stopSpokenReply();
    } else speakReply(id, text);
  }

  function stopSpokenReply() {
    window.speechSynthesis?.cancel();
    speakingId = null;
    voiceControl.playbackEnded();
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
    keyUsage = null;
    usageCheckedAt = null;
    usageError = '';
    if (next.openRouterKey) void refreshUsage();
    notice = 'Provider settings saved encrypted on this device.';
    error = '';
  }
  async function saveBudget() {
    if (!store) return;
    const amount = budgetDraft.trim() ? Number(budgetDraft) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000)) {
      error = 'Enter a monthly budget greater than $0, or leave it empty to remove the limit.';
      return;
    }
    const next = { ...settings, monthlyBudgetUsd: amount };
    await store.saveSettings(next);
    settings = next;
    notice = amount === null ? 'Monthly Mira budget removed.' : 'Monthly Mira budget saved.';
    error = '';
  }
  async function refreshUsage() {
    const key = settings.openRouterKey;
    if (!key || desktop) return;
    loadingUsage = true;
    usageError = '';
    try {
      const usage = await getOpenRouterKeyUsage(key);
      if (key !== settings.openRouterKey) return;
      keyUsage = usage;
      usageCheckedAt = new Date().toISOString();
    } catch (cause) {
      if (key === settings.openRouterKey) usageError = messageOf(cause);
    } finally {
      loadingUsage = false;
    }
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

{#snippet voiceFeedback()}
  <VoiceFeedback state={voiceState} onStop={() => voiceControl.stop()} />
{/snippet}

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
      <button
        type="button"
        class="mira-icon-button"
        aria-label="Previous sessions"
        title="Previous sessions"
        aria-expanded={view === 'sessions'}
        disabled={!ready}
        onclick={(event) => void openPanel('sessions', event.currentTarget)}
        ><History size={19} /></button
      >
      <button
        type="button"
        class="mira-icon-button"
        aria-label="Settings"
        title="Settings"
        aria-expanded={view === 'settings'}
        disabled={!ready}
        onclick={(event) => void openPanel('settings', event.currentTarget)}
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
          <div
            class="mira-app-panel mira-drawer"
            role="dialog"
            aria-modal="true"
            tabindex="-1"
            onkeydown={handlePanelKeydown}
            aria-labelledby="mira-sessions-heading"
          >
            {@render voiceFeedback()}
            <div class="mira-section-heading">
              <div>
                <h2 id="mira-sessions-heading">Sessions</h2>
              </div>
              <button
                type="button"
                class="mira-icon-button"
                aria-label="Close sessions"
                onclick={closePanel}><X size={20} /></button
              >
            </div>
            {#if error}<p class="mira-app-alert" role="alert">{error}</p>{/if}
            {#if notice}<p class="mira-app-notice" role="status">{notice}</p>{/if}
            <button type="button" class="mira-drawer-new" onclick={() => newSession()}
              >New session <span aria-hidden="true">＋</span></button
            >
            {#if sessions.length === 0}<p>
                No sessions yet. Start one whenever you are ready.
              </p>{/if}
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
                      <button type="button" onclick={() => activate(session.id)}>Open</button
                      ><button
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
                Export a portable archive or import one you chose. Nothing is imported
                automatically. The archive excludes your OpenRouter key.
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
                <button
                  type="button"
                  onclick={importSessions}
                  disabled={transferring || !importFile}>Import selected archive</button
                >
              </div>
              {#if importFile}<p>Selected: {importFile.name}</p>{/if}
            </section>
          </div>
        {/if}
        {#if view === 'settings'}
          <div
            class="mira-app-panel mira-settings mira-drawer"
            role="dialog"
            aria-modal="true"
            tabindex="-1"
            onkeydown={handlePanelKeydown}
            aria-labelledby="mira-settings-heading"
          >
            {@render voiceFeedback()}
            <div class="mira-section-heading">
              <div>
                <h2 id="mira-settings-heading">Settings</h2>
              </div>
              <button
                type="button"
                class="mira-icon-button"
                aria-label="Close settings"
                onclick={closePanel}><X size={20} /></button
              >
            </div>
            {#if error}<p class="mira-app-alert" role="alert">{error}</p>{/if}
            {#if notice}<p class="mira-app-notice" role="status">{notice}</p>{/if}
            {#if active}
              <div class="mira-session-modality-setting">
                <label for="mira-active-modality">Current session modality</label>
                <select
                  id="mira-active-modality"
                  value={active.modalityId}
                  onchange={(event) => chooseModality(event.currentTarget.value)}
                >
                  {#each MODALITIES as modality (modality.id)}<option value={modality.id}
                      >{modality.name}</option
                    >{/each}
                </select>
              </div>
            {/if}
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
                    Messages are encrypted on this device. Sending a message shares its recent
                    context with your chosen OpenRouter model for processing. Zero-data-retention
                    routing is required; it is not fully local AI.
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
                <details class="mira-speech-note">
                  <summary>Voice control</summary>
                  <p>
                    The waveform button starts hands-free control; the microphone still only
                    dictates. Speak a message, pause, then say “send”. Try “open patterns”, “search
                    for reframing”, “choose the first one”, then “start”. Say “choose therapy
                    approach”, “read the last reply”, or “stop listening”.
                  </p>
                  <p>
                    Listening pauses during readback and resumes afterward, to prevent the reply
                    becoming a command. It stops when the app goes into the background.
                  </p>
                  <p>
                    {desktop
                      ? 'Audio is transcribed by the local Whisper engine. Unclear commands use your selected local model.'
                      : 'Speech recognition uses your browser’s speech service, which may process audio remotely. Its policy is separate from OpenRouter ZDR. Unclear commands and visible menu labels go to your selected OpenRouter model with ZDR required; this uses API credits.'}
                    Feedback stays on screen.
                  </p>
                </details>
              </section>
              {#if !desktop}
                <section class="mira-cost-overview" aria-labelledby="mira-cost-heading">
                  <h3 id="mira-cost-heading">OpenRouter costs</h3>
                  <p>
                    Reported spending for this API key, including use outside Mira. OpenRouter
                    resets monthly usage at midnight UTC on the first of the month.
                  </p>
                  {#if settings.openRouterKey}
                    {#if keyUsage && isCurrentUtcMonth(usageCheckedAt)}
                      <p class="mira-cost-total">
                        {formatUsd(keyUsage.monthlyUsd)} <span>this month</span>
                      </p>
                      {#if settings.monthlyBudgetUsd != null}
                        <progress
                          aria-label="Monthly budget used"
                          value={Math.min(keyUsage.monthlyUsd / settings.monthlyBudgetUsd, 1)}
                          max="1"
                        ></progress>
                        <p>
                          {formatUsd(Math.max(settings.monthlyBudgetUsd - keyUsage.monthlyUsd, 0))} before
                          your Mira warning threshold.
                        </p>
                        {#if keyUsage.monthlyUsd >= settings.monthlyBudgetUsd}<p
                            class="mira-budget-warning"
                            role="status"
                          >
                            Monthly budget reached. Mira will warn you, but replies remain
                            available.
                          </p>{/if}
                      {/if}
                      {#if keyUsage.providerLimitUsd != null}<p>
                          OpenRouter key limit: {formatUsd(
                            keyUsage.providerLimitUsd,
                          )}{keyUsage.providerLimitReset
                            ? ` · resets ${keyUsage.providerLimitReset}`
                            : ''}.
                        </p>{/if}
                      {#if usageCheckedAt}<p class="mira-cost-timestamp">
                          Checked {new Date(usageCheckedAt).toLocaleString()}
                        </p>{/if}
                    {:else if !loadingUsage}<p>No current-month usage report available yet.</p>{/if}
                    {#if usageError}<p class="mira-budget-warning" role="status">
                        Could not refresh OpenRouter usage: {usageError}
                      </p>{/if}
                    <button type="button" onclick={refreshUsage} disabled={loadingUsage}
                      >{loadingUsage ? 'Checking usage…' : 'Refresh costs'}</button
                    >
                  {:else}<p>Connect an OpenRouter API key to see its reported spending.</p>{/if}
                  <label for="mira-budget">Monthly warning threshold (USD)</label>
                  <input
                    id="mira-budget"
                    type="number"
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    inputmode="decimal"
                    placeholder="No budget set"
                    value={budgetDraft}
                    oninput={(event) => (budgetDraft = event.currentTarget.value)}
                  />
                  <button type="button" onclick={saveBudget}>Save budget</button>
                  <p class="mira-cost-note">
                    This warning threshold is saved on this device; it is not a spending cap. For an
                    enforced limit across devices, set a monthly limit on your OpenRouter API key.
                  </p>
                </section>
              {/if}
              <section aria-labelledby="mira-prompt-heading">
                <h3 id="mira-prompt-heading">Therapy modalities</h3>
                <p>
                  Each modality has an editable guidance prompt. The selected modality belongs to
                  each session and can change during it.
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
                  <button type="button" class="mira-primary" onclick={savePrompt}
                    >Save prompt</button
                  ><button type="button" onclick={restorePrompt}>Restore default</button>
                </div>
              </section>
            </div>
            <p class="mira-settings-safety">
              mira offers reflection, not therapy or emergency care. Browser dictation may use your
              device’s speech service.
            </p>
          </div>
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
              <h2>{active.title}</h2>
              <span>{modalityById(active.modalityId).name}</span>
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
                bind:this={guided}
                sessionId={active.id}
                modalityId={active.modalityId}
                {store}
                patterns={libraryPatterns}
                onPatternSelect={chooseLibraryPattern}
                bind:selecting={pickerSelecting}
                {voiceFeedback}
              />{/if}
            {#if modalitySelecting}
              <ModalityPicker
                choices={visibleModalities}
                bind:search={modalitySearch}
                selected={active.modalityId}
                onSelect={(id) => void setVoiceModality(id)}
                onClose={() => (modalitySelecting = false)}
                feedback={voiceFeedback}
              />
            {/if}
            {#if !pickerSelecting && !modalitySelecting && view === 'chat'}{@render voiceFeedback()}{/if}
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
                  <button
                    type="button"
                    class="mira-modality-chip"
                    aria-label="Choose therapy approach"
                    onclick={() => {
                      modalitySearch = '';
                      modalitySelecting = true;
                    }}>{modalityById(active.modalityId).name}</button
                  >
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
                    disabled={voiceState.phase !== 'off' ||
                      voicePhase === 'requesting' ||
                      voicePhase === 'transcribing'}
                    onclick={toggleVoiceInput}
                    >{#if voicePhase === 'recording'}<Square size={17} />{:else}<Mic
                        size={19}
                      />{/if}</button
                  >
                  <button
                    type="button"
                    class="mira-icon-button"
                    aria-label={voiceState.phase === 'off'
                      ? 'Start voice control'
                      : 'Stop voice control'}
                    aria-pressed={voiceState.phase !== 'off'}
                    title="Voice control · speak commands and draft messages"
                    disabled={voicePhase !== 'idle'}
                    onclick={toggleVoiceControl}><AudioLines size={20} /></button
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
          {/if}
        </section>
      {/if}
    </div>
  </div>
</main>
