---
id: choose-the-representation-before-solving
type: pattern
title: "Choose the Representation Before Solving"
summary: "Choose a form that reveals the important relationships before asking a model to solve the problem."
status: published
tags:
  - ai-usage
  - thinking-with-language-models
  - representation
  - reasoning
  - problem-structuring
verses:
  - ai-usage
---

Some problems are difficult because the answer is difficult.

Others are difficult because the problem is represented badly.

A long paragraph describing a software system may become obvious when converted into a dependency graph. A confusing historical narrative may become clear on a timeline. A product decision may become manageable as a table of alternatives and criteria. A complex workflow may reveal its flaws as a state machine.

Language models make it easy to move directly from a question to prose.

Sometimes that is exactly the wrong first move.

Before solving the problem, choose the representation that makes the structure visible.

![A raw problem can become a timeline, graph, matrix, or state machine. A useful view reveals structure that informs the solution.](/diagrams/ai-usage/choose-the-representation-before-solving.svg "Choose the view that exposes the relevant relationship, then inspect it before solving.")

## The hidden power of intermediate representations

Consider this request:

> Help me redesign the onboarding flow. Users create an account, sometimes import existing data, may connect an integration, can skip profile setup, and need to select a workspace before entering the app. Some people are invited to an existing workspace rather than creating one.

A model can discuss this in paragraphs.

But the important structure is not primarily verbal. It concerns states, branches, prerequisites, and transitions.

A more useful first step might be:

> Represent the onboarding flow as states and transitions before suggesting changes.

Now contradictions become easier to spot:

- Can a user connect an integration before a workspace exists?
- What happens if an invited user skips profile setup?
- Which states are optional?
- Which transitions can fail?
- Where can the user resume after interruption?

The representation exposes the problem.

Only afterward does redesign make sense.

## Representation determines what becomes easy to see

Different forms foreground different relationships.

A **timeline** makes sequence and duration visible.

A **matrix** makes systematic comparison visible.

A **tree** makes branching decisions visible.

A **graph** makes relationships and dependencies visible.

A **state machine** makes allowed transitions visible.

A **hierarchy** makes containment and abstraction visible.

A **table** makes recurring attributes comparable.

A **rubric** makes evaluation criteria explicit.

A **causal loop** makes feedback visible.

A **map** makes spatial relationships visible.

A **taxonomy** makes categories and boundaries visible.

A **worked example** makes transformation visible.

The question is therefore not merely:

> What information do we have?

It is:

> In what form would the important relationships become easiest to reason about?

## An example: choosing an architecture

Suppose you ask:

> How should this system be architected?

The model might immediately propose services, databases, and APIs.

Instead, ask it first to represent the domain:

> Before proposing an architecture, model the major entities, responsibilities, information flows, and boundaries.

This prevents an implementation vocabulary from arriving too early.

Once the domain structure is visible, the architecture can respond to it.

This matters because premature implementation can distort understanding. If you begin with “Which microservices do we need?”, you have already assumed microservices are the appropriate representation of the system.

Choosing the representation first creates a small pause between **understanding the thing** and **deciding how to build it**.

## An example: understanding an argument

Imagine asking an LLM to analyze a philosophical essay.

A prose summary may simply reproduce the essay at lower resolution.

Instead:

> Represent the central argument as premises, intermediate claims, objections, and conclusions.

Now you can see whether a conclusion actually follows from its premises.

Or ask:

> Create a map showing which claims depend on which others.

The result becomes a structure you can inspect.

Again, the representation performs part of the reasoning.

## Representation is compression

A good representation discards irrelevant detail while preserving important relationships.

That is why it helps.

A subway map does not preserve the exact geography of a city. It preserves connectivity.

A musical score does not preserve the sound of a performance. It preserves a useful structure from which performance can be reconstructed.

A software interface diagram does not preserve every line of code. It preserves components and their relationships.

The art is choosing what information should survive the compression.

An LLM can help with this choice:

> What representation would make the bottleneck in this problem most visible?

That question is often more useful than:

> Solve this.

## Don't force everything into diagrams

The pattern has an obvious failure mode: representation theater.

A simple question does not become deeper because it has been turned into a matrix.

Some tasks are already expressed in the right form. Others depend on nuance that a rigid representation destroys.

For example, a table comparing emotional experiences may falsely imply that fuzzy, contextual qualities are cleanly separable.

Representation is useful when it reveals structure, not when it merely makes an answer look organized.

The test is simple:

> Does this form make a relationship easier to inspect than prose would?

If not, prose may be better.

## Multiple representations can expose different truths

For especially complex problems, one representation may not be enough.

A product can be represented as:

- a user journey,
- a state machine,
- a data model,
- a component hierarchy.

Each view answers a different question.

This is analogous to technical drawings of a physical object. A front view, side view, and cross-section are not competing descriptions. They expose different dimensions.

You can therefore ask:

> Give me two different representations of this problem and explain what each makes visible that the other hides.

This can be surprisingly powerful.

## Why LLMs make this pattern practical

Humans often avoid restructuring information because doing so takes time.

Turning notes into a taxonomy, building a comparison matrix, or drawing a dependency map can require significant manual effort.

An LLM dramatically lowers that cost.

That means representation can become an ordinary reasoning step rather than something reserved for formal analysis.

The workflow becomes:

**Raw problem → useful representation → inspect structure → solve**

The important insight is that the second step is not cosmetic formatting.

It is part of thinking.

Often, a problem that appears difficult in prose becomes almost mechanical once represented correctly.

And sometimes the greatest contribution an LLM can make is not supplying an answer.

It is helping you discover what shape the problem should have before you try to answer it.

## Related patterns

- [[look-for-the-decisive-unknown|Look for the Decisive Unknown]] — A decision tree makes the branching variable visible.
- [[preserve-the-invariants|Preserve the Invariants]] — Preserve important relationships when compressing information.
- [[reframing-identify-problem-form|Identify the Problem Form]] — Clarify what kind of problem is being represented.
