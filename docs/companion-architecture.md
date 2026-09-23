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
existing Patternverse Dropbox sync is not end-to-end encrypted, so it must not
receive conversation transcripts. Any future session sync requires an explicit
opt-in and an end-to-end-encrypted design. A model adapter must name the active
local or remote provider and must not fall back to a cloud provider silently.

## Migration sequence

1. **Core and contracts (started):** establish source-qualified session state,
   pure transitions, and storage/reply ports with tests.
2. **Rust bridge:** expose the existing Pattern Markdown engine through a
   stable adapter contract. Validate native desktop and browser feasibility
   before deciding whether a WebAssembly build is appropriate.
3. **Storage adapters:** load and save versioned sessions in encrypted local
   storage. Provide an explicit, tested migration from existing Mira session
   formats; never overwrite or discard originals during import.
4. **Svelte companion:** build the Mira conversation, session list, modality
   selection, and pattern-selection flows inside the Patternverse shell.
   Connect the UI to the core and real platform adapters, not placeholder
   responses.
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
