import type { Session } from '@patternverse/companion-core';
import type { LocalModelChoice, LocalRuntimeStatus } from './native';
import type { OpenRouterKeyUsage, ZdrModel } from './openrouter';

/** Editable UI drafts are distinct from encrypted, accepted MiraSettings. */
export type MiraSettingsDrafts = {
  key: string;
  model: string;
  budget: string;
  prompt: string;
  promptModality: string;
};

export type MiraProviderView = Readonly<{
  runtime: LocalRuntimeStatus;
  localChoices: readonly LocalModelChoice[];
  modelProgress: string;
  connectingOpenRouter: boolean;
  sending: boolean;
  models: readonly ZdrModel[];
  loadingModels: boolean;
  modelsChecked: boolean;
}>;

export type MiraUsageView = Readonly<{
  keyUsage: OpenRouterKeyUsage | null;
  usageCheckedAt: string | null;
  usageError: string;
  loadingUsage: boolean;
}>;

type Action = () => void | Promise<unknown>;
type ChoiceAction = (id: string) => void | Promise<unknown>;

/** Drawers dispatch the same actions as voice commands; they never open storage/providers. */
export type MiraSettingsActions = Readonly<{
  chooseModality: ChoiceAction;
  retryNativeRuntime: Action;
  chooseLocalModel: ChoiceAction;
  installLocalModel: ChoiceAction;
  connectOpenRouter: Action;
  disconnectOpenRouter: Action;
  keyEdited: Action;
  saveConnection: Action;
  refreshModels: Action;
  saveModelChoice: Action;
  toggleAutoSpeak: Action;
  refreshUsage: Action;
  saveBudget: Action;
  selectPromptModality: ChoiceAction;
  savePrompt: Action;
  restorePrompt: Action;
}>;

export type MiraSessionsActions = Readonly<{
  newSession: Action;
  activate: ChoiceAction;
  renameSession: (session: Session) => void | Promise<unknown>;
  deleteSession: (session: Session) => void | Promise<unknown>;
  exportSessions: Action;
  importSessions: Action;
}>;
