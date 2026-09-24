# Patternverse and Mira: migration architecture

Patternverse is the product and the library. Mira is its conversational companion.
This migration keeps Mira's Rust Pattern Markdown engine; the web interface is
Svelte. The existing Mira desktop and phone apps remain operational until their
flows have been migrated and verified. No data is moved or deleted implicitly.

## Boundaries

| Part                           | Owns                                                                            | Does not own                                   |
| ------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------- |
| `@patternverse/companion-core` | Pure session transitions and reply-request descriptions                         | Clocks, IDs, persistence, network, UI          |
| Patternverse schema/workspace  | Source-qualified library entities, editing, search, local workspace             | Private Mira transcript storage                |
| Mira `pattern-core` (Rust)     | Parsing, validation, and execution of Pattern Markdown                          | Conversation UI or cloud routing               |
| Platform adapters              | Encrypted session persistence, model access, Rust/Wasm/Tauri bridge, microphone | Domain decisions                               |
| Svelte UI                      | Presentation and user interaction                                               | Pattern execution semantics or provider policy |

The core is deliberately driven by events. Its `transition` function produces a
new immutable session and a list of effects. An adapter performs each effect and
feeds the result back as another event. Time, IDs, provider selection, and
encryption stay at the edges so transitions can be replayed and tested without
browser or native APIs.

## Content and privacy

Library entities retain Patternverse's `(sourceId, entityId)` identity. A
Patternverse _pattern article_ is descriptive content; an executable Pattern
Markdown program is a distinct attached artifact. Existing linear
`PracticeDefinition` documents remain readable while a deliberate conversion
path is developed. They are not silently treated as equivalent to Pattern
Markdown programs.

Mira sessions are private data, separate from publishable knowledge. The
browser adapter encrypts sessions, prompt overrides, and the OpenRouter key with
AES-GCM before writing to its own IndexedDB database. Its non-extractable device
key is also stored in that browser profile: this protects stored data from casual
disk inspection, **not** from malicious same-origin scripts or someone who can
use an unlocked browser profile. Clearing browser storage can permanently remove
the key and transcripts, so the UI offers a passphrase-encrypted portable archive.
The archive deliberately excludes the OpenRouter key and importing it never
overwrites existing sessions. Ordinary app opening does not require a passphrase.

The existing Patternverse Dropbox sync is not end-to-end encrypted, so it must
not receive conversation transcripts. Any future session sync requires explicit
opt-in and an end-to-end-encrypted design. The browser model adapter is explicitly
OpenRouter: it requires a user-supplied key and model, sends only on user submit,
requests ZDR and denial of data collection, and disables provider fallbacks. ZDR
still sends content to a remote service for processing; it is not local inference.

## Migration sequence

1. **Core and contracts (started):** establish source-qualified session state,
   pure transitions, and storage/reply ports with tests.
2. **Rust bridge (engine migrated, native adapter started):**
   `crates/pattern-core` and the private `packages/therapy-patterns` fixtures
   now live in Patternverse and pass their Rust tests, formatting, and strict
   Clippy checks. This preserves the original language implementation; it does
   not itself connect the browser or native UI to a pattern host.
   `@patternverse/native-pattern-adapter` targets Mira's existing
   `session_pattern_run` Tauri command. It only launches an explicitly linked,
   immutable library revision and leaves execution and reply validation in
   Rust. The Svelte shell is not yet wired to that native command. Browser
   availability still needs a separate feasibility check before deciding
   whether a WebAssembly build is appropriate; there is no JavaScript
   reimplementation or cloud fallback.
3. **Storage adapters (browser path implemented):** encrypted device-local
   sessions and versioned portable archives are tested. Explicit migration from
   the previous Mira desktop/phone formats is still needed; originals must never
   be overwritten or discarded.
4. **Svelte companion (browser conversation implemented):** Mira has a main-nav
   destination, source-qualified handoff from library patterns, session creation,
   rename/delete, modality switching, editable/restorable modality prompts, and
   OpenRouter ZDR replies. The five desktop modality defaults have been copied
   without shortening them; ACT remains a compact interim default. A selected
   Commons pattern with an existing linear Practice can open that practice.
   This is _article context_, not Pattern Markdown execution. Guided technique
   selection, multi-turn exercise state, and the Rust host are not connected yet.
5. **Platform parity:** migrate phone/PWA and desktop-specific capabilities
   (voice, local model, remote ZDR provider) behind adapters. Verify privacy,
   accessibility, and existing workflow parity before retiring old UI paths.

## Definition of done

- A user can move from a library pattern into a Mira session and back in one
  product without losing source identity or private state.
- A session survives restart; import preserves existing Mira sessions.
- Native and web clients use the same domain rules and the same Rust language
  semantics where Pattern Markdown is available.
- Modality changes, active patterns, cancellations, failed replies, and stale
  asynchronous responses have deterministic tests.
- No transcript is published, synced, or sent to a provider without an
  explicit product action and visible provider choice.
