<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- patternUrl is a canonical public URL supplied by the embed page. */
  import type { SharedPractice } from './types';
  import { onMount } from 'svelte';
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });
  let {
    practice,
    patternUrl,
    onstart,
  }: { practice: SharedPractice; patternUrl: string; onstart: () => void } = $props();
</script>

<section class="practice-welcome" aria-label={practice.title}>
  <div class="brand-row">
    <span class="brand">patternverse</span><span class="eyebrow">Self-guided practice</span>
  </div>
  <h1>{practice.title}</h1>
  {#if practice.summary}<p class="summary">{practice.summary}</p>{/if}
  <div class="invitation">
    <h2>A moment for your situation</h2>
    <p>
      Work through the questions at your own pace.{#if practice.durationMinutes}
        About {practice.durationMinutes} minutes.{/if}
    </p>
  </div>
  <p class="privacy">
    Your answers stay in this view and are discarded when you close or reload it.
  </p>
  <div class="actions">
    <a href={patternUrl} target="_blank" rel="noopener noreferrer">Read the pattern ↗</a><button
      type="button"
      disabled={!ready}
      onclick={onstart}>Start practice <span aria-hidden="true">→</span></button
    >
  </div>
</section>

<style>
  .practice-welcome {
    padding: 24px;
    border: 1px solid #c9cdc7;
    border-radius: 10px;
    background: #fff;
    color: #181814;
    overflow-wrap: anywhere;
  }
  .brand-row,
  .actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .brand {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.04em;
  }
  .eyebrow {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #62655f;
    font-weight: 700;
  }
  h1 {
    margin: 24px 0 12px;
    font-size: clamp(24px, 5vw, 30px);
    letter-spacing: -0.04em;
    line-height: 1.15;
  }
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
  }
  .summary,
  .privacy {
    color: #62655f;
  }
  .invitation {
    padding: 16px;
    margin: 20px 0 14px;
    border-radius: 6px;
    background: #dff8ea;
  }
  h2 {
    margin: 0 0 6px;
    font-size: 14px;
  }
  .privacy {
    font-size: 12px;
  }
  .actions {
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px solid #dedfd9;
  }
  a {
    color: #62655f;
    font-size: 12px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
  a:hover {
    text-decoration: underline;
  }
  button {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    border: 0;
    border-radius: 6px;
    padding: 0 16px;
    background: #007a4d;
    color: #fff;
    font-size: 13px;
    font-weight: 750;
    cursor: pointer;
  }
  button:hover {
    background: #005c3a;
  }
</style>
