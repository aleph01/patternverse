---
id: ml-constrained-decoding
type: pattern
title: 'Constrained Decoding'
summary: 'Restrict generation to tokens that preserve a specified output language, while checking completion, meaning, and application rules separately.'
status: published
verses:
  - machine-learning
---

## Purpose and problem

A library assistant must return `{"label":"RENEW"}` so a routing service can read it. Instead, it sometimes adds “Sure!”, invents another category, or leaves a quote unclosed. The team already explains the format in the prompt, but each malformed response creates another repair or retry.

Constrained Decoding moves the output contract into generation itself. At each step, the decoder permits only continuations consistent with a specified language. That can make the response easier to consume. It still leaves a second question: did the assistant choose the right label?

## Core idea

Maintain the state of a grammar or other output constraint as tokens arrive. Before selecting the next token, remove candidates that would violate that constraint. Select from the remaining candidates and update the state.

A constraint can describe a small label set, a structured object, or a programming-language grammar. [Geng and colleagues](https://arxiv.org/abs/2305.13971) demonstrate grammar-constrained generation for information extraction, entity disambiguation, and constituency parsing without task-specific fine-tuning. The pattern changes which outputs may be generated; it need not change the model's parameters.

The guarantee covers the constraint actually implemented. A valid object can contain a wrong label, an outdated identifier, or an unauthorized request. Constraints can enforce an explicit allowed-value set, but do not establish facts or permissions absent from that specification.

## How it works

Define the output language, then connect its recognizer to the model's tokenizer and decoding loop. The recognizer tracks whether the current prefix can still become an accepted output. An incomplete prefix such as `{"label":` is acceptable while generation continues, although it is not yet a complete JSON object.

For each candidate token, consider its entire contribution to the output. Model tokens can span multiple characters and grammar boundaries. A token containing both a quoted value and a closing brace must pass the combined transition, rather than being treated as one character or checked only at its beginning.

[XGrammar's explanation](https://xgrammar.mlc.ai/docs/latest/start/constrained_decoding.html) describes masking disallowed token logits to negative infinity before selection. Equivalently, for probabilities already normalized over a finite vocabulary:

`q(t | prefix) = p(t | prefix) × allowed(t, prefix) / Z`

Here `Z` is the total base probability of permitted next tokens. Greedy decoding chooses the highest remaining score; sampling draws from the renormalized distribution. The explorer uses greedy selection with explicit fictional probabilities.

Update the recognizer after each selected token. Permit the end-of-sequence token only in an accepting state. Treat an empty permitted distribution as a failure rather than silently removing the constraint. A token budget or interrupted request can still stop generation before an accepted ending, so check completion separately.

## Worked examples

### Routing a library request, fictional

The request is “Can I keep my loan another week?” A human reference label is RENEW. The miniature output language contains exactly three strings:

```text
{"label":"HOLD"}
{"label":"RENEW"}
{"label":"FIND"}
```

It deliberately fixes spacing, field order, and spelling. This finite language is smaller than all JSON serializations that could satisfy a comparable schema. The explorer recognizes its prefixes directly; it is not a general JSON Schema compiler.

After the prefilled prefix `{"label":`, five of ten toy vocabulary tokens remain possible:

| ID  | Token piece | Base | Masked         |
| --- | ----------- | ---- | -------------- |
| T1  | `"HOLD"`    | 20%  | 20/49 ≈ 40.82% |
| T2  | `"RENEW"`   | 10%  | 10/49 ≈ 20.41% |
| T3  | `"FIND"`    | 5%   | 5/49 ≈ 10.20%  |
| T6  | `"RE`       | 8%   | 8/49 ≈ 16.33%  |
| T8  | `"RENEW"}`  | 6%   | 6/49 ≈ 12.24%  |

The permitted weights sum to **20 + 10 + 5 + 8 + 6 = 49%**. Each masked probability is its original weight divided by that retained total: HOLD receives **20/49 ≈ 40.82%**. The token `Sure!`, initially highest at **25%**, is blocked. Greedy selection instead picks T1, followed by `}` and the end token. The completed output is **`{"label":"HOLD"}`**: structurally accepted, but wrong for the stated human reference. These toy token probabilities are not confidence estimates about the request's intent.

![A fictional next-token distribution is filtered for the prefix of a library label object. Five tokens retain 49 percent of the base mass. HOLD rises from 20 percent to about 40.82 percent after renormalization, and greedy decoding completes a valid HOLD object that disagrees with the human reference RENEW.](../assets/machine-learning/constrained-decoding.svg 'Masking excludes invalid continuations and renormalizes the remaining weights. It produces a valid HOLD object here, but the reference is RENEW: structural acceptance and task correctness are separate.')

```patternverse-widget
{
  "src": "ml-constrained-decoding.html",
  "title": "Constrained decoding token explorer",
  "height": 1200,
  "fallback": "At the fictional prefix, permitted tokens retain 49% of base mass. Greedy decoding completes a valid HOLD object, although the reference label is RENEW. Inspect masks and completion; no language model runs."
}
```

### Optional: token boundaries and stopping

The end-of-sequence token, abbreviated **EOS** in the explorer, marks the end of generation. A complete object and an emitted EOS are checked separately. The combined piece T8 can finish the object in one text token. The partial piece T6 must be followed by `NEW"`, then `}`. Different tokenizations can therefore reach the same accepted string. The second weight profile favors T8; it changes the computed path rather than measuring a better model.

### A structured extraction interface, fictional

A repair desk wants an object with required `item` and `location` fields, where `location` can be a string or null. A grammar compiled from a suitable schema can restrict field names and value types. For “The repaired lamp is ready,” `{"item":"lamp","location":null}` is an intended answer. `{"item":"lamp","location":"north desk"}` can also satisfy that structure while inventing a location.

[JSON Schema's object reference](https://json-schema.org/understanding-json-schema/reference/object) distinguishes declaring properties from requiring them and restricting additional properties. Specify all three deliberately. A decoder's supported schema subset and the application's validator must agree; valid JSON alone does not enforce this richer contract.

### A verified implementation

[XGrammar's JSON-generation documentation](https://xgrammar.mlc.ai/docs/latest/defining_structures/json_generation.html) shows compiling a built-in JSON grammar or a supplied schema using model-tokenizer information. This is a documented implementation, distinct from the finite-language simulator here. Its behavior and performance have not been rerun for this article.

## Assumptions for correctness

The implemented language must match the intended contract and admit useful answers. Token handling, recognizer transitions, special-token rules, and completion checks must agree with the serving system. Our simulator uses ten handcrafted string pieces, not a production tokenizer's byte handling or vocabulary.

Generation must have a viable continuation and sufficient resources to finish. A complete text object and a correctly terminated decoding run are separate observations: the explorer exposes both. Downstream parsing, task checks, and authorization still apply.

## When to use it

Use this pattern when a downstream consumer needs reliable structure: fixed classifications, typed extraction, domain-specific expressions, or structured tool arguments. It is especially useful when repeated formatting repairs otherwise dominate integration work.

For a tiny classification task, a specialized classifier may be simpler. For free-form explanation, a restrictive grammar can add unnecessary friction. Constraints should express real interface needs rather than force every interaction into an elaborate format.

## Tradeoffs and operating costs

Grammar compilation, state tracking, vocabulary matching, and masking add work. Reuse compatible compiled constraints where the implementation permits it, and measure latency and throughput on the actual schemas and serving stack. Complex or frequently changing grammars affect maintenance and caching.

Masking also changes generation preferences. [Grammar-Aligned Decoding](https://arxiv.org/abs/2405.21047) explains why local masking generally does not reproduce the original model's distribution conditioned on the entire output being valid. Do not interpret renormalized next-token scores as calibrated answer probabilities.

## Common mistakes and limitations

A prompt describing JSON is not itself a decoding constraint. Conversely, a grammar does not replace a useful prompt: describe the task and expected output so the model's preferences align with the interface.

Do not accept a valid prefix as a completed result, allow early end tokens, or silently disable constraints after a dead end. Check truncation and exceptional termination. A grammar can exclude a necessary unknown or null answer if it is defined too narrowly. Test semantic errors and business-rule violations alongside structural validity; a perfectly shaped tool call can still request the wrong operation.

## Related patterns

[[ml-schema-based-data-validation|Schema-Based Data Validation]] checks records against a contract; constrained decoding uses a constraint while creating output. [[ml-tool-augmented-interaction|Tool-Augmented Interaction]] can use structured calls, but execution permissions and outcomes belong to the surrounding application. [[ml-few-shot-in-context-learning|Few-Shot In-Context Learning]] demonstrates desired behavior without enforcing a token mask. [[ml-behavioral-testing|Behavioral Testing]] checks meaning, malformed inputs, completion, and failure handling across the complete system.

## Sources and further reading

- [XGrammar: Constrained Decoding](https://xgrammar.mlc.ai/docs/latest/start/constrained_decoding.html) — token masks, logits, and recognizer state.
- [XGrammar: JSON Generation](https://xgrammar.mlc.ai/docs/latest/defining_structures/json_generation.html) — compiling JSON grammars and schemas with tokenizer information.
- [Geng et al.: Grammar-Constrained Decoding for Structured NLP Tasks without Finetuning](https://arxiv.org/abs/2305.13971) — research across three structured prediction tasks.
- [Park et al.: Grammar-Aligned Decoding](https://arxiv.org/abs/2405.21047) — differences between local masking and conditioning on a complete valid output.
- [JSON Schema: Object reference](https://json-schema.org/understanding-json-schema/reference/object) — properties, required fields, and additional properties.
