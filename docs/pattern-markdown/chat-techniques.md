# Unified desktop chat techniques

Shift+Space and the Composer's technique button now show one searchable catalog:

The picker exposes the session's modality directly. Switching it keeps the picker open,
clears the old search, and refreshes matching techniques; guided Patterns are listed
before other techniques (after Automatic). A count makes the modality filter visible.
CBT, ACT and DBT releases do not appear in NARM sessions. Active exercises prevent a
modality switch from this picker. Selecting a saved Pattern opens a minimal input card
with accessible play/start and cross/dismiss icon buttons; selection alone never starts it.

- **One response**: legacy conversational moves; select for the next reply or regenerate.
- **Ongoing**: legacy multi-turn guidance, using the existing active-technique state.
- **Guided exercise**: last-valid saved Pattern Library revisions, using the Rust session controller.

This is a presentation unification, not a conversion of conversation policy into a workflow.
Namespaced identities deduplicate repeated links without conflating unrelated artifacts.
The [first therapy-informed pack](../../packages/therapy-patterns/README.md) adds six
finite guided versions for CBT, ACT and DBT. Four explicitly map to legacy CBT/DBT
techniques. Their built-in guided version becomes the default discovery item only when
the legacy prompt is enabled, uncustomized and not already active. Disabling the guided
version restores the legacy option; unavailable library reads do the same. Local forks
cannot suppress legacy entries. No legacy source, customization or run is removed, and
finite scripts do not claim parity with adaptive free-form conversations.

## Availability and explicit starts

Built-in one-response moves follow the modality's declared Pattern references. Copies
inherit their parent's compatibility; standalone user moves remain generic. Disabled
items are excluded. Ongoing techniques retain their existing enabled/compatible policy.

Pattern Library → **Chat availability & suggestions** controls each guided Pattern's
enabled flag, compatible modality IDs, description, and optional discovery cues. No
modalities selected means modality-independent. Existing library records get enabled,
manual-only defaults. New forks retain modality/description but start hidden with no
cues, avoiding unsolicited duplicate suggestions. These are local preferences, also
editable for immutable releases, not part of executable source.

Choosing a guided exercise opens its explicit-input form in chat. It does not regenerate
the last response, include other messages or the Composer draft, or start inference.
Start is revalidated against the library and native session state. Disabled/stale
selections and incompatible saved session modalities are refused. A paused exercise
still owns its run slot; finish/cancel before starting another. Existing runs continue
from their pinned snapshots even when discovery settings or source change.

Discovery metadata is bounded, encrypted with the library, backward-compatible, and
has a separate CAS generation. Saving it never changes source revisions, source undo,
or a running checkpoint. Unconfirmed writes block further writes until explicit reload.

## Suggestions

After an ordinary completed reply, chat may show one optional suggestion with a reason
and **Use next reply** or **Review & start**, plus **Not now**. No extra model request is
made. Matching uses words in the last user message against labels/descriptions for
legacy entries, and explicit whole-word/phrase cues for guided Patterns. A Pattern
with no cues is never automatically suggested; synthetic bundled examples remain
manual-only. The reason names matched terms rather than claiming clinical suitability.

Suggestions are suppressed while generating, dictating, saving, in voice conversation,
viewing a start form, after session end, or while a technique/exercise is selected.
Dismissed/accepted suggestions are not repeated while this session screen stays open.
Dismissal is ephemeral and is not added to the therapeutic transcript. Selection never
auto-starts a run or changes an active technique. Catalog refresh happens on entry,
picker changes and window focus; failed reads remove guided entries rather than
falling back to stale availability.

This is lightweight lexical discovery, **not clinical recommendation or a safety
assessment**. It can miss synonyms, negation, and intent, and depends on authored cues.
Further representative migrations, semantic ranking, and any PWA bridge remain
separate work. The bundled therapeutic pack has explicit discovery cues, but those do
not assess readiness or risk. No cloud provider, clinical efficacy, or real-model
evaluation is implied.

## Verification

Tests cover unified identities, modality/enable filtering, manual-only defaults,
keyboard/pointer selection, explicit input handoff, no extra inference, stale selections,
backward compatibility, independent CAS, encrypted preference storage and pinned-run
continuation. UI review used a disposable synthetic page, never personal sessions.
