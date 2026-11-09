<script lang="ts">
  import { base } from '$app/paths';
  import { onMount, tick, untrack } from 'svelte';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import { plain, validateWidgetOutput, type WidgetInteraction } from './library';
  import { widgetDocument } from './document';
  import { isBundledWidget } from './bundled';
  let {
    interaction,
    preview = false,
    disabled = false,
    initialDraft = null,
    confirmLabel = undefined,
    onchange = () => {},
    onconfirm,
  }: {
    interaction: WidgetInteraction;
    preview?: boolean;
    disabled?: boolean;
    initialDraft?: unknown;
    confirmLabel?: string;
    onchange?: (draft: unknown) => void;
    onconfirm: (outputs: unknown) => void | Promise<unknown>;
  } = $props();
  let frame = $state<HTMLIFrameElement>();
  let draft = $state<unknown>(untrack(() => initialDraft));
  let valid = $state(false);
  let validating = $state(false);
  let error = $state('');
  let fallback = $state(false);
  let permitted = $state(false);
  let height = $state(360);
  let mounted = $state(false);
  const fallbackSpec = $derived(interaction.definition.fallback);
  const options = $derived(
    (fallbackSpec ? plain(interaction.inputs[fallbackSpec.input]) : []) as {
      value: string;
      label: string;
    }[],
  );
  const chosen = $derived(
    (draft && typeof draft === 'object' && fallbackSpec
      ? ((draft as Record<string, unknown>)[fallbackSpec.output] ?? [])
      : []) as { value: string; label: string }[],
  );
  let generation = 0,
    validation = 0;
  let confirming = $state(false);
  async function update(outputs: unknown) {
    const sequence = ++validation,
      token = generation;
    draft = outputs;
    validating = true;
    valid = false;
    onchange(outputs);
    try {
      const normalized = await validateWidgetOutput(interaction, outputs);
      if (sequence !== validation || token !== generation)
        return { valid: false, errors: ['A newer draft exists.'] };
      valid = true;
      error = '';
      return { valid: true, errors: [], value: plain(normalized) };
    } catch (cause) {
      if (sequence === validation && token === generation)
        error = cause instanceof Error ? cause.message : 'Invalid widget answer.';
      return { valid: false, errors: [error] };
    } finally {
      if (sequence === validation) validating = false;
    }
  }
  function select(value: string, checked: boolean) {
    if (!fallbackSpec) return;
    const ids = chosen.map((c) => c.value);
    const selected = checked ? [...ids, value] : ids.filter((id) => id !== value);
    void update({ [fallbackSpec.output]: options.filter((o) => selected.includes(o.value)) });
  }
  async function confirm() {
    if (disabled || confirming || validating || !valid) return;
    confirming = true;
    try {
      await onconfirm(JSON.parse(JSON.stringify(draft)));
      await tick();
    } finally {
      confirming = false;
    }
  }
  async function useFallback() {
    fallback = true;
    error = '';
    await tick();
    if (fallbackSpec) await update(draft ?? { [fallbackSpec.output]: [] });
  }
  onMount(() => {
    mounted = true;
    return () => {
      generation++;
      validation++;
    };
  });
  $effect(() => {
    if (!mounted) return;
    const item = interaction;
    const stopped = disabled || fallback;
    const token = ++generation;
    let channel: MessageChannel | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let listener: ((event: MessageEvent) => void) | undefined;
    let alive = true;
    const cleanup = () => {
      alive = false;
      if (timer) clearTimeout(timer);
      if (listener) window.removeEventListener('message', listener);
      channel?.port1.close();
      channel?.port2.close();
    };
    if (stopped) return cleanup;
    void (async () => {
      const allowed =
        preview ||
        isBundledWidget(item.package) ||
        (await (await getLocalWorkspace()).widgetEnabled(item.package.identity));
      if (!alive || token !== generation) return;
      permitted = allowed;
      await tick();
      if (!alive || token !== generation) return;
      if (!allowed) {
        error = 'This widget is disabled or no longer installed. Use its fallback to continue.';
        return;
      }
      try {
        const source = widgetDocument(item.package, item.export);
        channel = new MessageChannel();
        const port = channel.port1;
        let sent = false;
        let latest = 0;
        let messages = 0;
        let windowStart = Date.now();
        port.onmessage = async (event) => {
          if (!alive || token !== generation || disabled || confirming) return;
          const now = Date.now();
          if (now - windowStart > 1000) {
            windowStart = now;
            messages = 0;
          }
          if (++messages > 60) {
            valid = false;
            error = 'The widget sent too many updates. Use the fallback or restart the step.';
            cleanup();
            return;
          }
          const m = event.data;
          if (!m || typeof m !== 'object') return;
          if (m.type === 'ready') {
            if (timer) clearTimeout(timer);
            return;
          }
          if (m.type === 'size' && Number.isFinite(m.height)) {
            height = Math.max(120, Math.min(1600, Math.ceil(m.height)));
            return;
          }
          if (m.type === 'error') {
            valid = false;
            error = 'The widget could not run. Use the fallback or restart the step.';
            return;
          }
          if (m.type !== 'draft' || !Number.isSafeInteger(m.id) || m.id <= latest) return;
          let size;
          try {
            size = JSON.stringify(m).length;
          } catch {
            valid = false;
            error = 'The widget answer must be JSON.';
            return;
          }
          if (size > 131072) {
            valid = false;
            error = 'The widget answer is too large.';
            return;
          }
          latest = m.id;
          const result = await update(m.outputs);
          if (alive && token === generation)
            port.postMessage({
              type: 'validation',
              id: m.id,
              result: { valid: result.valid, errors: result.errors },
            });
        };
        port.start();
        listener = (event) => {
          if (
            !alive ||
            event.source !== frame?.contentWindow ||
            event.origin !== location.origin ||
            !['widget-host-ready', 'widget-host-error'].includes(event.data?.type)
          )
            return;
          if (event.data?.type === 'widget-host-error') {
            valid = false;
            error =
              'The widget stopped after an unsupported navigation. Use the fallback or restart the step.';
            cleanup();
            return;
          }
          if (event.data?.type !== 'widget-host-ready' || !channel || sent) return;
          sent = true;
          frame.contentWindow!.postMessage(
            JSON.parse(
              JSON.stringify({
                type: 'widget-mount',
                source,
                title: item.definition.name,
                api: {
                  inputs: Object.fromEntries(
                    Object.entries(item.inputs).map(([k, v]) => [k, plain(v)]),
                  ),
                  presentation: item.presentation,
                  prompt: item.prompt,
                  draft,
                  appearance: {
                    colorScheme: matchMedia('(prefers-color-scheme: dark)').matches
                      ? 'dark'
                      : 'light',
                    fontScale: 1,
                    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
                  },
                },
              }),
            ),
            location.origin,
            [channel!.port2],
          );
        };
        window.addEventListener('message', listener);
        timer = setTimeout(() => {
          if (alive) error = 'The widget did not start. Use the fallback or restart the step.';
        }, 5000);
        // Unique navigation starts the trusted document only after the parent is listening.
        if (frame) frame.src = `${base}/practice-widget-host.htm#${crypto.randomUUID()}`;
      } catch (cause) {
        error = cause instanceof Error ? cause.message : 'Widget could not start.';
      }
    })();
    return cleanup;
  });
</script>

<div class="widget-step">
  {#if permitted && !fallback && !disabled}<iframe
      bind:this={frame}
      title={interaction.definition.name}
      style:height={`${height}px`}
      allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; clipboard-read 'none'; clipboard-write 'none'"
      referrerpolicy="no-referrer"
    ></iframe>{/if}
  {#if error}<p class="widget-error" role="status">{error}</p>{/if}
  {#if fallbackSpec && !fallback}<button
      type="button"
      class="widget-secondary"
      {disabled}
      onclick={useFallback}>Use a plain checklist</button
    >{/if}
  {#if fallback && fallbackSpec}<fieldset {disabled}>
      <legend>{interaction.prompt || interaction.definition.name}</legend
      >{#each options as option (option.value)}<label
          ><input
            type="checkbox"
            checked={chosen.some((c) => c.value === option.value)}
            onchange={(event) => select(option.value, event.currentTarget.checked)}
          />{option.label}</label
        >{/each}
    </fieldset>{/if}
  {#if !permitted && !fallbackSpec}<p>
      This interaction is unavailable. Enable its widget in the Widgets tab to continue.
    </p>{/if}
  <div class="widget-controls">
    <button
      type="button"
      class="widget-primary"
      disabled={disabled || confirming || validating || !valid}
      onclick={confirm}>{confirmLabel ?? (preview ? 'Confirm example' : 'Continue')} →</button
    >
  </div>
</div>

<style>
  .widget-step {
    min-width: 0;
  }
  iframe {
    display: block;
    width: 100%;
    border: 0;
    background: transparent;
    max-height: 1600px;
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 12px 0;
    display: grid;
    gap: 10px;
  }
  legend {
    font-weight: 600;
    margin-bottom: 12px;
  }
  label {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 14px;
  }
  input {
    accent-color: var(--green-dark, #28654e);
  }
  button {
    font: inherit;
    font-size: 13px;
    padding: 10px 14px;
    border-radius: 7px;
    cursor: pointer;
  }
  .widget-primary {
    background: var(--ink, #203129);
    color: var(--paper, #fff);
    border: 0;
  }
  .widget-primary:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .widget-secondary {
    background: transparent;
    color: var(--ink, #203129);
    border: 1px solid var(--line, #d9e0dc);
    margin-top: 12px;
  }
  .widget-controls {
    display: flex;
    justify-content: flex-end;
    margin-top: 18px;
  }
  .widget-error {
    font-size: 13px;
    color: var(--muted, #66736c);
  }
</style>
