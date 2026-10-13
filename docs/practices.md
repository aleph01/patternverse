# Interactive practices

Pattern Language is the canonical executable representation for embedded and standalone
practices. Articles remain Markdown with YAML frontmatter; only the old executable
YAML worksheet format has been retired from authoring and execution.

## One semantic implementation

Stored article with one `patternverse-language` fence
→ compiler extracts `languagePracticeSource`
→ Rust `pattern-core` parses, validates, compiles and transitions
→ `pattern-host` projects the run
→ WebAssembly transports the result
→ Svelte renders the requested interaction.

The source editor and its preview use the same Rust compiler/runtime as the reader-facing
runner. `PatternRun.svelte` is shared by embedded pattern and standalone practice routes.
`PatternForm.svelte` is shared by the public runner, editor preview and Mira effect view.
There is no TypeScript YAML practice interpreter.

## Grouped questions

Use `!form` for questions which belong to one worksheet step:

```pattern
:language 1
:title "A small next step"
:output reflection

reflection = !form {
  :title "Reflect on the situation"
  !show {
Notice one manageable situation.
  }
  !ask thought {
    :required true
    :multiline true
    :placeholder "What came to mind?"
What was your first thought?
  }
  !ask note {
    :required false
    :multiline false
Anything else you want to remember?
  }
}
!show {
Your thought: {{reflection.thought}}
}
-> end
```

A form contains 1–256 ordered `!show`, `!ask` or `!timer` blocks.
Field IDs are unique within a form. `:title` is optional. Text fields default to
required and multiline; placeholders are optional quoted strings. These attributes
apply to form fields, not existing standalone `!ask` statements.

The runtime emits one `interaction.form` effect. A `form` fulfillment maps every
field ID to a tagged Value. Required text cannot be whitespace-only; optional text
can be empty. Missing/extra fields, wrong types and text exceeding 32,000 UTF-8 bytes
are rejected atomically. After acceptance, the binding is an immutable typed record:
`reflection.thought` can be used by later statements. Show-only forms accept an empty
record as acknowledgement.

Templates use existing outer bindings. Sibling answers are not available until the whole
form commits. Branching, child calls, agent work and nested forms are not allowed inside
a form; use ordinary language statements between forms. This is a small addition to the
existing AST/compiled instructions, not a second interaction language or workflow engine.

## Timers

Form timers use the existing `!timer` duration, adjustment bounds and blocking contract.
Use `:sticky false` to keep a timer beneath the text in its form step, or omit it (or use `:sticky true`) to move started timers into the sticky area. This is independent of `:persistent`.
The result field is the existing typed timer record. A form cannot submit while a blocking
timer is unfinished. Non-blocking form timers may remain idle when the participant continues.
`:persistent true` keeps a non-blocking timer controllable in the visible completed
step while the run continues. Timer receipts are immutable snapshots; the browser owns the
live clock, and no clock or browser dependency was added to the Rust runtime.

The legacy import converter places persistent timers in the first form, matching their
previous availability from the start of the worksheet. Other legacy timers remain in their
authored step and never become mandatory completion gates.

## Compatibility and authoring

The ten public YAML worksheets have been migrated to `patternverse-language`.
Their grouped questions, article text, instructions, required/optional flags, multiline
settings and placeholders are preserved. Existing pattern `/practice` URLs and
standalone practice `/run` URLs still work.

`PracticeDefinition` and its strict YAML parser remain only as an import compatibility
boundary. The corpus reader converts valid legacy personal records to language source for
consumers. Opening a personal record prepares a converted editor draft without rewriting
IndexedDB; saving writes only Pattern Language. Malformed or ambiguous dual-format records
remain intact and cannot be saved until repaired. Numeric legacy field IDs receive an
unambiguous `field_` prefix because language identifiers cannot start with a digit.

The editor provides source highlighting, local completion (including forms and field
attributes), Rust diagnostics, a read-only structure outline and an isolated preview.
Source changes do not mutate an active preview: restart explicitly to test the new source.
Public runtime URLs do not grant access to private workspace records.

### Synchronized block authoring

The personal editor opens in **Blocks**, with **Source** and **Preview** views of the
same `languagePracticeSource`. Blocks are not a separate stored practice format.
Questions (`!ask`), static choices (`!choose`), ratings (`!rate`), plain text/summary
blocks (`!show`) and timers (`!timer`) have field editors. Response and option IDs
remain stable; rename responses in Source. Desktop keeps the existing preview beside
the editor; mobile uses the three tabs.

**Paths** projects an existing `?match` as exact-answer cases, or a `?branch` as
ordered numeric rules on one earlier response. Otherwise remains explicit. Each path
owns its blocks and an explicit destination: continue after Paths or finish the practice.
Rules run in authored priority order, not through a second UI evaluator. Adding/removing
cases and moving rules produces ordinary Pattern Language source.

Rust inspection supplies exact UTF-8 source ranges and groups only distinct, labelled,
linear arms with explicit outgoing jumps and at most one shared continuation. Shared
entry targets, nested dispatch, compound conditions, enum dispatch and other advanced
constructs remain editable in Source rather than being simplified or discarded. Other
unsupported blocks, including forms, collections, loops and AI constructs, also stay
intact as Source blocks. This is a conservative authoring projection of the existing
parser and checked flow, not a new AST, grammar or runtime.

Block fields are staged until **Apply changes**. Every candidate is validated by the
same Rust compiler before replacing the source. Invalid candidates show diagnostics
and leave the working source unchanged. Apply or discard staged changes before saving
or switching views. Source edits rebuild the projection; untouched source ranges are
preserved. The existing Markdown-fence storage trims trailing whitespace on save.

## Privacy and validation

Self-guided runs keep responses in memory by default. Completing a run keeps answers
visible for review. **Save to workspace** can be chosen before completion; it opts the
run into [private practice history](practice-history.md) and saves subsequent confirmed
revisions. Unsubmitted field drafts and live timer clocks are not saved. Unsaved responses
are discarded on restart, departure or reload. Editor previews remain in memory only.
Saving never adds answers to public content or a personal pattern definition. Saved
workspace responses/checkpoints are unencrypted local records and can be included in
backup or configured workspace sync. Mira retains its separate encrypted persistence.

Form compiler/runtime tests cover atomic validation, record references, timers, idempotency
and replay. Browser-engine tests execute all ten migrated practices. Component and browser
tests cover grouped inputs, optional answers, continuous read-only history, old URLs,
preview and narrow layouts. Existing language programs and saved catalog runs remain valid.

## Portable presentation prototype

Open `/embed/define-the-decision-before-comparing-options` on the local development
server to review a compact, navigation-free version of the same public worksheet.
It loads the existing corpus source, not a copied definition. No homepage/navigation
entry point is added. The route will be public if deployed; it exposes public content only.

The independent `PracticeEmbed.svelte` component accepts `source`, `title`, an optional
serialized `checkpoint`, and an optional `oncheckpoint` callback. Mount a new component
instance when changing the practice. Checkpoints are passed explicitly by the caller;
the default demo does not export them, store them, or transmit them anywhere.
The shared browser module provides `startSourceRun`, `applySourceAction`,
`serializeSourceRun`, and `restoreSourceRun`. Rust remains authoritative for field
validation, revisions, replay, and transitions. Restoring a checkpoint does not fulfill
or dispatch its pending interaction.

This is a deliberately narrow form-based vertical slice. Unsupported interaction kinds
remain pending with a clear message, rather than being guessed or silently skipped.
There are no AI calls, accounts, private-pattern access, URL-carried state, host messages,
or automatic cross-host sync. Checkpoints contain answers in plaintext: any future host
adapter must obtain appropriate consent and provide its own secure transport/storage.
Live timer clocks are presentation-local and are not transferred by this prototype.

The website's existing `X-Frame-Options: DENY` and `frame-ancestors 'none'` headers
are intentionally unchanged. The local demo is a standalone presentation, not an
externally frameable production endpoint. An eventual MCP App needs a dedicated UI
entry/build and an explicit host security policy, not a blanket relaxation of the site.

Tests compare all five public worksheet transitions between uninterrupted and restored
runs, typed outputs, required-field validation, stale revisions, source mismatch, and
tampered checkpoints. Component tests transfer a checkpoint between isolated embed
instances. Browser tests exercise both website and embed shells at desktop/mobile widths.
