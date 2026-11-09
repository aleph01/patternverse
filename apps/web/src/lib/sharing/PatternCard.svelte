<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- Article links use the canonical public origin, including in desktop and third-party frames. */
  import { resolve } from '$app/paths';
  import { Share2 } from '@lucide/svelte';
  import type { PatternShare } from './types';
  import { patternShareUrl } from './types';
  let { share }: { share: PatternShare } = $props();
  const first = $derived(share.practices[0]);
</script>

<section class="pattern-card" aria-label={share.pattern.title}>
  <div class="brand-row">
    <span class="brand">patternverse</span><span class="category">{share.pattern.category}</span>
  </div>
  <h1>{share.pattern.title}</h1>
  {#if share.pattern.summary}<p class="description">{share.pattern.summary}</p>{/if}
  {#if share.pattern.usefulWhen}<div class="context">
      <h2>Useful when</h2>
      <p>{share.pattern.usefulWhen}</p>
    </div>{/if}
  <div class="actions">
    <a href={patternShareUrl(share.pattern.id)} target="_blank" rel="noopener noreferrer"
      >Read pattern <span aria-hidden="true">→</span></a
    >
    {#if first}<a
        class="primary"
        href={resolve('/embed/[mode]/[type=embedType]/[id]', {
          mode: 'practice',
          type: first.type,
          id: first.id,
        })}>Try practice <span aria-hidden="true">→</span></a
      >{/if}
  </div>
  <div class="attribution-row">
    <p class="attribution">From Patternverse Commons</p>
    <a
      class="share"
      href={`${patternShareUrl(share.pattern.id)}?share=1`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Share this pattern"><Share2 size={14} aria-hidden="true" /></a
    >
  </div>
</section>

<style>
  .pattern-card {
    color: #181814;
    background: #fff;
    border: 1.5px solid #181814;
    border-radius: 10px;
    padding: 24px;
    overflow-wrap: anywhere;
  }
  .brand-row,
  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .brand {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.04em;
  }
  .category {
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #007a4d;
  }
  h1 {
    font-size: clamp(22px, 5vw, 30px);
    line-height: 1.15;
    letter-spacing: -0.04em;
    margin: 24px 0 12px;
  }
  .description,
  .context p {
    font-size: 14px;
    line-height: 1.55;
    margin: 0;
  }
  .description {
    color: #62655f;
  }
  .context {
    margin-top: 20px;
  }
  h2 {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #62655f;
    margin: 0 0 6px;
  }
  .actions {
    border-top: 1px solid #dedfd9;
    margin-top: 24px;
    padding-top: 14px;
  }
  a {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    color: #007a4d;
    font-size: 13px;
    font-weight: 750;
  }
  a:hover {
    text-decoration: underline;
  }
  .primary {
    background: #007a4d;
    color: #fff;
    padding: 0 16px;
    border-radius: 6px;
  }
  .primary:hover {
    background: #005c3a;
  }
  .attribution {
    margin: 8px 0 0;
    color: #62655f;
    font-size: 11px;
  }
  .attribution-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .share {
    min-height: 32px;
    min-width: 32px;
    justify-content: center;
    color: #62655f;
  }
  @media (max-width: 380px) {
    .pattern-card {
      padding: 18px;
    }
  }
</style>
