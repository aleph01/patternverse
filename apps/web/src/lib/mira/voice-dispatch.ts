import type { VoiceCommand, VoiceContext } from './voice-commands';

interface PatternActions {
  searchPatterns: (query: string) => void;
  selectPattern: (id: string) => string;
  startSelection: () => Promise<string>;
  describeSelection: () => string;
}

export interface MiraVoiceDispatchPorts {
  surface: () => VoiceContext['surface'];
  draft: () => string;
  draftChanged: (text: string) => void;
  sending: () => boolean;
  send: () => void | Promise<void>;
  patterns: () => PatternActions | undefined;
  openPatterns: () => Promise<boolean | undefined>;
  openModalities: (query: string) => Promise<void>;
  searchModalities: (query: string) => void;
  selectModality: (id: string) => Promise<void>;
  latestReply: () => { id: string; text: string } | undefined;
  speakReply: (id: string, text: string) => boolean;
  stopReading: () => void;
  close: () => void;
  openPanel: (panel: 'settings' | 'sessions') => Promise<void>;
  stopVoiceControl: () => void;
}

/** Dispatch validated intents to existing UI actions; never interpret speech or own execution state. */
export function createMiraVoiceDispatch(ports: MiraVoiceDispatchPorts) {
  return async function execute(command: VoiceCommand): Promise<string> {
    switch (command.type) {
      case 'draft': {
        if (ports.surface() !== 'chat') return 'Close this panel to draft a message.';
        const draft = ports.draft();
        ports.draftChanged(
          `${draft.trimEnd()}${draft.trim() ? ' ' : ''}${command.text}`.slice(0, 30000),
        );
        return 'Draft updated · say “send” when ready.';
      }
      case 'send':
        if (ports.surface() !== 'chat') return 'Close this panel before sending your message.';
        if (ports.sending()) return 'mira is still replying. Your draft is kept.';
        if (!ports.draft().trim()) return 'Your message is empty.';
        void ports.send();
        return 'Sending your message…';
      case 'patterns':
        if (await ports.openPatterns()) ports.patterns()?.searchPatterns(command.query);
        return 'Choose a numbered result, then say “start”.';
      case 'modalities':
        await ports.openModalities(command.query);
        return 'Choose a numbered therapy approach.';
      case 'search':
        if (ports.surface() === 'modalities') ports.searchModalities(command.query);
        else if (ports.surface() === 'patterns') ports.patterns()?.searchPatterns(command.query);
        return 'Search updated.';
      case 'select':
        if (ports.surface() === 'modalities') {
          await ports.selectModality(command.id);
          return 'Therapy approach changed.';
        }
        return ports.surface() === 'patterns'
          ? (ports.patterns()?.selectPattern(command.id) ?? 'Open patterns first.')
          : 'Open a selector first.';
      case 'modality':
        await ports.selectModality(command.id);
        return 'Therapy approach changed.';
      case 'start':
        return ports.surface() === 'patterns'
          ? ((await ports.patterns()?.startSelection()) ?? 'Select a pattern first.')
          : 'Open patterns and select one first.';
      case 'describe':
        return ports.patterns()?.describeSelection() ?? 'Select a pattern first.';
      case 'read': {
        const reply = ports.latestReply();
        if (!reply) return 'There is no reply to read yet.';
        return ports.speakReply(reply.id, reply.text)
          ? 'Reading the latest reply.'
          : 'Spoken replies are unavailable in this browser.';
      }
      case 'stop-reading':
        ports.stopReading();
        return 'Reading stopped.';
      case 'close':
        ports.close();
        return 'Back to the conversation.';
      case 'settings':
      case 'sessions':
        await ports.openPanel(command.type);
        return `${command.type === 'settings' ? 'Settings' : 'Previous sessions'} opened.`;
      case 'stop':
        ports.stopVoiceControl();
        return 'Voice control stopped.';
      case 'notice':
        return command.text;
    }
  };
}
