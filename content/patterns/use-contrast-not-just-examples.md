---
id: use-contrast-not-just-examples
type: pattern
title: "Use Contrast, Not Just Examples"
summary: "Pair the desired result with a nearby but wrong example to make subtle boundaries visible."
status: published
tags:
  - ai-usage
  - thinking-with-language-models
  - examples
  - contrast
  - communication
verses:
  - ai-usage
---

You ask an AI to make a paragraph warmer. It adds enthusiasm, praise, and exclamation marks. That is not what you meant. You wanted the message to acknowledge a difficult situation while remaining calm and direct.

You could keep searching for a better adjective. Another approach is to show two nearby versions and explain why one fits while the other goes too far.

Many preferences become easier to communicate when their boundaries are visible.

## The core idea

Pair a desired example with a nearby but unsuitable example, then name the difference that matters. Contrast helps communicate a distinction that a broad label or a positive example alone leaves ambiguous.

The useful comparison is often between two plausible answers: concise and abrupt, restrained and flat, playful and distracting. An obviously terrible example usually teaches less because it does not expose the boundary you are struggling to describe.

A three-part set can show both sides: **too little → target → too much**. The goal is to make your criterion observable while leaving room for a different result that satisfies it.

![Three neighboring examples: Too little, Target, and Too much. The target is distinguished by the amount of useful detail, not decoration.](/diagrams/ai-usage/use-contrast-not-just-examples.svg "Show the target and its neighboring boundaries; name the distinction that matters.")

## Why it works

An example contains many properties at once. A dashboard you like may have a dark background, rounded cards, short labels, and a strong hierarchy. Without explanation, the model has to infer which properties are relevant. It might copy the colors when you care about the order in which information becomes visible.

Contrast supplies another point of comparison. If two examples share their palette but differ in hierarchy, your explanation can identify hierarchy as the relevant feature. The prompt now carries more information about your preference.

It also helps you clarify your own judgment. Explaining why a nearby alternative misses the mark often reveals a more useful criterion than “make it professional.”

This is a practical account of communicating preferences, not a guarantee that the model will generalize correctly. It may still imitate wording, overemphasize a superficial difference, or apply the distinction outside its useful context.

## How to use it

Choose examples that isolate the distinction as far as possible. State what is important and what is incidental:

> Version A is close to the tone I want. Version B is too effusive. The difference that matters is the amount of praise, not sentence length. Write a new version for this situation without reusing either example's wording.

For an abstract task, compare the level of thinking:

> “Batch independent writes” describes a reusable approach. “Call this particular function” describes one implementation. I want patterns at the first level, with implementation examples afterward.

If the output still misses, use that result as the next contrast. Identify one meaningful difference rather than adding a stack of vague adjectives.

Check the new answer in its actual context. A sentence can match your example's tone yet omit information the reader needs. Contrast communicates a dimension of quality; it does not replace the rest of the task brief.

## A worked example

A support team wants help drafting a message about a delayed delivery. “Write a friendly apology” produces an upbeat note thanking the customer for their “amazing patience” and describing the team's excitement about resolving the issue. The facts are present, but the tone feels inappropriate.

The editor provides two short examples:

> Close to the target: “Your order has been delayed. We expect to dispatch it on Thursday, and we'll send tracking details when it leaves.”
>
> Too effusive: “Thank you so much for your incredible patience! We're thrilled to get your order moving very soon!”

Then she explains:

> Acknowledge the inconvenience directly, give the next concrete step, and avoid praise or excitement. The examples show tone only; use the actual order details below and do not invent a dispatch date.

The revision becomes calmer and more useful. It still says “we guarantee” before a date that is only an estimate. The editor corrects that against the order information. Matching tone has not ensured factual accuracy.

For a second customer, the circumstances are different: the replacement date is unknown. The team keeps the same distinction but supplies different facts. The resulting message acknowledges the delay and promises an update by a specific time without pretending that delivery itself is scheduled.

The pattern transfers because the team has named the underlying relationship between tone, acknowledgment, and concrete information, rather than treating one approved sentence as a universal template.

## When it helps—and where it falls short

Use contrast when feedback such as “cleaner,” “more natural,” “deeper,” or “less corporate” repeatedly fails. It is useful for writing, visual hierarchy, explanation depth, classification boundaries, and deciding what counts as an example of a concept.

A common mistake is choosing examples that differ in too many ways. If the wanted version is short, warm, factual, and informal while the unwanted one is long, cold, inaccurate, and formal, the intended lesson remains unclear. Explain the relevant difference explicitly.

Another is accidental overfitting. The model may reproduce your example's phrasing or layout even when the new situation requires something else. Ask for a fresh application, then inspect whether the principle survived.

For exact requirements, use exact rules. A defined data format, a maximum length, or an observable behavior should be stated directly. Contrast is especially valuable for fuzzy boundaries; it need not carry constraints that can be expressed more clearly in another form.

## Related patterns

[[preserve-the-invariants|Preserve the Invariants]] — Identify which qualities matter across different examples or revisions.

[[draft-the-prompt-together|Draft the Prompt Together]] — Turn a tacit preference into a clearer instruction.

[[choose-the-representation-before-solving|Choose the Representation Before Solving]] — Use a comparison when it exposes the relevant boundary.
