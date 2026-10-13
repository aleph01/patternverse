<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Session } from '@patternverse/companion-core';
  import { resolve } from '$app/paths';
  import LegalLinks from '$lib/legal/LegalLinks.svelte';
  import type { ReleaseFeatures } from '$lib/release-features';
  import { MODALITIES } from './modalities';
  import type { MiraSettings } from './private-store';
  import type {
    MiraSettingsDrafts,
    MiraProviderView,
    MiraUsageView,
    MiraSettingsActions,
  } from './panels';
  import { formatUsd, isCurrentUtcMonth } from './cost-format';
  import MiraPanel from './MiraPanel.svelte';
  import ModelChoices from './ModelChoices.svelte';

  let {
    active,
    desktop,
    settings,
    features,
    provider,
    usage,
    drafts = $bindable(),
    actions,
    error,
    notice,
    feedback,
    onClose,
  }: {
    active: Session | null;
    desktop: boolean;
    settings: MiraSettings;
    features: ReleaseFeatures;
    provider: MiraProviderView;
    usage: MiraUsageView;
    drafts: MiraSettingsDrafts;
    actions: MiraSettingsActions;
    error: string;
    notice: string;
    feedback: Snippet;
    onClose: () => void;
  } = $props();
  const {
    runtime,
    localChoices,
    modelProgress,
    connectingOpenRouter,
    sending,
    models,
    loadingModels,
    modelsChecked,
  } = $derived(provider);
  const { keyUsage, usageCheckedAt, usageError, loadingUsage } = $derived(usage);
</script>

<MiraPanel
  heading="Settings"
  headingId="mira-settings-heading"
  closeLabel="Close settings"
  settings
  {error}
  {notice}
  {feedback}
  {onClose}
>
  {#if active}
    <div class="mira-session-modality-setting">
      <label for="mira-active-modality">Current session modality</label>
      <select
        id="mira-active-modality"
        value={active.modalityId}
        onchange={(event) => actions.chooseModality(event.currentTarget.value)}
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
          Conversations run in this app’s local model process. No cloud fallback is used. Download a
          model once, then choose it here.
        </p>
        {#if runtime.status !== 'ready'}<p role="status">
            Local runtime: {runtime.status}{runtime.detailCode ? ` · ${runtime.detailCode}` : ''}
          </p>{/if}
        {#if runtime.status === 'unavailable' || runtime.status === 'stopped'}<button
            type="button"
            onclick={actions.retryNativeRuntime}>Retry local runtime</button
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
                onclick={() => actions.chooseLocalModel(choice.id)}
                >{settings.model === choice.id ? 'Selected' : 'Use model'}</button
              >
            {:else}
              <button
                type="button"
                disabled={!choice.canInstall || Boolean(modelProgress)}
                onclick={() => actions.installLocalModel(choice.id)}>Download</button
              >
            {/if}
          </div>
        {/each}
        {#if modelProgress}<p role="status">{modelProgress}</p>{/if}
        {#if localChoices.length === 0}<p>Preparing local model choices…</p>{/if}
      {:else}
        <h3 id="mira-provider-heading">AI connection</h3>
        <p>
          Messages are encrypted on this device. Sending a message shares its recent context with
          your chosen OpenRouter model for processing. Zero-data-retention routing is required; it
          is not fully local AI.
        </p>
        <p>
          Choose a balance of cost and capability. Balanced is the starting choice for new
          connections; your existing model stays selected until you change it.
        </p>
        <p>
          {settings.openRouterKey
            ? 'OpenRouter connected on this device.'
            : 'Sign in to OpenRouter to connect—no API key to copy or paste.'}
        </p>
        <button
          type="button"
          class="mira-primary"
          onclick={actions.connectOpenRouter}
          disabled={connectingOpenRouter || sending}
          >{connectingOpenRouter
            ? 'Opening OpenRouter…'
            : settings.openRouterKey
              ? 'Reconnect with OpenRouter'
              : 'Connect with OpenRouter'}</button
        >
        {#if settings.openRouterKey}<button
            type="button"
            onclick={actions.disconnectOpenRouter}
            disabled={sending}>Disconnect</button
          >{/if}
        <p>
          You use your own OpenRouter account and credits. The connection is saved encrypted on this
          device.
        </p>
        <details>
          <summary>Advanced · enter an API key manually</summary>
          <label for="mira-key">OpenRouter API key</label><input
            id="mira-key"
            type="password"
            bind:value={drafts.key}
            oninput={actions.keyEdited}
            autocomplete="off"
            spellcheck="false"
          />
          <button
            type="button"
            onclick={actions.saveConnection}
            disabled={!drafts.key.trim() || sending}>Save API key</button
          >
        </details>
        <button
          type="button"
          onclick={actions.refreshModels}
          disabled={loadingModels || !drafts.key.trim()}
          >{loadingModels ? 'Checking models…' : 'Check availability & prices'}</button
        >
        <ModelChoices {models} checked={modelsChecked} bind:selected={drafts.model} />
        {#if features.advancedModels}<details>
            <summary>Advanced · choose any model</summary>
            <p>Current model: {drafts.model}</p>
            <label for="mira-model">Model</label>
            {#if models.length > 0}
              <select id="mira-model" bind:value={drafts.model}
                >{#if drafts.model !== 'openrouter/auto' && !models.some((model) => model.id === drafts.model)}<option
                    value={drafts.model}>{drafts.model} · current selection</option
                  >{/if}<option value="openrouter/auto">Automatic · zero-retention required</option
                >{#each models as model (model.id)}<option value={model.id}
                    >{model.name} · {model.id}</option
                  >{/each}</select
              >
            {:else}<input
                id="mira-model"
                bind:value={drafts.model}
                placeholder="Model ID"
                spellcheck="false"
              />{/if}
          </details>{/if}
        <button
          type="button"
          class="mira-primary"
          onclick={actions.saveModelChoice}
          disabled={!settings.openRouterKey || sending}>Save model choice</button
        >
      {/if}
      {#if features.voice}<label class="mira-speech-preference">
          <input
            type="checkbox"
            checked={settings.autoSpeak ?? false}
            onchange={actions.toggleAutoSpeak}
          />
          <span>Read new replies aloud automatically</span>
        </label>
        <p class="mira-speech-note">
          Spoken replies use the voices available in your browser or device.
        </p>
        <details class="mira-speech-note">
          <summary>Voice control</summary>
          <p>
            The waveform button starts hands-free control; the microphone still only dictates. Speak
            a message, pause, then say “send”. Try “open patterns”, “search for reframing”, “choose
            the first one”, then “start”. Say “choose therapy approach”, “read the last reply”, or
            “stop listening”.
          </p>
          <p>
            Listening pauses during readback and resumes afterward, to prevent the reply becoming a
            command. It stops when the app goes into the background.
          </p>
          <p>
            {desktop
              ? 'Audio is transcribed by the local Whisper engine. Unclear commands use your selected local model.'
              : 'Speech recognition uses your browser’s speech service, which may process audio remotely. Its policy is separate from OpenRouter ZDR. Unclear commands and visible menu labels go to your selected OpenRouter model with ZDR required; this uses API credits.'}
            Feedback stays on screen.
          </p>
        </details>{/if}
    </section>
    {#if !desktop}
      <section class="mira-cost-overview" aria-labelledby="mira-cost-heading">
        <h3 id="mira-cost-heading">OpenRouter costs</h3>
        <p>
          Reported spending for this connection, including use outside Mira. OpenRouter resets
          monthly usage at midnight UTC on the first of the month.
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
                {formatUsd(Math.max(settings.monthlyBudgetUsd - keyUsage.monthlyUsd, 0))} before your
                Mira warning threshold.
              </p>
              {#if keyUsage.monthlyUsd >= settings.monthlyBudgetUsd}<p
                  class="mira-budget-warning"
                  role="status"
                >
                  Monthly budget reached. Mira will warn you, but replies remain available.
                </p>{/if}
            {/if}
            {#if keyUsage.providerLimitUsd != null}<p>
                OpenRouter connection limit: {formatUsd(
                  keyUsage.providerLimitUsd,
                )}{keyUsage.providerLimitReset ? ` · resets ${keyUsage.providerLimitReset}` : ''}.
              </p>{/if}
            {#if usageCheckedAt}<p class="mira-cost-timestamp">
                Checked {new Date(usageCheckedAt).toLocaleString()}
              </p>{/if}
          {:else if !loadingUsage}<p>No current-month usage report available yet.</p>{/if}
          {#if usageError}<p class="mira-budget-warning" role="status">
              Could not refresh OpenRouter usage: {usageError}
            </p>{/if}
          <button type="button" onclick={actions.refreshUsage} disabled={loadingUsage}
            >{loadingUsage ? 'Checking usage…' : 'Refresh costs'}</button
          >
        {:else}<p>Connect with OpenRouter to see your reported spending.</p>{/if}
        <label for="mira-budget">Monthly warning threshold (USD)</label>
        <input
          id="mira-budget"
          type="number"
          min="0.01"
          max="1000000"
          step="0.01"
          inputmode="decimal"
          placeholder="No budget set"
          value={drafts.budget}
          oninput={(event) => (drafts.budget = event.currentTarget.value)}
        />
        <button type="button" onclick={actions.saveBudget}>Save budget</button>
        <p class="mira-cost-note">
          This warning threshold is saved on this device; it is not a spending cap. For an enforced
          limit across devices, manage your connection limit in OpenRouter.
        </p>
      </section>
    {/if}
    <section aria-labelledby="mira-prompt-heading">
      <h3 id="mira-prompt-heading">Therapy modalities</h3>
      <p>
        Each modality has an editable guidance prompt. The selected modality belongs to each session
        and can change during it.
      </p>
      <label for="mira-prompt-modality">Prompt to edit</label><select
        id="mira-prompt-modality"
        value={drafts.promptModality}
        onchange={(event) => actions.selectPromptModality(event.currentTarget.value)}
        >{#each MODALITIES as modality (modality.id)}<option value={modality.id}
            >{modality.name}</option
          >{/each}</select
      >
      <label for="mira-prompt-text">Guidance</label><textarea
        id="mira-prompt-text"
        bind:value={drafts.prompt}
        rows="14"
        maxlength="30000"></textarea>
      <div class="mira-settings-actions">
        <button type="button" class="mira-primary" onclick={actions.savePrompt}>Save prompt</button
        ><button type="button" onclick={actions.restorePrompt}>Restore default</button>
      </div>
    </section>
  </div>
  <p class="mira-guide-entry">
    <a href={resolve('/about/mira')}>About mira · features and privacy ↗</a>
  </p>
  <p class="mira-settings-safety">
    mira offers reflection, not therapy or emergency care. Browser dictation may use your device’s
    speech service.
  </p>
  <LegalLinks />
</MiraPanel>
