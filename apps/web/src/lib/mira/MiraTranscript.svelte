<script lang="ts">
  import { RotateCcw, Square, Volume2 } from '@lucide/svelte';
  import type { Message } from '@patternverse/companion-core';

  let {
    messages,
    pending,
    streamingText,
    retryAvailable,
    voiceEnabled,
    speakingId,
    onToggleSpeech,
    onRetry,
  }: {
    messages: readonly Message[];
    pending: boolean;
    streamingText: string;
    retryAvailable: boolean;
    voiceEnabled: boolean;
    speakingId: string | null;
    onToggleSpeech: (id: string, text: string) => void;
    onRetry: () => void;
  } = $props();
</script>

<div class="mira-messages" aria-live="polite">
  {#if messages.length === 0}<p class="mira-chat-welcome">What would you like to explore?</p>{/if}
  {#each messages as message (message.id)}<article class:from-user={message.role === 'user'}>
      <p class="mira-message-role">{message.role === 'user' ? 'You' : 'mira'}</p>
      <p>{message.text}</p>
      {#if message.patternMentions?.length}
        <div class="mira-message-patterns" aria-label="Mentioned patterns">
          {#each message.patternMentions as pattern (`${pattern.sourceId}:${pattern.entityId}`)}
            <span>@ {pattern.title}</span>
          {/each}
        </div>
      {/if}
      {#if voiceEnabled && message.role === 'assistant'}<button
          type="button"
          class="mira-speak-button"
          aria-label={speakingId === message.id ? 'Stop spoken reply' : 'Play spoken reply'}
          title={speakingId === message.id ? 'Stop reading' : 'Read aloud'}
          onclick={() => onToggleSpeech(message.id, message.text)}
          >{#if speakingId === message.id}<Square size={16} />{:else}<Volume2
              size={17}
            />{/if}</button
        >{/if}
    </article>{/each}
  {#if pending}
    {#if streamingText}<article class="mira-streaming-reply">
        <p class="mira-message-role">mira</p>
        <p>
          {streamingText}<span class="mira-stream-cursor" aria-hidden="true"></span>
        </p>
      </article>{:else}<div
        class="mira-thinking"
        role="status"
        aria-label="mira is preparing a reply"
      >
        <span></span><span></span><span></span>
      </div>{/if}
  {/if}
  {#if retryAvailable}
    <div class="mira-retry-reply">
      <span>No reply yet.</span>
      <button type="button" onclick={onRetry}>
        <RotateCcw size={15} /> Retry reply
      </button>
    </div>
  {/if}
</div>

<style>
  .mira-message-patterns {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.5rem;
  }
  .mira-message-patterns span {
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    background: #e9f2ec;
    color: #293b30;
    font-size: 0.8rem;
    overflow-wrap: anywhere;
  }
</style>
