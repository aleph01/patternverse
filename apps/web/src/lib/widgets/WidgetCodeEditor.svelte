<script lang="ts">
  import { codeLanguage, highlightCode, type CodeToken } from './code-highlighting';
  let {
    source,
    filename,
    label,
    title,
    readonly = false,
    compact = false,
    onchange,
  }: {
    source: string;
    filename: string;
    label?: string;
    title?: string;
    readonly?: boolean;
    compact?: boolean;
    onchange: (source: string) => void;
  } = $props();
  const id = $props.id();
  const trailingLine = '\n';
  const language = $derived(codeLanguage(filename));
  const lineCount = $derived(source.split('\n').length);
  let tokens = $state<CodeToken[]>([]),
    highlightedSource = $state('');
  let scrollTop = $state(0),
    scrollLeft = $state(0);
  const visibleTokens = $derived<CodeToken[]>(
    highlightedSource === source ? tokens : [{ text: source }],
  );
  $effect(() => {
    const text = source,
      name = filename;
    let alive = true;
    void highlightCode(text, name).then((next) => {
      if (alive) {
        tokens = next;
        highlightedSource = text;
      }
    });
    return () => {
      alive = false;
    };
  });
</script>

<div class="source-editor" class:compact class:readonly>
  <div class="source-heading">
    <label for={id}>{title ?? filename}</label><span class="language"
      >{language.label}{readonly ? ' · Read-only' : ''}</span
    >
  </div>
  <div class="code-surface">
    <pre
      class="syntax-layer"
      aria-hidden="true"
      style:transform={`translate(${-scrollLeft}px, ${-scrollTop}px)`}>{#each visibleTokens as token, index (index)}<span
          class={token.kind ? `syntax-${token.kind}` : undefined}>{token.text}</span
        >{/each}{trailingLine}</pre>
    <div class="line-gutter" aria-hidden="true">
      <div style:transform={`translateY(${-scrollTop}px)`}>
        {#each Array.from({ length: lineCount }, (_, index) => index + 1) as line (line)}<span
            >{line}</span
          >{/each}
      </div>
    </div>
    <textarea
      {id}
      value={source}
      {readonly}
      aria-label={label ?? `${filename} source`}
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      wrap="off"
      oninput={(event) => onchange(event.currentTarget.value)}
      onscroll={(event) => {
        scrollTop = event.currentTarget.scrollTop;
        scrollLeft = event.currentTarget.scrollLeft;
      }}></textarea>
  </div>
  <div class="source-footer">{lineCount} {lineCount === 1 ? 'line' : 'lines'}</div>
</div>

<style>
  .source-editor {
    min-width: 0;
    border: 1px solid var(--ink);
    border-radius: var(--radius-control);
    overflow: hidden;
    background: var(--paper);
  }
  .source-heading,
  .source-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    background: #f5f5f2;
    color: var(--muted);
    font-size: var(--text-xs);
  }
  .source-heading {
    border-bottom: 1px solid #e2e4df;
    flex-wrap: wrap;
  }
  .source-heading label {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-weight: var(--weight-label);
    color: var(--ink);
    overflow-wrap: anywhere;
  }
  .language {
    font-size: 10px;
    white-space: nowrap;
  }
  .source-footer {
    border-top: 1px solid #e2e4df;
    padding: 7px 14px;
    font-variant-numeric: tabular-nums;
  }
  .code-surface {
    position: relative;
    overflow: hidden;
    background: var(--paper);
    color: var(--ink);
  }
  .syntax-layer,
  textarea,
  .line-gutter {
    font:
      13px/1.75 ui-monospace,
      SFMono-Regular,
      Menlo,
      Consolas,
      monospace;
    tab-size: 2;
    font-variant-ligatures: none;
    letter-spacing: normal;
  }
  .syntax-layer,
  textarea {
    margin: 0;
    padding: 16px 16px 16px 55px;
    white-space: pre;
    box-sizing: border-box;
    border: 0;
    border-radius: 0;
  }
  .syntax-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: max-content;
    min-width: 100%;
    pointer-events: none;
    overflow: visible;
    background: transparent;
    color: var(--ink);
  }
  .line-gutter {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 43px;
    overflow: hidden;
    pointer-events: none;
    background: #f5f5f2;
    border-right: 1px solid #e2e4df;
    color: var(--muted);
    text-align: right;
    z-index: 1;
  }
  .line-gutter > div {
    padding: 16px 8px;
  }
  .line-gutter span {
    display: block;
  }
  textarea {
    position: relative;
    display: block;
    width: 100%;
    min-width: 0;
    height: 480px;
    min-height: 260px;
    max-height: 80vh;
    resize: vertical;
    background: transparent;
    color: transparent;
    -webkit-text-fill-color: transparent;
    caret-color: var(--ink);
    outline: 0;
    box-shadow: none;
  }
  textarea:focus-visible {
    outline: var(--focus-width) solid var(--focus-color);
    outline-offset: calc(-1 * var(--focus-width));
  }
  textarea::selection {
    background: #dff8eacc;
    color: transparent;
  }
  .compact textarea {
    height: 170px;
    min-height: 120px;
  }
  .readonly .source-heading {
    background: #f5f5f2;
  }
  .syntax-kwd,
  .syntax-type {
    color: #7752a3;
  }
  .syntax-str,
  .syntax-insert {
    color: #286d44;
  }
  .syntax-num,
  .syntax-bool {
    color: #a05027;
  }
  .syntax-cmnt {
    color: var(--muted);
    font-style: italic;
  }
  .syntax-func,
  .syntax-class {
    color: #2b659a;
  }
  .syntax-var,
  .syntax-section {
    color: #7b4476;
  }
  .syntax-oper {
    color: var(--muted);
  }
  .syntax-esc {
    color: #9a692c;
  }
  .syntax-err,
  .syntax-deleted {
    color: #ae3a37;
  }
  @media (forced-colors: active) {
    .syntax-layer {
      display: none;
    }
    textarea {
      color: CanvasText;
      -webkit-text-fill-color: CanvasText;
      caret-color: CanvasText;
    }
    .line-gutter {
      border-color: CanvasText;
    }
  }
</style>
