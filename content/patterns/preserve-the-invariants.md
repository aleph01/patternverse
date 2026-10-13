---
id: preserve-the-invariants
type: pattern
title: "Preserve the Invariants"
summary: "State what must remain true while asking a language model to revise, refactor, or redesign something."
status: published
tags:
  - ai-usage
  - thinking-with-language-models
  - constraints
  - revision
  - design-intent
verses:
  - ai-usage
---

Revision sounds simple until the thing being revised has several qualities worth keeping.

You ask an LLM to make an article shorter, and it removes the example that made the argument understandable. You ask it to simplify some code, and it changes behavior that was intentionally unusual. You ask it to make a design more playful, and accessibility or information density disappears along the way.

The model followed the instruction.

It just did not know which parts of the existing solution were sacred.

Whenever you ask an LLM to change something, consider stating what **must remain true after the change**.

These are the invariants.

![A boundary labeled Invariants remain true surrounds the current artifact, transformation, and revised artifact.](/diagrams/ai-usage/preserve-the-invariants.svg "Transformation happens inside a boundary: the essential properties remain true.")

## Change happens inside a boundary

Most revision prompts describe the delta:

> Make this more concise.

> Refactor this.

> Make the interface simpler.

> Rewrite this in a warmer tone.

But a useful revision has two sides:

**What should change?**

and

**What must survive the change?**

An invariant is anything that belongs to the second category.

For prose, invariants might include:

- preserve the argument,
- keep the concrete example,
- retain uncertainty,
- do not make the tone more promotional.

For software:

- public behavior must remain unchanged,
- existing URLs must continue working,
- do not alter the database schema,
- preserve keyboard navigation,
- maintain offline support.

For product design:

- the main action must remain visible without scrolling,
- advanced users must still have access to detailed controls,
- mobile and desktop must use the same conceptual workflow.

These constraints define the safe region within which improvement can occur.

## Why ordinary revision prompts drift

LLMs do not inherently know which properties of an artifact are intentional.

Imagine a function containing what appears to be unnecessary duplication. You ask:

> Clean this up.

The model notices the duplication and extracts a shared abstraction.

But perhaps the duplication was deliberate because the two paths are expected to evolve independently.

From the surface alone, both interpretations are plausible.

The same thing happens with writing. Repetition might be accidental, or it might provide rhythm. An awkward phrase might be accidental, or it might preserve an important distinction. A long form might be verbosity, or it might be necessary completeness.

The more complex the artifact, the more dangerous the assumption that “improve” has only one dimension.

Stating invariants gives the model a map of the design intent it cannot reliably infer.

## An example in software

Suppose a Svelte application works well, but the frontend has become difficult to maintain.

A weak request would be:

> Refactor this frontend and improve the component structure.

A stronger one might say:

> Refactor the component structure to reduce duplication and clarify responsibilities. Preserve existing visible behavior, routes, keyboard shortcuts, persisted user data, and current API contracts. Do not redesign the UI as part of the refactor.

Notice how much more freedom this actually gives the model.

That may seem paradoxical. Constraints sound restrictive.

But without them, the model must constantly guess whether each change is acceptable. With them, the stable surface is clear, and the model can be aggressive inside the permitted area.

Constraints create a safer space for creativity.

## An example in writing

Suppose an essay has a strong observation but feels meandering.

You might say:

> Cut this by approximately 30%. Preserve the opening anecdote, the distinction between loneliness and solitude, and the ambiguous ending. Remove repetition before removing examples.

Now the model has priorities.

Without those instructions, “shorter” may mean compressing every section equally. With them, shortening becomes a design problem: what can disappear while the identity of the piece remains intact?

That is the heart of this pattern.

## Invariants reveal what the artifact *is*

There is another benefit.

When you identify invariants, you are forced to articulate what makes the current thing itself.

A product may contain hundreds of implementation details, but only a few define its identity.

A story may contain dozens of scenes, yet only certain emotional relationships are essential.

A software system may have complicated internals, while its true contract consists of five observable behaviors.

So invariants are not merely prompting instructions. They are a way of extracting the **stable structure beneath an implementation**.

This is especially valuable in long-running conversations with an LLM. As the artifact evolves, earlier decisions can disappear from the active context or become diluted among later instructions.

A short invariant list acts as a persistent design constitution.

## Not every constraint is an invariant

It is useful to distinguish invariants from goals.

“Make the page load faster” is a goal.

“The page must continue working without JavaScript” is an invariant.

“Make the prose friendlier” is a goal.

“Do not remove the technical terminology” is an invariant.

Goals determine where you want to move.

Invariants define the boundaries you cannot cross.

A strong revision prompt often contains both.

## Beware of too many invariants

If everything must stay the same, nothing can improve.

Users sometimes accumulate constraints after every unsatisfactory iteration until the model has almost no maneuvering room:

- keep the structure,
- keep every example,
- keep every phrase I like,
- preserve the length,
- change the tone substantially,
- make it much simpler.

Some combinations are impossible.

Invariants should represent genuinely important properties, not every accidental feature of the current version.

One useful question is:

> If this property changed, would I regard the result as a different thing or as a broken revision?

If yes, it may be an invariant.

If not, it is probably negotiable.

## Invariants can have priorities

Sometimes constraints conflict.

A refactor might preserve perfect backward compatibility but remain unnecessarily complex. A rewritten article might preserve every nuance but fail to become shorter.

Rather than pretending all invariants are absolute, they can be ranked:

**Must preserve**
- API compatibility
- stored user data

**Prefer to preserve**
- existing component boundaries
- exact keyboard shortcuts

This allows graceful trade-offs when perfection is impossible.

## A pattern for long collaborations

Preserving invariants becomes increasingly important as LLMs move from answering questions to carrying out extended work.

A coding agent may modify dozens of files. A writing assistant may rewrite a chapter repeatedly. A design agent may iterate through many versions.

At that scale, the task is no longer simply “generate something good.”

It becomes:

> Move this system toward a better state without losing the properties that made the previous state valuable.

That is a much richer problem.

And the most useful information you can give the model may not be another instruction about what to change.

It may be a precise statement of what must remain true.

## Related patterns

- [[attack-then-repair|Attack, Then Repair]] — Repair weaknesses without removing the proposal’s core advantage.
- [[use-contrast-not-just-examples|Use Contrast, Not Just Examples]] — Show the boundary between acceptable and broken revisions.
- [[choose-the-representation-before-solving|Choose the Representation Before Solving]] — Make the stable structure of the artifact inspectable.
