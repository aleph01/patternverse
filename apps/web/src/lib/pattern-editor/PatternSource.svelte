<script lang="ts">
  import { tick } from 'svelte';
  import { applyCompletion, completions, type CheckedSource, type Completion } from './completion';
  import { highlightSource } from './highlight';
  import { sourceSelection, type SourceDiagnostic } from './types';

  let {
    source,
    disabled = false,
    diagnostics = [],
    checked,
    onchange,
  }: {
    source: string;
    disabled?: boolean;
    diagnostics?: readonly SourceDiagnostic[];
    checked?: CheckedSource;
    onchange: (source: string) => void;
  } = $props();
  const id = $props.id();
  const trailingLine = '\n';
  let field = $state<HTMLTextAreaElement>();
  let scrollTop = $state(0),
    scrollLeft = $state(0);
  let caret = $state(0),
    open = $state(false),
    selected = $state(0),
    composing = false;
  let anchor = $state({ left: 45, top: 40 });
  let undo: { source: string; caret: number }[] = [];
  let redo: { source: string; caret: number }[] = [];
  const suggestions = $derived(
    open && !disabled ? completions(source, caret, checked) : { from: caret, to: caret, items: [] },
  );
  const expanded = $derived(open && suggestions.items.length > 0);
  const ranges = $derived(
    diagnostics.map((diagnostic) => ({
      ...diagnostic,
      range: sourceSelection(source, diagnostic.primary),
    })),
  );
  const tokens = $derived.by(() => {
    let offset = 0;
    return highlightSource(source).flatMap((token) => {
      const start = offset,
        end = start + token.text.length;
      offset = end;
      const boundaries = [
        ...new Set([
          start,
          end,
          ...ranges.flatMap((d) => d.range).filter((point) => point > start && point < end),
        ]),
      ].sort((a, b) => a - b);
      return boundaries.slice(0, -1).map((point, index) => ({
        text: source.slice(point, boundaries[index + 1]),
        kind: token.kind,
        severity: ranges.find((d) => d.range[0] <= point && d.range[1] > point)?.severity,
      }));
    });
  });
  const lines = $derived.by(() => {
    let offset = 0;
    return source.split('\n').map((line, index) => {
      const start = offset;
      offset += line.length + 1;
      return {
        number: index + 1,
        diagnostic: ranges.find((d) => d.range[0] >= start && d.range[0] <= start + line.length),
      };
    });
  });
  function locate(position: number) {
    caret = position;
    if (!field) return;
    const style = getComputedStyle(field),
      font = parseFloat(style.fontSize),
      height = parseFloat(style.lineHeight);
    const before = field.value.slice(0, position),
      row = before.split('\n').length - 1,
      column = before.length - before.lastIndexOf('\n') - 1;
    anchor = {
      left: Math.max(8, Math.min(45 + column * font * 0.6 - scrollLeft, field.clientWidth - 260)),
      top: Math.max(24, Math.min(14 + (row + 1) * height - scrollTop, field.clientHeight - 45)),
    };
  }
  function change(next: string, position: number) {
    undo = [...undo.slice(-49), { source, caret: field?.selectionStart ?? caret }];
    redo = [];
    onchange(next);
    void tick().then(() => {
      if (field) {
        field.focus();
        field.setSelectionRange(position, position);
        locate(position);
      }
    });
  }
  function accept(completion: Completion) {
    if (disabled || composing) return;
    const next = applyCompletion(source, suggestions, completion);
    if (new TextEncoder().encode(next.source).length > 65536) return;
    open = false;
    change(next.source, next.caret);
  }
  export function reveal(diagnostic: SourceDiagnostic) {
    open = false;
    const [start, end] = sourceSelection(source, diagnostic.primary);
    field?.focus();
    field?.setSelectionRange(start, end);
  }
  export function insert(command: string) {
    if (disabled) return;
    const completion = completions('!', 1).items.find((item) => item.label === command);
    if (!completion) return;
    const from = field?.selectionStart ?? source.length,
      to = field?.selectionEnd ?? from;
    const next = applyCompletion(source, { from, to, items: [completion] }, completion);
    if (new TextEncoder().encode(next.source).length > 65536) return;
    open = false;
    change(next.source, next.caret);
  }
  function keydown(event: KeyboardEvent) {
    if (event.isComposing || composing || disabled) return;
    if (event.ctrlKey && event.code === 'Space') {
      event.preventDefault();
      locate(field?.selectionStart ?? 0);
      selected = 0;
      open = true;
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      const history = event.shiftKey ? redo : undo;
      const prior = history.pop();
      if (!prior) return;
      (event.shiftKey ? undo : redo).push({ source, caret: field?.selectionStart ?? 0 });
      onchange(prior.source);
      open = false;
      void tick().then(() => {
        field?.setSelectionRange(prior.caret, prior.caret);
      });
      return;
    }
    if (expanded && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
      if (event.key === 'Escape') {
        event.preventDefault();
        open = false;
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        selected =
          (selected + (event.key === 'ArrowDown' ? 1 : suggestions.items.length - 1)) %
          suggestions.items.length;
        return;
      }
      if (event.key === 'Tab' || event.key === 'Enter') {
        event.preventDefault();
        accept(suggestions.items[Math.min(selected, suggestions.items.length - 1)]);
        return;
      }
    }
    if (event.metaKey || event.ctrlKey || ['ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key))
      open = false;
  }
  $effect(() => {
    if (expanded)
      document
        .getElementById(`${id}-option-${Math.min(selected, suggestions.items.length - 1)}`)
        ?.scrollIntoView?.({ block: 'nearest' });
  });
</script>

<div class="source-field">
  <label class="sr-only" for={id}>Practice source</label>
  <div class="code">
    <pre
      aria-hidden="true"
      style:transform={`translate(${-scrollLeft}px, ${-scrollTop}px)`}>{#each tokens as token, index (index)}<span
          class={`token-${token.kind}`}
          class:lint-error={token.severity === 'Error'}
          class:lint-warning={token.severity === 'Warning'}>{token.text}</span
        >{/each}{trailingLine}</pre>
    <div class="gutter" aria-hidden="true" style:transform={`translateY(${-scrollTop}px)`}>
      {#each lines as line (line.number)}<span class:has-issue={Boolean(line.diagnostic)}
          >{line.number}</span
        >{/each}
    </div>
    <textarea
      {id}
      bind:this={field}
      value={source}
      readonly={disabled}
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      wrap="off"
      maxlength="65536"
      aria-describedby={`${id}-help`}
      aria-invalid={diagnostics.some((d) => d.severity === 'Error') || undefined}
      aria-autocomplete="list"
      aria-controls={expanded ? `${id}-completions` : undefined}
      aria-activedescendant={expanded
        ? `${id}-option-${Math.min(selected, suggestions.items.length - 1)}`
        : undefined}
      oninput={(event) => {
        undo = [...undo.slice(-49), { source, caret }];
        redo = [];
        onchange(event.currentTarget.value);
        locate(event.currentTarget.selectionStart);
        selected = 0;
        open =
          !composing &&
          /[\w!?:.~>]$/.test(
            event.currentTarget.value.slice(0, event.currentTarget.selectionStart),
          );
      }}
      onselect={(event) => locate(event.currentTarget.selectionStart)}
      onblur={() => (open = false)}
      oncompositionstart={() => {
        composing = true;
        open = false;
      }}
      oncompositionend={() => (composing = false)}
      onkeydown={keydown}
      onscroll={(event) => {
        scrollTop = event.currentTarget.scrollTop;
        scrollLeft = event.currentTarget.scrollLeft;
        open = false;
      }}></textarea>
    {#if expanded}
      <div class="completion" style:left={`${anchor.left}px`} style:top={`${anchor.top}px`}>
        <div id={`${id}-completions`} role="listbox" aria-label="Pattern suggestions">
          {#each suggestions.items as suggestion, index (suggestion.insert)}
            <button
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              aria-selected={index === Math.min(selected, suggestions.items.length - 1)}
              onmousedown={(event) => event.preventDefault()}
              onmouseenter={() => (selected = index)}
              onfocus={() => (selected = index)}
              onclick={() => accept(suggestion)}
            >
              <strong>{suggestion.label}</strong><small>{suggestion.detail}</small>
            </button>
          {/each}
        </div>
        <small>↑ ↓ choose · Tab / Enter insert · Esc close</small>
      </div>
    {/if}
  </div>
  <small id={`${id}-help`}
    >Ctrl+Space for local suggestions. Underlines come from the compiler.</small
  >
</div>

<style>
  .source-field {
    min-width: 0;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .code {
    position: relative;
    overflow: hidden;
    background: var(--paper);
    color: var(--ink);
    min-height: 380px;
  }
  pre,
  textarea,
  .gutter {
    font:
      13px/1.75 ui-monospace,
      SFMono-Regular,
      Menlo,
      monospace;
    tab-size: 2;
  }
  pre,
  textarea {
    margin: 0;
    padding: 16px 16px 16px 48px;
    white-space: pre;
    border: 0;
    box-sizing: border-box;
  }
  pre {
    position: absolute;
    inset: 0 auto auto 0;
    min-width: 100%;
    pointer-events: none;
    background: transparent;
  }
  textarea {
    position: relative;
    display: block;
    width: 100%;
    height: 420px;
    resize: vertical;
    color: transparent;
    caret-color: var(--ink);
    background: transparent;
    min-height: 250px;
    max-height: 900px;
  }
  textarea::selection {
    background: #b4dbc580;
    color: transparent;
  }
  textarea:focus-visible {
    outline: 2px solid var(--green);
    outline-offset: -2px;
  }
  .gutter {
    position: absolute;
    left: 0;
    top: 0;
    width: 37px;
    padding: 16px 5px;
    text-align: right;
    background: var(--paper);
    color: #868982;
    pointer-events: none;
  }
  .gutter span {
    display: block;
  }
  .gutter .has-issue {
    color: #bc4537;
    font-weight: 700;
  }
  .token-directive {
    color: #007a4d;
    font-weight: 700;
  }
  .token-metadata {
    color: #7259b8;
  }
  .token-reference {
    color: #225db6;
  }
  .token-string {
    color: #a15624;
  }
  .token-comment {
    color: #6c746b;
  }
  .lint-error {
    text-decoration: underline wavy #bc4537;
    text-underline-offset: 3px;
  }
  .lint-warning {
    text-decoration: underline wavy #9b751e;
    text-underline-offset: 3px;
  }
  small {
    display: block;
    padding: 10px 14px;
    font-size: 11px;
    color: var(--ink-muted, #62655f);
    line-height: 1.5;
  }
  .completion {
    position: absolute;
    z-index: 4;
    width: min(300px, calc(100% - 16px));
    background: var(--paper);
    border: 1px solid var(--ink);
    border-radius: 4px;
    box-shadow: 0 8px 24px #1818141a;
  }
  .completion [role='listbox'] {
    max-height: 220px;
    overflow: auto;
  }
  .source-field .completion button {
    text-transform: none;
    display: block;
    border: 0;
    border-bottom: 1px solid var(--line, #dedfd8);
    width: 100%;
    text-align: left;
    background: var(--paper);
    color: var(--ink);
    padding: 9px 12px;
    font: inherit;
    cursor: pointer;
  }
  .completion button[aria-selected='true'] {
    background: #e8f7ec;
    color: #181814;
  }
  .completion strong {
    font:
      700 13px ui-monospace,
      monospace;
  }
  .completion button small {
    padding: 3px 0 0;
    font-size: 11px;
  }
  .completion > small {
    border-top: 1px solid #dedfd8;
  }
  @media (max-width: 700px) {
    pre,
    textarea,
    .gutter {
      font-size: 16px;
      line-height: 1.65;
    }
    textarea {
      height: 365px;
    }
  }
  @media (forced-colors: active) {
    pre,
    .gutter {
      display: none;
    }
    textarea {
      color: CanvasText;
      caret-color: CanvasText;
    }
    textarea::selection {
      color: HighlightText;
      background: Highlight;
    }
  }
</style>
