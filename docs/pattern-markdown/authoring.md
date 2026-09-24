# M10 — Mira-assisted Pattern authoring

Open **Pattern Library → Source → Edit with Mira**. Choose an installed local model
in Settings first. Ask for a source change (for example, a rating after a question or
warmer wording) or an explanation of the current Pattern. Built-in releases can be
explained; fork one before applying edits.

## Review and application boundary

The assistant returns either an explanation or a complete proposed replacement of
the root source. This is a source-level patch, never executable IR, a runtime event,
or an instruction to mutate files. Strict JSON decoding rejects additional fields,
unknown reply kinds, malformed/truncated responses and oversized content.

The UI shows the explanation, a source diff and Rust compiler results before enabling
**Apply proposed edit**. The diff uses common leading/trailing lines and displays the
entire changed region, with explicit added/removed markers and no raw HTML rendering.
It is linear and single-hunk, not a minimal edit-distance diff; internal unchanged
lines can appear as removal/addition. Large diffs use a bounded number of DOM blocks.

**Discard proposal** leaves the document untouched. Applying first revalidates against
the current saved generation through the existing native inspection command. Invalid
source or an unavailable/stale compiler check cannot be applied. No automatic repair,
dependency installation, or regeneration is triggered. A manual document edit makes
the proposal stale, even if Undo restores identical text. A final synchronous source
and edit-epoch guard prevents an in-flight check from overwriting newer work.

An accepted proposal is one editor transaction: one Undo restores the complete previous
draft, and Redo reapplies it. The ordinary M9 live check and encrypted autosave then
handle the changed draft. Proposals themselves are not saved or autosaved. Existing
library generation/CAS/last-valid rules remain authoritative for durable publication.

Active simulation and conversation Runs keep their pinned snapshots. The authoring
adapter has no runtime transition or session-storage capability. A newly saved valid
revision is used only on a later explicit start. No Rust production behavior, compiled
schema, source grammar, persistence schema, or function-documentation contract changed.

## Conversation and privacy

The open panel retains the last six authoring exchanges in memory, including whether
an edit was proposed, applied or discarded. A pending proposal must be applied or
discarded before another request. Explanations do not create an edit or undo entry.
Closing the panel/document discards this authoring discussion and pending proposal.

Each explicit **Ask Mira** sends only the current root source, request, bundled child
names, recent authoring exchanges, and a fixed authoring/safety guide to the selected
local Ollama model. It does not include chat history, therapy sessions, simulation
replies, ambient bindings, library-wide source, or the personal therapy system prompt.
There is no cloud fallback or auto-start inference. Source/Markdown/model output is
treated as data; nothing is evaluated as JavaScript, HTML, commands or runtime IR.

Requests are limited to 4,000 UTF-8 bytes, source to 64 KiB, explanations to 8,000 bytes,
serialized request context to 180,000 bytes and raw response to 450,000 bytes. At most
one request/check runs per panel. Generation times out after two minutes and final
revalidation after 30 seconds. Stop/close cancels immediately from the UI's perspective;
late model/inspection responses cannot apply changes. The scoped provider cancellation
mechanism terminates its own inference without stopping another request.

The guide covers supported syntax, including Phase 1 compiled `!refine` and pinned local imports. Requests
such as “use grounding.basic when distress exceeds 7” can refer only to already-bundled
children. Missing dependencies are not installed or invented: the assistant is instructed
to explain the limitation, and the Rust compiler independently rejects unresolved uses.
Phase 1 adds an explicit [local import picker](imports.md); whole-library edits and
remote dependencies remain out of scope. Model quality may vary; compiler acceptance
does not establish therapeutic quality or semantic equivalence.

## Verification

Six transport/diff tests check explicit context, strict schemas, limits, incomplete or
failed responses, cancellation and whitespace/final-newline differences. Twelve UI
tests cover review-before-apply, revalidation, one-step undo/redo, discard/follow-ups,
stale edits (including edit-then-undo), invalid source, explanations, immutable releases,
stop/late responses, timeout, unavailable models, closure during checks, validation
failure, and unchanged active previews. A native test confirms candidate inspection
does not write storage, valid application creates a new revision, the old Run still
uses its original question, and a new Run uses the edited question.

Full checks pass: 132 portable tests, one doctest, 75 native tests and 201 workspace
tests (409 total), Rust formatting/strict Clippy/private documentation, TypeScript,
production build and release metadata. All 426 production Rust functions remain
documented. The existing large frontend chunk advisory remains. Synthetic browser
review covered diff readability, Apply, unchanged-source-before-apply and Undo availability;
temporary pages were removed. No real model calls or private sessions were used, so
this is not a real-model output-quality evaluation. No website publication or iOS work.

Next: M11 representative migrations with manifests, deterministic scenarios and
old/new semantic comparisons. Keep legacy implementations available during validation.
