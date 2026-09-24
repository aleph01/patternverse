# M7 — Generic inline chat widgets

Mira desktop’s **Conversation settings → Step-by-step examples · preview** starts
one of the three bundled synthetic examples inside the current session. These are
not migrated therapy techniques. The Settings preview still has separate pilot slots.
The published PWA and iOS app are unchanged.

## Interaction boundary

The native Host projects `manager::replay` effects and the accepted receipt ledger
into `items: [{ effect, result }]`. This is historical presentation, not re-dispatch.
Full effect metadata includes root/child identity, pinned snapshot, node, source span
and collection context. React uses effect IDs as stable keys and attaches root/run/
snapshot/node provenance to rendered blocks. Repeated reloads do not duplicate items.

- `interaction.ask` takes over the existing Composer. Exercise and ordinary-chat
  drafts are separate; pausing restores the ordinary draft and resuming restores the
  unsubmitted exercise draft. Drafts remain memory-only until explicitly submitted.
  Dictation fills the exercise draft without submitting it. Hands-free chat is closed
  when entering an active exercise.
- `interaction.choose` uses buttons returning the authored stable value, not its label.
- `interaction.rate` uses a labelled bounded numeric input; Rust remains authoritative
  for the type/range contract.
- `content.show` and accepted `agent.turn` render as escaped text using existing chat
  styling. Markdown is shown literally, not interpreted as HTML or executable content.
- `agent.generate` requires an explicit local-model action and shows a compact saved
  preparation state after acceptance. Internal generated values are not dumped into chat.

Pending controls become disabled while submitting. No optimistic fulfilled result is
shown before storage confirmation. Accepted responses become immutable compact text.
Waiting/paused runs have pause/resume/end controls; terminal runs retain their history
and completed runs show a completion item. Ended/integrating sessions cannot mutate runs.

Exercise blocks stay anchored after the last saved ordinary message at launch. A
resumed exercise updates the same labelled block; it does not pretend later exercise
events occurred as individually time-ordered ordinary messages. Multiple completed
blocks are retained; only one waiting or paused root is allowed per session. The cap
is 32 runs per session and the existing 16 MiB encrypted-session plaintext limit.

## Durable session publication

The native Host owns a reserved `_patternRuns` field in the encrypted session array.
Each entry pins its pilot, ordinary-message anchor and validated core checkpoint.
`SessionRunStore` implements the existing `AtomicStore` protocol by publishing the
whole encrypted session file during CAS, before returning effects or transcript items.
It is not the non-durable fixture MemoryStore.

Session loads, ordinary autosaves and Pattern operations share a cross-process lock.
An ordinary frontend save cannot supply/replace `_patternRuns`; native storage merges
the latest reserved field for retained session IDs. Thus a stale React autosave cannot
undo an accepted exercise reply. Root/revision checks reject stale Pattern commands.

Deleting a session or clearing all sessions removes its exercises in the same file
publication—there are no orphan session-run files. Clearing messages changes a reset
token, removing attached runs; stale pre-reset commands fail closed. Native storage checks
the matching prior reset token when publishing a reset, so an older autosave cannot
roll back the reset or erase newer runs. The frontend waits
for the session/reset save acknowledgement before loading or starting exercises.
Separate Settings-preview progress is intentionally not deleted by these operations.

Writes retain the existing Keychain key and authenticated session encryption envelope,
use private no-follow file opens, a same-directory exclusive temporary file, file sync,
atomic rename and directory sync. Reads are size-bounded; stale temporary ciphertext is
cleaned under the lock. Missing/inaccessible/corrupt storage never becomes plaintext or
browser storage. Backups may retain previously saved encrypted data.

## Failure and AI context

Unknown saves and rejected fulfillments block further exercise actions until an explicit
reload. The draft remains available; reload never resends a reply or auto-generates.
If the previous save succeeded despite a lost acknowledgement, reload shows that saved
result. Otherwise the same pending effect remains available for an explicit retry.

Local generation uses only the rendered effect prompt, shared identity and baseline
safety instructions. Ordinary conversation, legacy technique prompts and ambient state
are not injected into this request. Ordinary chat likewise does not silently incorporate
the exercise transcript; the user can explicitly quote material when continuing chat.
There is no cloud fallback. Unmount/stop aborts the owned request, and navigation ignores
late results. Generation has a two-minute limit. External inference can repeat after a
crash before acceptance; accepted generations are restored without regeneration.

## Verification

Native tests cover encrypted restart, full accepted-history projection, immutable earlier
runs, session separation, stale autosaves, wrong reply types, revision races across Host
instances, pause/resume identity, deletion/reset/clear and read-only sessions. The existing
M6 tests cover generated contracts, child routing and scoped provider cancellation.

React tests cover the real SessionScreen/Composer handoff, draft separation, no accidental
ordinary-model call, stable choice values, rating values, safe content/turn display,
immutable fulfilled states, double submission, unconfirmed save recovery, late navigation
results, generation cancellation and save-acknowledgement gating. A temporary synthetic
browser fixture was reviewed in light/dark themes and completion state, then removed.
No real model, microphone, private sessions or signed-app/Keychain restart was exercised
manually. Portable-core tests remain unchanged and pass.

M8 is the local Pattern Library and draft/revision model. Source imports, compiled
`!refine`, PWA bridging, bulk migration and Patternverse remain outside this milestone.
