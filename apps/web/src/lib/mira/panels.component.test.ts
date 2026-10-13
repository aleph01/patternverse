// @vitest-environment jsdom
import { createRawSnippet } from 'svelte';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSession } from '@patternverse/companion-core';
import MiraSettingsPanel from './MiraSettingsPanel.svelte';
import type { MiraSettingsActions, MiraProviderView } from './panels';

afterEach(cleanup);
function fixture() {
  const actions = {
    chooseModality: vi.fn(),
    retryNativeRuntime: vi.fn(),
    chooseLocalModel: vi.fn(),
    installLocalModel: vi.fn(),
    connectOpenRouter: vi.fn(),
    disconnectOpenRouter: vi.fn(),
    keyEdited: vi.fn(),
    saveConnection: vi.fn(),
    refreshModels: vi.fn(),
    saveModelChoice: vi.fn(),
    toggleAutoSpeak: vi.fn(),
    refreshUsage: vi.fn(),
    saveBudget: vi.fn(),
    selectPromptModality: vi.fn(),
    savePrompt: vi.fn(),
    restorePrompt: vi.fn(),
  } satisfies MiraSettingsActions;
  const provider: MiraProviderView = {
    runtime: { status: 'ready' },
    localChoices: [
      {
        id: 'installed',
        title: 'Installed model',
        summary: 'Local',
        installed: true,
        canInstall: false,
        recommended: true,
        downloadBytes: 1,
      },
      {
        id: 'download',
        title: 'Downloadable model',
        summary: 'Local',
        installed: false,
        canInstall: true,
        recommended: false,
        downloadBytes: 1,
      },
    ],
    modelProgress: '',
    connectingOpenRouter: false,
    sending: false,
    models: [],
    loadingModels: false,
    modelsChecked: false,
  };
  return {
    actions,
    props: {
      active: createSession('one', 'cbt', new Date().toISOString()),
      desktop: false,
      settings: {
        model: 'installed',
        openRouterKey: 'synthetic-key',
        promptOverrides: {},
        activeSessionId: 'one',
        monthlyBudgetUsd: 5,
      },
      features: {
        voice: true,
        guidedExercises: true,
        standalonePatterns: true,
        advancedModels: true,
        dropboxSync: false,
      },
      provider,
      usage: { keyUsage: null, usageCheckedAt: null, usageError: '', loadingUsage: false },
      drafts: {
        key: 'draft-key',
        model: 'installed',
        budget: '5',
        prompt: 'Private draft',
        promptModality: 'cbt',
      },
      actions,
      error: '',
      notice: '',
      feedback: createRawSnippet(() => ({ render: () => '<span>Voice feedback</span>' })),
      onClose: vi.fn(),
    },
  };
}

describe('Mira drawer presentation boundary', () => {
  it('dispatches native model actions instead of accessing a runtime or storage', async () => {
    const test = fixture();
    render(MiraSettingsPanel, { ...test.props, desktop: true });
    expect(screen.queryByRole('heading', { name: 'OpenRouter costs' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Connect with OpenRouter' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Selected' }));
    expect(test.actions.chooseLocalModel).toHaveBeenCalledWith('installed');
    await fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(test.actions.installLocalModel).toHaveBeenCalledWith('download');
    await fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    expect(test.props.onClose).toHaveBeenCalledTimes(1);
  });

  it('updates native download state without replacing user prompt drafts', async () => {
    const test = fixture();
    const view = render(MiraSettingsPanel, { ...test.props, desktop: true });
    await fireEvent.input(screen.getByLabelText('Guidance'), { target: { value: 'Keep writing' } });
    await view.rerender({
      ...test.props,
      desktop: true,
      provider: { ...test.props.provider, modelProgress: 'Downloading local model · 50%' },
    });
    expect((screen.getByRole('button', { name: 'Download' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByLabelText('Guidance') as HTMLTextAreaElement).value).toBe('Keep writing');
    expect(test.actions.savePrompt).not.toHaveBeenCalled();
  });

  it('shows retry for unavailable local engines and respects release voice flags', async () => {
    const test = fixture();
    render(MiraSettingsPanel, {
      ...test.props,
      desktop: true,
      features: { ...test.props.features, voice: false },
      provider: { ...test.props.provider, runtime: { status: 'unavailable' } },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Retry local runtime' }));
    expect(test.actions.retryNativeRuntime).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Read new replies aloud automatically')).toBeNull();
  });

  it('keeps current-session modality selection separate from prompt editing', async () => {
    const test = fixture();
    render(MiraSettingsPanel, test.props);
    await fireEvent.change(screen.getByLabelText('Current session modality'), {
      target: { value: 'dbt' },
    });
    expect(test.actions.chooseModality).toHaveBeenCalledWith('dbt');
    expect(test.actions.selectPromptModality).not.toHaveBeenCalled();
    await fireEvent.change(screen.getByLabelText('Prompt to edit'), { target: { value: 'narm' } });
    expect(test.actions.selectPromptModality).toHaveBeenCalledWith('narm');
    expect(test.actions.chooseModality).toHaveBeenCalledTimes(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Save prompt' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Restore default' }));
    expect(test.actions.savePrompt).toHaveBeenCalledTimes(1);
    expect(test.actions.restorePrompt).toHaveBeenCalledTimes(1);
  });

  it('keeps provider controls disabled during replies and invalidates key price discovery', async () => {
    const test = fixture();
    render(MiraSettingsPanel, {
      ...test.props,
      provider: { ...test.props.provider, sending: true },
    });
    expect(
      (screen.getByRole('button', { name: 'Reconnect with OpenRouter' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect((screen.getByRole('button', { name: 'Disconnect' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(
      (screen.getByRole('button', { name: 'Save model choice' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    await fireEvent.input(screen.getByLabelText('OpenRouter API key'), {
      target: { value: 'new synthetic key' },
    });
    expect(test.props.drafts.key).toBe('new synthetic key');
    expect(test.actions.keyEdited).toHaveBeenCalledTimes(1);
    expect(test.actions.saveConnection).not.toHaveBeenCalled();
  });
});
