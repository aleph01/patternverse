# Apps and the core therapy library

`/apps` is the extensible application directory. `/apps/mira` is the private-session
landing page. `/mira` remains the chat route, preserving existing incoming links.
The public shell is prerendered; sessions and settings load from the existing encrypted
device store only after mounting. No private data is included in public build output.

New session uses the saved preferred modality, falling back to the active session's
approach, then NARM. Changing that preference does not mutate existing sessions.
`?session=ID` opens only a matching locally saved session. Library links select a known
technique on the landing page; a new session uses its modality and opens the picker for
review. Starting still requires an explicit click. It never silently switches an existing
conversation or starts an exercise from a URL.

The readable CBT collection contains eleven patterns in curated order, including the standalone Double Standard Technique. The ten bundled Mira techniques retain their existing order. Each article includes
the exact current Pattern Markdown source and a brief source/scope note. ACT and the
former Therapy techniques umbrella collection are removed from public browsing and new
selections. General-library duplicates are removed from the chat picker in favor of the
modality-filtered executable pattern. Personal patterns are not filtered by ID collisions.

All ten CBT patterns run offline without model requests. Their old sources and retired
exercises are archived outside public content and accepted only for exact, replay-validated
existing checkpoints. Old private conversations and custom prompts are not deleted or
rewritten. A retired ACT session is labeled as such and uses neutral reflection rather than
the removed stance; its saved preference cannot create a new ACT session.

The application shell handles rendering, persistence, and navigation. Rust retains all
execution semantics, choice validation, state transitions, and checkpoint verification.
Checklist and ranking controls submit only explicit user selections to that boundary.

Validation: web type/lint checks, native Rust host tests covering all new branches,
browser integration tests for session management and checklist execution, and phone/tablet
overflow checks. Offline capability comes from existing app-shell caching plus local
encrypted storage and the bundled Rust WebAssembly engine.
