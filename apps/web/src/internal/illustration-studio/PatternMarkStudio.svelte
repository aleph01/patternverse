<script lang="ts">
  import { onMount } from 'svelte';
  import { downloadText as download } from '$lib/client/download';
  import PatternIcon from '$lib/illustrations/PatternIcon.svelte';
  import PatternMark from '$lib/illustrations/PatternMark.svelte';
  import { defaultPatternMark } from '$lib/illustrations/pattern-mark-presets';
  import {
    COMPOSITION_FAMILIES,
    generatePatternIcon,
    scorePatternIcon,
    type CompositionFamily,
  } from '$lib/illustrations/pattern-icons';
  import { QUARTER_CIRCLE_PATH, quarterTransform } from '$lib/illustrations/pattern-icon-svg';
  import {
    MAX_SAVED_MARKS,
    MAX_MARK_PROJECT_BYTES,
    isPatternMarkSpec,
    parseMarkProject,
    patternMarkSvg,
    similarSavedMarks,
    generatePatternMark,
    type PatternMarkSpec,
  } from '$lib/illustrations/pattern-marks';

  const storageKey = 'patternverse.personal-icons.v1';
  const sizes = [16, 24, 32, 48, 64, 96];
  const samples = Array.from({ length: 100 }, (_, i) => {
    const slug = `sample-pattern-${String(i + 1).padStart(3, '0')}`;
    return { slug, icon: generatePatternIcon(slug) };
  });
  const familySamples = COMPOSITION_FAMILIES.map((family) => ({
    ...family,
    icon: generatePatternIcon('family-example', { familyHint: family.id }),
  }));
  let draft = $state<PatternMarkSpec>(
    defaultPatternMark('creative-reframing', 'Creative Reframing'),
  );
  let saved = $state<readonly PatternMarkSpec[]>([]);
  let catalogue = $state<{ id: string; title: string }[]>([]);
  let token = $state('');
  let notice = $state('');
  let storageReady = $state(false);
  let busy = $state(false);
  let transparent = $state(true);
  let gallerySize = $state(48);
  let familyFilter = $state('');
  let darkPreview = $state(false);
  const valid = $derived(isPatternMarkSpec(draft));
  const previewIcon = $derived(valid ? generatePatternMark(draft) : null);
  const score = $derived(previewIcon ? scorePatternIcon(previewIcon) : null);
  const similar = $derived(valid ? similarSavedMarks(draft, saved) : []);
  const candidates = $derived(
    Array.from({ length: 6 }, (_, i) => ({
      ...draft,
      variation: (draft.variation + i + 1) % 1_000_000,
    })),
  );
  const visibleSamples = $derived(
    samples.filter((sample) => !familyFilter || sample.icon.family === familyFilter),
  );

  function edit(patch: Partial<PatternMarkSpec>) {
    draft = { ...draft, ...patch };
  }
  function choosePattern(id: string) {
    const entry = catalogue.find((p) => p.id === id);
    if (entry) draft = saved.find((s) => s.patternId === id) ?? defaultPatternMark(id, entry.title);
  }
  function project() {
    return { kind: 'patternverse-marks', version: 2, marks: saved, ...(valid ? { draft } : {}) };
  }
  function persist() {
    if (!storageReady) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(project()));
    } catch {
      notice = 'Browser storage is unavailable. Export your project to keep these icons.';
    }
  }
  function keep() {
    if (!valid) return;
    if (!saved.some((s) => s.patternId === draft.patternId) && saved.length >= MAX_SAVED_MARKS) {
      notice = 'This project already contains 200 icons.';
      return;
    }
    saved = [...saved.filter((s) => s.patternId !== draft.patternId), { ...draft }];
    persist();
    notice = 'Icon kept on this device. Export a backup, or apply it to the local library.';
  }
  async function importProject(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_MARK_PROJECT_BYTES) throw new Error('The project is too large.');
      const text = await file.text();
      // Explicit file import is the only migration path. Older browser storage is untouched.
      const legacy = JSON.parse(text)?.version === 1;
      const imported = parseMarkProject(text, true);
      const existing = new Set(saved.map((s) => s.patternId));
      const added = imported.marks.filter((s) => !existing.has(s.patternId));
      if (saved.length + added.length > MAX_SAVED_MARKS)
        throw new Error('The combined project exceeds 200 icons.');
      saved = [...saved, ...added];
      if (imported.draft) draft = imported.draft;
      storageReady = true;
      persist();
      notice = `Imported ${added.length} icons. Existing icons with matching IDs were kept.${legacy ? ' Legacy recipes were regenerated using the new grammar, not their old shapes.' : ''}`;
    } catch (error) {
      notice = error instanceof Error ? error.message : 'Could not import this project.';
    }
    input.value = '';
  }
  async function apply() {
    busy = true;
    try {
      const response = await fetch('/__pattern-mark-studio/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Patternverse-Studio': token },
        body: JSON.stringify({ kind: 'patternverse-marks', version: 2, marks: saved }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Could not apply icons.');
      notice = `Applied ${saved.length} icons to the local library. Nothing was published.`;
    } catch (error) {
      notice = error instanceof Error ? error.message : 'Could not apply icons.';
    } finally {
      busy = false;
    }
  }
  onMount(() => {
    try {
      const text = localStorage.getItem(storageKey);
      if (text) {
        const loaded = parseMarkProject(text);
        saved = loaded.marks;
        if (loaded.draft) draft = loaded.draft;
      }
      storageReady = true;
    } catch {
      notice =
        'Your stored project could not be read. It has not been overwritten. Import a backup to recover it.';
    }
    void fetch('/__pattern-mark-studio/catalog')
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const result = await response.json();
        catalogue = result.patterns;
        token = result.token;
      })
      .catch(() => {
        notice =
          'The local catalogue is unavailable. You can still edit and export icons manually.';
      });
  });
</script>

<main class="mark-studio">
  <header>
    <p class="eyebrow">personal tool · localhost only · generator v1</p>
    <h1>Pattern icon studio</h1>
    <p>Nine cells. Six states. A quiet, shared vocabulary.</p>
  </header>
  <p class="notice" role="status" hidden={!notice}>{notice}</p>
  <section class="legend" aria-labelledby="grammar-heading">
    <div>
      <h2 id="grammar-heading">The complete grammar</h2>
      <p class="hint">
        Transparent empty space, a square, or an exact quarter disk. No seams or visible grid.
      </p>
    </div>
    <div class="primitives">
      {#each ['Empty', 'Square', 'Top left', 'Top right', 'Bottom right', 'Bottom left'] as label, index (label)}
        <div>
          <svg viewBox="0 0 24 24" width="24" height="24" role="img" aria-label={label}>
            {#if index === 1}<rect
                width="24"
                height="24"
                fill="currentColor"
              />{:else if index > 1}<path
                d={QUARTER_CIRCLE_PATH}
                transform={quarterTransform(((index - 2) * 90) as 0 | 90 | 180 | 270)}
                fill="currentColor"
              />{/if}
          </svg><small>{label}</small>
        </div>
      {/each}
    </div>
    <p class="hint">
      Black leads · gray supports · green or purple punctuates. 3–7 occupied cells, at most two
      squares.
    </p>
  </section>

  <div class="editor">
    <section class="controls" aria-label="Icon settings">
      <label
        >Pattern<select
          value={draft.patternId}
          onchange={(e) => choosePattern(e.currentTarget.value)}
          ><option value="">Choose from the library…</option
          >{#each catalogue as entry (entry.id)}<option value={entry.id}>{entry.title}</option
            >{/each}</select
        ></label
      >
      <div class="pair">
        <label
          >Pattern ID<input
            value={draft.patternId}
            oninput={(e) => edit({ patternId: e.currentTarget.value })}
            maxlength="120"
          /></label
        >
        <label
          >Title<input
            value={draft.title}
            oninput={(e) => edit({ title: e.currentTarget.value })}
            maxlength="160"
          /></label
        >
      </div>
      <label
        >Composition family<select
          value={draft.familyHint ?? ''}
          onchange={(e) =>
            edit({
              familyHint: (e.currentTarget.value || undefined) as CompositionFamily | undefined,
            })}
          ><option value="">Automatic · slug only</option
          >{#each COMPOSITION_FAMILIES as family (family.id)}<option value={family.id}
              >{family.label}</option
            >{/each}</select
        ></label
      >
      <p class="hint">
        {draft.familyHint
          ? COMPOSITION_FAMILIES.find((f) => f.id === draft.familyHint)?.description
          : 'Stable identity selects a family. Titles and subject matter have no effect.'}
      </p>
      <div class="pair">
        <label
          >Variation<input
            type="number"
            min="0"
            max="999999"
            step="1"
            value={draft.variation}
            oninput={(e) => edit({ variation: e.currentTarget.valueAsNumber })}
          /></label
        >
        <label
          >Orientation<select
            value={draft.rotation}
            onchange={(e) =>
              edit({ rotation: Number(e.currentTarget.value) as 0 | 90 | 180 | 270 })}
            >{#each [0, 90, 180, 270] as angle (angle)}<option value={angle}>{angle}°</option
              >{/each}</select
          ></label
        >
      </div>
      <label class="check"
        ><input type="checkbox" bind:checked={transparent} />Transparent SVG background</label
      >
      {#if !valid}<p class="warning">
          Use a lowercase, hyphen-separated ID, a title, and a whole variation number from 0 to
          999999.
        </p>{/if}
      <div class="actions">
        <button class="primary" disabled={!valid || !storageReady} onclick={keep}
          >{saved.some((s) => s.patternId === draft.patternId)
            ? 'Update kept icon'
            : 'Keep this icon'}</button
        >
        <button
          disabled={!valid}
          onclick={() =>
            download(patternMarkSvg(draft, transparent), `${draft.patternId}.svg`, 'image/svg+xml')}
          >Export SVG</button
        >
      </div>
      <p class="hint">
        48 seeded candidates, scored for connectivity, coherence, simplicity, negative space, family
        gesture, color hierarchy and controlled asymmetry.
      </p>
    </section>
    <section class:dark={darkPreview} class="preview" aria-label="Icon preview">
      <label class="check"
        ><input type="checkbox" bind:checked={darkPreview} />Dark surface preview</label
      >
      {#if previewIcon}
        <div class="large-mark"><PatternIcon icon={previewIcon} title={draft.title} /></div>
        <div class="actual-sizes">
          {#each sizes as size (size)}<div>
              <PatternIcon icon={previewIcon} {size} decorative /><small>{size} px</small>
            </div>{/each}
        </div>
        <p class="metrics">
          {previewIcon.family} · connectivity {Math.round((score?.connectivity ?? 0) * 100)}% ·
          score {score?.total.toFixed(2)}
        </p>
        <h2>Candidate variations</h2>
        <div class="candidates">
          {#each candidates as candidate (candidate.variation)}<button
              aria-label={`Use variation ${candidate.variation}`}
              onclick={() => (draft = candidate)}
              ><PatternMark spec={candidate} decorative /></button
            >{/each}
        </div>
      {:else}<p class="warning">Enter a valid recipe to preview it.</p>{/if}
      {#if similar.length}<p class="warning">
          Looks similar to {similar.map((s) => s.title).join(', ')}. Try another variation or
          family. Rotations and reflections count as similar.
        </p>{/if}
    </section>
  </div>

  <section class="gallery" aria-labelledby="families-heading">
    <h2 id="families-heading">Ten composition families</h2>
    <div class="sample-grid families">
      {#each familySamples as family (family.id)}<div>
          <PatternIcon icon={family.icon} size={48} decorative /><strong>{family.label}</strong
          ><small>{family.description}</small>
        </div>{/each}
    </div>
  </section>

  <section class="gallery" aria-labelledby="sample-heading">
    <div class="gallery-heading">
      <div>
        <h2 id="sample-heading">100 generated icons</h2>
        <p>
          Deterministic sample slugs · {visibleSamples.length} shown · no catalog-wide collision resolution
        </p>
      </div>
      <div class="pair">
        <label
          >Gallery size<select bind:value={gallerySize}
            >{#each sizes as size (size)}<option value={size}>{size} px</option>{/each}</select
          ></label
        >
        <label
          >Gallery family<select bind:value={familyFilter}
            ><option value="">All families</option
            >{#each COMPOSITION_FAMILIES as family (family.id)}<option value={family.id}
                >{family.label}</option
              >{/each}</select
          ></label
        >
      </div>
    </div>
    <div class="sample-grid" data-testid="sample-gallery">
      {#each visibleSamples as sample (sample.slug)}<div>
          <PatternIcon icon={sample.icon} size={gallerySize} decorative /><strong
            >{sample.slug}</strong
          ><small>{sample.icon.family}</small>
        </div>{/each}
    </div>
  </section>

  <section class="gallery" aria-labelledby="catalogue-heading">
    <h2 id="catalogue-heading">Real library patterns</h2>
    <p class="hint">
      {catalogue.length} patterns · the same recipes as the application · mobile browsing remains text-only
    </p>
    <div class="sample-grid">
      {#each catalogue as entry (entry.id)}<button
          class="icon-choice"
          onclick={() => choosePattern(entry.id)}
          ><span style={`width:${gallerySize}px;height:${gallerySize}px`}
            ><PatternMark spec={defaultPatternMark(entry.id, entry.title)} decorative /></span
          ><strong>{entry.title}</strong><small
            >{generatePatternMark(defaultPatternMark(entry.id, entry.title)).family}</small
          ></button
        >{/each}
    </div>
  </section>

  <section class="gallery" aria-labelledby="saved-marks">
    <div class="gallery-heading">
      <div>
        <h2 id="saved-marks">Saved icons on this device</h2>
        <p>{saved.length} / {MAX_SAVED_MARKS} · one portable recipe per pattern</p>
      </div>
      <div class="actions">
        <button
          onclick={() =>
            download(
              JSON.stringify(project(), null, 2),
              'patternverse-icons.json',
              'application/json',
            )}>Export project</button
        >
        <label class="import"
          >Import project<input
            type="file"
            accept="application/json,.json"
            onchange={importProject}
          /></label
        >
        <button disabled={!token || !saved.length || busy} onclick={apply}
          >{busy ? 'Applying…' : 'Apply to local library'}</button
        >
      </div>
    </div>
    {#if !saved.length}<p class="hint">
        Keep an icon to start. Older mark projects and browser storage remain untouched; importing a
        legacy project explicitly regenerates its icons. This editor is never included in the public
        website.
      </p>{/if}
    <div class="sample-grid">
      {#each saved as spec (spec.patternId)}<button
          class="icon-choice"
          onclick={() => (draft = { ...spec })}
          ><span class="kept-icon"><PatternMark {spec} decorative /></span><strong
            >{spec.title}</strong
          ><small>{spec.familyHint ?? 'automatic'} · variation {spec.variation}</small></button
        >{/each}
    </div>
  </section>
</main>

<style>
  .mark-studio {
    max-width: 1280px;
    margin: auto;
    padding: 2rem 4vw 3rem;
    color: var(--ink, #181814);
  }
  header {
    margin-bottom: 2rem;
  }
  .eyebrow {
    font-size: 0.75rem;
    font-weight: 750;
    color: #007a4d;
  }
  h1 {
    font-size: clamp(2rem, 4vw, 3rem);
    letter-spacing: -0.055em;
    line-height: 1.1;
    margin: 0.5rem 0 0.75rem;
  }
  h2 {
    font-size: 1rem;
    margin: 0 0 0.75rem;
  }
  header > p:last-child,
  .hint,
  small,
  .gallery-heading p {
    color: #696962;
    font-size: 0.8rem;
    line-height: 1.55;
  }
  .legend {
    border-block: 1px solid #deded8;
    padding: 1.25rem 0;
    margin-bottom: 2rem;
    display: grid;
    gap: 1rem;
  }
  .primitives {
    display: flex;
    flex-wrap: wrap;
    gap: 2rem;
  }
  .primitives > div {
    display: grid;
    gap: 0.5rem;
  }
  .editor {
    display: grid;
    grid-template-columns: minmax(280px, 0.85fr) minmax(0, 1.15fr);
    gap: 3rem;
  }
  .controls {
    display: grid;
    gap: 1rem;
    align-content: start;
  }
  label {
    display: grid;
    gap: 0.45rem;
    font-size: 0.8rem;
    font-weight: 650;
  }
  input:not([type='checkbox']):not([type='file']),
  select {
    width: 100%;
    min-width: 0;
    height: 44px;
    border: 1px solid #d7d7d0;
    background: white;
    padding: 0.5rem 0.65rem;
    font: inherit;
    color: #181814;
  }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-height: 32px;
  }
  .check input {
    width: 16px;
    height: 16px;
    accent-color: #007a4d;
  }
  .hint {
    margin: 0;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  button,
  .import {
    cursor: pointer;
    border: 1px solid #d7d7d0;
    background: white;
    color: #181814;
    padding: 0.75rem 0.9rem;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 650;
    min-height: 44px;
  }
  button:hover,
  .import:hover {
    border-color: #007a4d;
  }
  button:focus-visible,
  select:focus-visible,
  input:focus-visible {
    outline: 2px solid #007a4d;
    outline-offset: 3px;
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  button.primary {
    background: #181814;
    color: white;
    border-color: #181814;
  }
  .preview {
    min-width: 0;
    border: 1px solid #deded8;
    padding: 1.5rem;
  }
  .preview.dark {
    background: #181814;
    color: white;
    --pattern-icon-primary: #fff;
    --pattern-icon-secondary: #999990;
    --pattern-icon-accent: #05ce78;
    --pattern-icon-purple: #b29bff;
  }
  .dark small {
    color: #bcbcb6;
  }
  .large-mark {
    width: 144px;
    height: 144px;
    margin: 1.5rem auto 2rem;
  }
  .actual-sizes {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: end;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
  }
  .actual-sizes > div {
    display: grid;
    justify-items: center;
    gap: 0.5rem;
  }
  .metrics {
    text-align: center;
    font-size: 0.75rem;
    margin-bottom: 1.5rem;
  }
  .candidates {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.5rem;
  }
  .candidates button {
    padding: 0.4rem;
    aspect-ratio: 1;
  }
  .warning {
    background: #f5f5ed;
    color: #181814;
    padding: 0.75rem;
    font-size: 0.8rem;
    line-height: 1.5;
  }
  .gallery {
    margin-top: 3rem;
    border-top: 1px solid #deded8;
    padding-top: 1.5rem;
  }
  .gallery-heading {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .gallery-heading p {
    margin: 0;
  }
  .import {
    position: relative;
    display: inline-flex;
    align-items: center;
    overflow: hidden;
  }
  .import input {
    position: absolute;
    inset: 0;
    opacity: 0;
    width: 100%;
    cursor: pointer;
  }
  .import:focus-within {
    outline: 2px solid #007a4d;
    outline-offset: 3px;
  }
  .sample-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 2rem 1.5rem;
    margin-top: 1.5rem;
  }
  .sample-grid > div,
  .icon-choice {
    display: grid;
    justify-items: start;
    align-content: start;
    gap: 0.6rem;
    text-align: left;
    min-width: 0;
  }
  .sample-grid strong {
    font-size: 0.75rem;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  .families {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
  .icon-choice {
    border: 0;
    padding: 0;
    background: transparent;
  }
  .icon-choice:hover strong {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .kept-icon {
    width: 64px;
    height: 64px;
  }
  .notice {
    min-height: 1.5rem;
    font-size: 0.85rem;
    margin-top: 1.5rem;
  }
  @media (max-width: 760px) {
    .editor {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    .gallery-heading {
      flex-direction: column;
    }
    .candidates {
      grid-template-columns: repeat(3, 1fr);
    }
    .candidates button {
      max-height: 96px;
    }
    .mark-studio {
      padding: 1.5rem 5vw;
    }
    .preview {
      padding: 1rem;
    }
    .sample-grid {
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    }
  }
</style>
