# Realized wording and cancellable functional loops

Pattern Markdown controls **what happens**. `~` controls how a predetermined
conversational move is expressed. This extension is available in the Rust core,
desktop chat and Pattern Library preview; it does not update the website.

| Form | Responsibility |
| --- | --- |
| Literal Markdown, including `{{value}}` | Exact author wording and ordinary interpolation; no inference |
| `~` | Fixed intent, flexible grammar and wording |
| `!agent` / `!turn` | Explicit delegated reasoning or generation under the existing contract |

## Realization syntax

```pattern
!ask worry {
    What are you afraid would happen?
}
!ask consequence {
    ~ Ask what would be worst if {{worry}} happened.
}
!show {
    ~ {
        Briefly acknowledge {{consequence}} without interpreting it.
        Do not add a question or advice.
    }
}
-> end
```

Both `~ instruction` and `~ { ... }` produce a distinct realization node. A standalone
`~` is displayed as content, like a realized `!show`. In V1, a realized `!ask` or
`!show` must contain exactly one realization and no additional literal body text.
Realization bodies contain text and references only: no nested realization, actions,
agents, branches or transitions. Escape reserved syntax when it is intended as text.
`!realize` describes the conceptual primitive, not an additional public spelling.

References follow normal scope and type/field checks. Undefined references are errors.
Literal text such as `You rated this {{rating}} out of 10.` is unchanged. Only an
explicit `~` requests AI wording.

## Semantic data and wording constraints

The runtime emits `language.realize` with two separate fields:

```json
{
  "specification": "Ask what would be worst if {{worry}} happened.",
  "inputs": {"worry": {"type": "text", "value": "I wouldn't find another job."}}
}
```

Values are **not interpolated into the author instruction**. The desktop adapter
sends the specification with a constrained wording contract and sends the tagged
values separately as untrusted JSON data. Instruction-like user content stays data.
Generated wording is never parsed or executed as Pattern source.

The contract permits grammatical changes—person, tense, clause structure, morphology
and natural phrasing—but prohibits added propositions, interpretations, diagnoses,
reassurance, advice, unrelated questions or decisions about the next step. Negation,
uncertainty, hypothetical framing, temporal meaning, roles and emotionally important
wording must be preserved. One conversational move is the default.

For example, `I wouldn't find another job.` can become:
“If you couldn't find another job, what would be the worst thing about that?”
It must not become a claim that unemployment will happen or add inability to pay rent.

Chat supplies at most a short participant-language sample, preferring the current
exercise's latest text answer. The adapter requests that language, falling back to
the semantic inputs and then the specification. This is presentation data, not new
instructions. It does not send the full conversation, other sessions, editable
modality/technique prompts or the general agent prompt to the realization step.

These boundaries constrain the model and prevent its output from controlling the
runtime. They do **not** mathematically guarantee faithful natural language. Tests use
fixture replies for English, German, fragments, negation, hypotheticals and
instruction-like content; live-model semantic evaluation remains necessary.

## Functional loops: `?loop[max]`

```pattern
!ask initial_worry {
    What are you afraid would happen?
}
?loop[10] worry = initial_worry {
    !ask next_worry {
        ~ Ask what would be worst if {{worry}} happened. Keep it hypothetical.
    }
    -> repeat next_worry
}
!show {
    Okay. Let's stop there.
}
-> end
```

The bracket parameter is an optional nonnegative integer: `[10]` permits ten total
iterations, including the first. `[0]` skips the body. Omit the bracket parameter
(`?loop worry = initial_worry { ... }`) for no authored maximum; there is no hidden
default iteration limit. Platform resource limits still apply.

Every loop is UI-cancellable. There is no opt-in `:cancelable` or custom cancel-label
flag. Desktop chat and preview expose **Stop loop**, including while AI wording is
being prepared and while paused. Stopping exits this loop normally and executes its
continuation. **End exercise** remains the separate action that cancels the whole Run.
Stopping while paused resumes the continuation; for a loop inside a child Pattern,
this also resumes paused ancestors waiting for that child.

- Initial state is evaluated once. Each iteration has fresh immutable local bindings.
- `-> repeat expression` starts a new iteration with that value as its state.
  Its type must match the initial state. It does not mutate an outer binding.
- `-> break`, body fallthrough, reaching the maximum and Stop loop all continue
  after the loop. No exception handling is needed.
- State and body-local bindings do not escape the loop or shadow outer bindings.
- V1 bodies are straight-line. `repeat`/`break` must be last; nested loops,
  collections, child calls and branch jumps inside the body are rejected.
- A repeated iteration must include an explicit participant interaction (`ask`,
  `rate`, `choose` or `select`). An AI-only/pure repeat is rejected so an unbounded
  loop cannot spin without giving the participant a stopping opportunity.

There is no automatic “core fear reached” inference or implicit technique switch.

## Delivery, restart and trace

Realization is a separate pending effect before the resulting question/content.
Chat automatically requests its wording once using the selected local model; ordinary
agent steps remain explicit. Preview defaults to fixture replies and requires an
explicit real-AI choice/click. A failure does not advance the Pattern or use a cloud
fallback. Reload restores the pending step; accepted wording is stored and not regenerated.

The accepted `realized` result is nonempty and limited to 32,000 UTF-8 bytes. The
resulting `interaction.ask` has its own identity, distinct from `language.realize`.
Receipts, loop state and StopLoop events use existing checkpoint/replay contracts.
Stop is correlated to the exact pending effect; a stale stop cannot exit a later
iteration, and late AI results cannot revive a stopped loop. In-flight model work
is aborted; an already-started durable save must settle before another state change.

Preview and execution traces distinguish the specification, semantic inputs and
accepted surface wording. Ordinary chat displays the resulting question only, not
the author instruction. No hidden reasoning is requested or stored. These explicit
inputs and results can contain sensitive content and receive the same protection
as the rest of the local conversation checkpoint.

## Examples beyond worry chains

These snippets assume their referenced bindings were collected earlier; each makes
one scripted move rather than delegating therapeutic judgment:

```pattern
!ask evidence {
    ~ Ask what evidence the user sees for the thought {{belief}}, without asserting it is true.
}
!ask prediction {
    ~ Ask what the user predicts would happen if they tried {{action}}.
}
!ask fit {
    ~ Ask whether the user's phrase {{felt_phrase}} still fits their felt sense. Do not interpret it.
}
!show {
    ~ Briefly acknowledge {{answer}} without interpretation, advice or another question.
}
```

## Bundled CBT example

[`cbt.worry-chain`](../../packages/therapy-patterns/patterns/cbt.worry-chain.pattern.md)
is available under CBT's guided exercises and in the Pattern Library. It is an
opt-in language-feature demonstration, not a full worry-exposure treatment protocol
or clinically validated intervention. It warns that dwelling on feared consequences
can intensify worry, invites a manageable topic and never requires a core fear or all
ten questions. It is manually selectable, not proactively suggested. It does not
interpret, challenge, reassure or decide when the participant should stop.

Its [fixture](../../packages/therapy-patterns/scenarios/cbt.worry-chain.json) uses
synthetic model replies, restarts at realization/question boundaries, and exercises
`stop_loop` through the actual persistence layer. The original six scripted episodes
still require no model inference; this additional example requires the local model
for its explicit `~` steps.
