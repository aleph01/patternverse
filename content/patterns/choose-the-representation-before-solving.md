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

A paragraph describes an onboarding flow: users create an account, sometimes import data, may join an existing workspace, and can skip several setup steps. You ask an AI to improve it. The answer contains sensible suggestions, but you still cannot tell whether an invited user can reach the application without creating a second workspace.

The information is present. Its relationships are hard to inspect in prose.

Before asking for a solution, ask what form would make the important structure visible.

## The core idea

Choose a representation that exposes the relationships relevant to the problem, then inspect it before solving. A timeline reveals order and duration. A comparison table aligns recurring attributes. A dependency graph shows what relies on what. A state machine distinguishes allowed transitions from impossible ones.

The sequence is **raw problem → useful representation → inspect → solve**. The intermediate representation is part of the reasoning, because it determines which questions become easy to ask.

Sometimes prose is already the most useful form. The pattern calls for a deliberate choice, not a diagram for every task.

![A raw problem can become a timeline, graph, matrix, or state machine. A useful view reveals structure that informs the solution.](/diagrams/ai-usage/choose-the-representation-before-solving.svg "Choose the view that exposes the relevant relationship, then inspect it before solving.")

## Why it works

A narrative can hide a missing transition, an inconsistent comparison, or a dependency spread across several paragraphs. A suitable representation brings those relationships together. Empty cells, unsupported links, and disconnected states become easier for a reader to notice.

Asking the AI to build that structure also narrows its immediate task. Instead of simultaneously interpreting the situation and proposing a solution, it first makes an account of the situation available for correction. You can challenge that account before a recommendation depends on it.

This explanation concerns visibility and the opportunity to check intermediate work. A diagram does not establish that its contents are true. A model may omit a branch, invent a relationship, or compress away an important exception. The representation helps only if it preserves the features that matter and you compare it with the source.

## How to use it

Start with the relationship you need to understand. Ask about sequence, comparison, dependency, branching, or change over time, then select a suitable form.

> Represent this onboarding flow as states and transitions. Include the invited-user route and failure paths described in the source. Mark unspecified behavior as unknown rather than completing it yourself. Do not propose improvements yet.

Inspect the result for omissions and unsupported assumptions. If the model has invented a mandatory profile step, correct it before requesting a redesign.

Then ask for a solution that refers to the structure:

> Using the corrected flow, identify where a user can become stuck and propose the smallest changes that preserve the workspace rules.

For an argument, the representation might be premises, claims, and evidence. For a decision, it might be a table containing options, criteria, and unknowns. Two complementary views can be useful when one form cannot express the whole problem, but each should answer a specific question.

## A worked example

A small product team asks an AI to simplify its onboarding. The initial response recommends fewer screens, a progress indicator, and clearer button labels. None addresses a recurring support problem: invited users sometimes create an empty workspace before finding the shared one.

The team supplies the existing flow and asks for a state table. Each row contains a state, the information available there, the actions allowed, and the destination of each action. The model marks several missing transitions as unknown.

Reviewing the table reveals that “account created” has only one documented next state: “create workspace.” Invitation acceptance appears later, after that step. The interface may look like a sequence of sensible screens, but the representation exposes a mismatch between two user routes.

The team corrects one detail the model inferred incorrectly: an invitation can exist before account creation. They add that fact to the table, then ask for a revised route. Invited users can now accept the existing workspace, while people without an invitation continue to workspace creation.

Before building anything, the team walks through an expired invitation and a user with several invitations. The first revision did not handle either. The table makes those gaps easier to locate, but the team still has to decide the intended behavior.

A similar move helps with research writing. Turning a fluent summary into a claim–evidence table can reveal that three paragraphs repeat a claim without adding support. It can also expose a source that was summarized inaccurately. The table guides the check; the original source remains necessary.

## When it helps—and where it falls short

Use this pattern when information is plentiful but relationships remain unclear: workflows, dependencies, comparisons, arguments, schedules, and systems with branching behavior. It is particularly useful before a large recommendation or redesign.

Avoid representation theater. A matrix that repeats prose in smaller boxes may make nothing easier to inspect. Ask which relationship the new form reveals and whether that relationship matters to the next decision.

Every representation leaves something out. A subway map preserves connectivity while simplifying geography. A comparison table can make uncertain judgments look more precise than they are. Keep ambiguity visible and retain the source where nuance matters.

If producing and maintaining the representation costs more than the problem warrants, use a lighter form. A short list of dependencies may do the work of a complex graph. The useful form is the one that improves the next judgment without creating unnecessary upkeep.

## Related patterns

[[look-for-the-decisive-unknown|Look for the Decisive Unknown]] — Represent different answers as branches leading to different actions.

[[preserve-the-invariants|Preserve the Invariants]] — Keep important relationships intact when simplifying a representation.

[[work-in-inspectable-steps|Work in Inspectable Steps]] — Inspect an intermediate representation before work depends on it.
