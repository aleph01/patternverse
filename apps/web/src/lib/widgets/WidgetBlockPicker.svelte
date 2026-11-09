<script lang="ts">
  import { onMount } from 'svelte';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import type { WidgetRelease } from '@patternverse/workspace';
  let {
    source,
    oninsert,
    oncancel,
  }: { source: string; oninsert: (source: string) => Promise<boolean>; oncancel: () => void } =
    $props();
  let releases = $state<WidgetRelease[]>([]),
    selected = $state(''),
    exportName = $state(''),
    prompt = $state(''),
    result = $state('selection'),
    mappings = $state<Record<string, string>>({}),
    error = $state(''),
    busy = $state(false);
  const release = $derived(releases.find((r) => r.id === selected));
  const exports = $derived(
    Object.entries(release?.package.manifest.exports || {}).filter(([, e]) => e.kind === 'widget'),
  );
  const definition = $derived.by(() => {
    try {
      const row = release?.package.manifest.exports[exportName];
      return row
        ? (JSON.parse(release!.package.files[row.path]) as {
            inputs: Record<string, { type: string; default?: unknown; defaultFrom?: string }>;
            outputs: Record<string, { type: string }>;
          })
        : null;
    } catch {
      return null;
    }
  });
  onMount(() => {
    void (async () => {
      const w = await getLocalWorkspace(),
        all = await w.listWidgetReleases();
      const allowed = await Promise.all(all.map((r) => w.widgetEnabled(r.package.identity)));
      releases = all.filter((_, i) => allowed[i]);
      if (releases.length) {
        selected = releases[0].id;
        choose();
      }
    })().catch((c) => (error = String(c)));
  });
  function choose() {
    const r = releases.find((r) => r.id === selected);
    exportName =
      Object.entries(r?.package.manifest.exports || {}).find(([, e]) => e.kind === 'widget')?.[0] ||
      '';
    mappings = {};
  }
  async function insert() {
    busy = true;
    error = '';
    try {
      if (!release || !exportName || !/^[_a-zA-Z][\w-]*$/.test(result))
        throw Error('Choose a widget and a valid result name.');
      let alias = 'widget_ui',
        i = 1;
      while (new RegExp(`\\b${alias}\\b`).test(source)) alias = `widget_ui_${i++}`;
      const declaration = `:import "${release.reference}" as ${alias}\n`;
      const language = source.match(/^:language[^\r\n]*(?:\r?\n|$)/m);
      const offset = language ? language.index! + language[0].length : 0;
      let candidate = source.slice(0, offset) + declaration + source.slice(offset);
      const parameters = Object.entries(mappings)
        .filter(([, expression]) => expression.trim())
        .map(([name, expression]) => `  :with ${name} = ${expression.trim()}\n`)
        .join('');
      const block = `\n${result} = !widget ${alias}.${exportName} {\n${parameters}${prompt
        .split('\n')
        .map((line) => '  ' + line)
        .join('\n')}\n}\n`;
      const end = [...candidate.matchAll(/^\s*->\s*end\s*$/gm)].at(-1);
      candidate = end
        ? candidate.slice(0, end.index) + block + candidate.slice(end.index)
        : candidate + block;
      if (await oninsert(candidate)) oncancel();
    } catch (c) {
      error = c instanceof Error ? c.message : 'Could not insert widget.';
    } finally {
      busy = false;
    }
  }
</script>

<section class="widget-picker" aria-label="Insert widget">
  <h4>Insert widget</h4>
  {#if error}<p role="alert">{error}</p>{/if}
  {#if !releases.length}<p>
      Create and release an enabled widget in My Workspace → Widgets first.
    </p>{:else}
    <label
      >Widget<select bind:value={selected} onchange={choose}
        >{#each releases as row (row.id)}<option value={row.id}
            >{row.name} · {row.package.manifest.version}</option
          >{/each}</select
      ></label
    >
    <label
      >Export<select bind:value={exportName}
        >{#each exports as [name] (name)}<option value={name}>{name}</option>{/each}</select
      ></label
    >
    <label
      >Prompt<textarea bind:value={prompt} placeholder="What would you like the participant to do?"
      ></textarea></label
    >
    {#if definition}<h5>Inputs</h5>
      {#each Object.entries(definition.inputs) as [name, field] (name)}<label
          >{name} · {field.type}<input
            bind:value={mappings[name]}
            placeholder={field.default !== undefined || field.defaultFrom
              ? 'Use widget default'
              : 'Required Pattern Language expression'}
          /></label
        >{/each}
      <p>
        Use a literal or an earlier binding. For example: <code>"simple"</code>, <code>3</code>, or
        <code>situation</code>.
      </p>{/if}
    <label>Save result as<input bind:value={result} /></label>{#if definition}<p>
        Later steps can use {Object.keys(definition.outputs)
          .map((name) => `${result}.${name}`)
          .join(', ')}.
      </p>{/if}
  {/if}
  <div class="actions">
    <button type="button" disabled={busy || !release} onclick={insert}>Insert widget</button><button
      type="button"
      onclick={oncancel}>Cancel</button
    >
  </div>
</section>

<style>
  .widget-picker {
    border: 1px solid var(--block-line, #dbe1d7);
    border-radius: 6px;
    padding: 14px;
    margin-top: 12px;
  }
  h4,
  h5 {
    margin: 0 0 12px;
  }
  label {
    display: grid;
    gap: 6px;
    margin: 12px 0;
    font-size: 12px;
  }
  input,
  select,
  textarea,
  button {
    font: inherit;
    font-size: 13px;
    min-width: 0;
    padding: 9px;
    border: 1px solid var(--block-line, #dbe1d7);
    border-radius: 4px;
    background: var(--paper, #fff);
    color: var(--ink, #233329);
  }
  textarea {
    min-height: 80px;
  }
  button {
    cursor: pointer;
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  p {
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  [role='alert'] {
    color: #a03226;
  }
</style>
