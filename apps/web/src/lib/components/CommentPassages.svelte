<script lang="ts">
  import { X } from '@lucide/svelte';
  import { commentAnchors, anchorKey, type ContributionComment } from '$lib/contributions/model';

  let {
    comment,
    onremove,
    full = false,
  }: {
    comment: ContributionComment;
    onremove?: (index: number) => void;
    full?: boolean;
  } = $props();
  const anchors = $derived(commentAnchors(comment));
</script>

<div class="comment-passages" class:compact={!full} aria-label="Attached passages">
  {#each anchors as anchor, i (anchorKey(anchor))}
    <div class="comment-passage">
      <div class="passage-heading">
        <span>{anchors.length > 1 ? `${i + 1}. ` : ''}{anchor.sectionTitle || 'Whole article'}</span
        >
        {#if onremove && anchor.blockId}
          <button
            type="button"
            onclick={() => onremove?.(i)}
            aria-label={`Remove passage ${i + 1}`}
          >
            <X size={14} />
          </button>
        {/if}
      </div>
      {#if anchor.quote}
        <blockquote>{anchor.quote}</blockquote>
      {:else if anchor.text}
        {#if full}<details>
            <summary>Original passage</summary>
            <p>{anchor.text}</p>
          </details>
        {:else}<blockquote>{anchor.text}</blockquote>{/if}
      {/if}
    </div>
  {/each}
</div>

<style>
  .comment-passages {
    display: grid;
    gap: 10px;
    margin: 10px 0;
  }
  .compact {
    max-height: 190px;
    overflow-y: auto;
  }
  .passage-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: var(--muted);
    font-size: 11px;
  }
  button {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    color: var(--muted);
    border: 0;
    border-radius: 4px;
    cursor: pointer;
  }
  button:hover {
    color: var(--ink);
    background: #1818140c;
  }
  blockquote {
    border-left: 2px solid var(--contribution-border);
    padding-left: 11px;
    margin: 5px 0 0;
    font:
      400 14px/1.6 Georgia,
      serif;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
  .compact blockquote {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
  }
  details {
    margin-top: 6px;
    font-size: 13px;
  }
  p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  @media (pointer: coarse) {
    button {
      min-width: 36px;
      min-height: 36px;
    }
  }
</style>
