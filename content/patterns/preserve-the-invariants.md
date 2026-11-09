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

You ask an AI to shorten an article. It removes the example that made the argument understandable. You ask it to simplify a function. The result looks cleaner but treats an empty input differently. You ask for a calmer interface, and the visible keyboard controls disappear.

Each revision improves something you mentioned while damaging something you assumed would remain. The difficulty is often that the request describes the desired change more clearly than the qualities worth keeping.

Before revision, make those qualities explicit.

## The core idea

An invariant is a property that must remain true while other things change. In AI-assisted work, stating invariants gives revision a boundary: change this aspect while preserving these essential relationships, behaviors, or meanings.

For an article, invariants might include the central claim, uncertainty qualifications, and a particular example. For code, they might include public behavior and error handling. For a design, they might include the visible hierarchy and access to essential actions.

Describe properties rather than freezing every detail. “Keep every paragraph” prevents substantial shortening. “Keep the evidence needed to support the conclusion” leaves room for useful editing.

![A boundary labeled Invariants remain true surrounds the current artifact, transformation, and revised artifact.](/diagrams/ai-usage/preserve-the-invariants.svg "Transformation happens inside a boundary: the essential properties remain true.")

## Why it works

A revision request leaves many decisions unspecified. If you ask only for brevity, the model must choose what to remove using the context it has. It may infer different priorities from yours. An explicit preservation requirement supplies information that was previously available only to you.

Invariants also give you a basis for comparison. Instead of asking whether the new version feels better overall, you can inspect whether each essential property survived. In software, some properties can be checked through tests. In writing, you may need to compare claims and examples directly.

This explanation concerns task clarity and review. An instruction to preserve behavior does not prove that behavior was preserved. The model can overlook a dependency, misunderstand a requirement, or report compliance inaccurately. The invariant defines what to verify; suitable evidence determines whether the revision meets it.

## How to use it

Separate the requested change from the preservation requirements. Keep the list short enough to understand, and explain an unusual constraint when its purpose matters.

> Shorten this article by about a quarter. Preserve the central claim, the distinction between correlation and causation, and the example showing the exception. Reword freely. If the length target conflicts with those requirements, flag the conflict.

When a property is testable, identify the check rather than relying on a reassurance:

> Simplify this function. Preserve its public inputs, return values, and documented error behavior. Use the existing behavior tests and point out any case they do not cover.

Review the actual result against the list. A short account of what changed can guide that review, but it is not a substitute for inspecting the artifact. If two requirements conflict, decide which one has priority before requesting another revision.

## A worked example

Elias has written an explanation of a small observational study. It distinguishes an association from a causal claim, gives an everyday example, and explains one limitation. He asks the AI to make it concise and accessible.

The revision reads smoothly. It also changes “was associated with” to “led to,” drops the limitation, and retains a decorative introduction. The changes are individually small, but the conclusion has become stronger than the evidence.

Elias makes a second request:

> Reduce repetition and shorten the introduction. Keep the finding as an association, retain the limitation about the sample, and preserve one concrete example. Do not add factual claims. Show the revised passage first, then list any requirement you could not satisfy.

The new version cuts the introduction and combines two repetitive paragraphs. Elias compares the finding with the supplied study summary and checks that the example still illustrates association without implying causation. The AI's change note says the limitation remains; reading it reveals that the qualification is now too vague. He restores its specific meaning.

The second request helps because it identifies what matters. The final correction still requires human judgment about the source.

In interface work, the equivalent might be “reduce visual clutter while keeping the primary action visible without opening a menu.” That requirement permits changes to color, spacing, and secondary controls while protecting a concrete user capability.

## When it helps—and where it falls short

Use invariants when an artifact already has valuable qualities, when revisions keep undoing earlier decisions, or when a request such as “simplify” could affect many dimensions at once. They are particularly helpful during repeated editing, refactoring, translation, and redesign.

One common mistake is making every preference non-negotiable. An overloaded list can leave no room for improvement. Distinguish what must survive from what you merely prefer. Some tasks genuinely require changing an old assumption; preserving it would protect the problem.

Another mistake is treating a broad phrase as a precise invariant. “Keep the quality” gives little guidance. “Keep the counterexample that limits the main claim” is inspectable.

Preservation can also require tools or expertise beyond the model. Visual inspection, source comparison, accessibility checks, and behavior tests address different properties. Choose checks that match the invariant, and keep uncertainty visible when a property cannot yet be verified.

## Related patterns

[[attack-then-repair|Attack, Then Repair]] — Repair concrete weaknesses while keeping the qualities worth preserving.

[[use-contrast-not-just-examples|Use Contrast, Not Just Examples]] — Distinguish essential qualities from incidental features of an example.

[[work-in-inspectable-steps|Work in Inspectable Steps]] — Check essential properties at useful points during revision.
