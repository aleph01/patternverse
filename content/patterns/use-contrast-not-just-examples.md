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

Suppose you want an LLM to write in a style you find understated.

You provide an example.

The model sees short sentences, concrete nouns, little ornament, and dry humor. Which of those characteristics matters? Perhaps all of them. Perhaps only one.

An example demonstrates what belongs inside a category.

It does not always reveal the category's boundary.

Contrast does.

Instead of only showing what you want, show what is **nearby but wrong**.

The difference between the two often communicates more than either example alone.

![Three neighboring examples: Too little, Target, and Too much. The target is distinguished by the amount of useful detail, not decoration.](/diagrams/ai-usage/use-contrast-not-just-examples.svg "Show the target and its neighboring boundaries; name the distinction that matters.")

## Categories are defined by boundaries

Consider these instructions:

> Keep the prose emotionally restrained.

That phrase admits many interpretations.

Now add two examples:

**Wanted:**

> He looked at the empty chair for a moment, then carried both cups back to the kitchen.

**Not wanted:**

> The empty chair struck him with the unbearable weight of everything he had lost.

Suddenly “emotionally restrained” is much more concrete.

The distinction is not “do not write about emotion.” The first example is full of emotion. The difference lies in how explicitly it is named and amplified.

Contrast reveals that boundary.

## Why positive examples can mislead

A single example contains many properties that are incidental.

Imagine showing an LLM a dashboard you like. It contains:

- a dark background,
- three columns,
- large numbers,
- small labels,
- rounded cards,
- a particular typography,
- restrained use of color.

You may actually care about the information hierarchy.

The model may infer that you care about dark mode and cards.

The problem is underdetermination: many rules could explain the same example.

A contrasting example removes possibilities.

> I like A because the hierarchy is obvious even though it contains a lot of information. I dislike B because every metric has equal visual weight. The card shapes and colors are irrelevant.

Now the signal becomes much clearer.

In machine-learning terms, you have supplied both positive and negative evidence.

In ordinary language: you have shown the model where the line is.

## Contrast can be subtle

The most informative negative example is not always something obviously bad.

Compare:

> Write a friendly email.

A poor contrasting example might be openly hostile. That teaches very little. The model already understands that hostility is not friendliness.

A better contrast is something close to the target:

**Wanted:** warm, concise, direct.

**Too far:** warm but overly enthusiastic and full of exclamation marks.

The narrower the distinction, the more useful the contrast can become.

This is especially important for qualities such as:

- understated versus flat,
- rigorous versus academic,
- playful versus silly,
- concise versus abrupt,
- simple versus simplistic,
- confident versus overconfident,
- poetic versus ornate,
- informal versus sloppy.

These are fuzzy boundaries. Definitions help, but contrasts make the differences visible.

## Contrast in technical tasks

The pattern is not limited to style.

Suppose you are extracting reusable patterns from books.

You might tell the model:

> A pattern should be a reusable response to a recurring situation.

Then provide contrast:

**Pattern:** “Separate reversible from irreversible decisions.”

**Not a pattern:** “Jeff Bezos calls some decisions two-way doors.”

The first describes transferable knowledge.

The second is an anecdotal attribution.

Or:

**Pattern:** “Batch independent database writes.”

**Not a pattern:** “Use `executemany()` in Python.”

The first expresses a broadly reusable strategy.

The second is one implementation.

These pairs teach the conceptual level you want.

## Contrast as debugging

Contrast is also a powerful way to correct an LLM after an unsatisfactory result.

Suppose the model generates six product ideas and they all feel like minor feature additions.

Instead of saying:

> Make them more innovative.

you can identify the boundary:

> These are feature ideas: they extend the current product while keeping the same basic interaction model. I want concept ideas: approaches that could change how the user performs the task entirely.

Then give one example of each.

That is much more informative than an adjective like “innovative.”

Many difficult prompt iterations become easier once the user stops searching for a better adjective and instead shows a pair of neighboring cases.

## Contrastive sets

Sometimes one pair is not enough.

You can build a small contrastive set:

**Too little**  
The article is only a definition and a few bullets.

**Target**  
The article develops a mental model, gives concrete examples, explains limitations, and remains readable.

**Too much**  
The article becomes an academic survey with citations for every sentence and excessive theoretical background.

Now the desired region has boundaries on both sides.

This “too little / target / too much” structure is particularly useful when controlling:

- length,
- technical depth,
- humor,
- formality,
- visual density,
- abstraction,
- creativity,
- assertiveness.

## Why the pattern works

Words such as “clean,” “professional,” “natural,” “elegant,” and “deep” describe large semantic territories.

People often believe these instructions are precise because they know what the words mean *to themselves*. The model has access only to the words and surrounding context.

Contrast externalizes the distinction.

Rather than trying to define “not too polished but still professional” perfectly, you can demonstrate:

> This feels too corporate. This feels too casual. Aim between them, closer to the second.

Contrast converts tacit preference into observable structure.

## Don't overfit the examples

There is a danger.

If examples are too detailed or the instruction implies exact imitation, the model may reproduce surface characteristics rather than infer the underlying distinction.

The remedy is to name the difference explicitly:

> The important distinction is the amount of emotional interpretation, not sentence length or subject matter.

Examples plus explanation are usually stronger than examples alone.

The goal is not copying.

It is discrimination.

When you need an LLM to understand a subtle category, especially one that you find difficult to define, do not only ask:

> Can I show you what I mean?

Ask:

> Can I show you what I mean—and what I almost mean, but don't?

That second example may carry more information than the first.

## Related patterns

- [[preserve-the-invariants|Preserve the Invariants]] — Separate essential qualities from incidental features.
- [[choose-the-representation-before-solving|Choose the Representation Before Solving]] — Use a comparison format when it reveals the important boundary.
- [[reframing-generate-real-options|Generate Real Options]] — Distinguish conceptually different options from cosmetic variations.
