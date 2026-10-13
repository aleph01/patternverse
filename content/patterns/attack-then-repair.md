---
id: attack-then-repair
type: pattern
title: "Attack, Then Repair"
summary: "Challenge a proposal with concrete failure scenarios, then repair it without losing its valuable core."
status: published
tags:
  - ai-usage
  - thinking-with-language-models
  - critique
  - failure-modes
  - iteration
verses:
  - ai-usage
---

An LLM can make an idea sound good remarkably quickly.

Give it a proposed architecture and it can explain why the architecture is sensible. Give it a business idea and it can articulate its advantages. Give it an argument and it can make the argument clearer and more persuasive.

This fluency creates a particular danger: **plausibility can arrive before robustness**.

Once an answer sounds coherent, it becomes tempting to refine its presentation rather than challenge its substance.

A useful counter-pattern is to make criticism a distinct phase.

First propose.

Then attack.

Then repair.

![A loop moves from Propose to Attack to Repair to Test again. Preserve the valuable core stays at the center.](/diagrams/ai-usage/attack-then-repair.svg "Separate construction, criticism, and repair. Test again while preserving the valuable core.")

## Why criticism should come after construction

If criticism is introduced too early, it can suppress useful ideas.

Ask a model to devise “an innovative but realistic product idea with no major flaws,” and the constraints fight each other during generation. The result may be safe but uninspired.

Instead:

> Propose a bold solution.

Then:

> Now assume this solution fails. Find the strongest reasons it could fail.

Then:

> Revise the solution to address the most serious weaknesses without losing the qualities that made the original attractive.

Each phase has a different objective.

Generation tries to build.

Attack tries to break.

Repair tries to preserve value while reducing fragility.

This is different from simply asking:

> Improve your answer.

“Improve” provides no mechanism. Attack and repair provide a process.

## Attack the strongest version

Good criticism is not random negativity.

Suppose the model proposes using a local-first architecture for a collaborative application.

A superficial attack might say:

> Synchronization could be complicated.

True, but not especially useful.

A stronger attack asks:

- What happens when two devices modify the same object offline?
- Which data types cannot be merged automatically?
- What happens if migrations occur while a client has been offline for six months?
- What consistency guarantees are users actually expecting?
- Which operations become dangerous if authorization is checked only after synchronization?

Now the critique generates design information.

The point is not to produce objections for their own sake.

It is to search for **failure modes that would change the design**.

## Role reversal can help

One way to strengthen the attack phase is to deliberately switch perspective.

After writing a proposal:

> Review this as a skeptical security engineer.

or:

> Review this as the maintainer who will inherit the system in two years.

or:

> Review this from the perspective of a new user encountering it for the first time.

Different perspectives reveal different failure surfaces.

A founder may notice strategic weakness.

A support agent may notice operational complexity.

A user may notice confusing assumptions.

A database engineer may notice consistency problems.

You do not need theatrical role-playing. The useful part is selecting an adversarial lens that exposes information the original perspective tends to ignore.

## Attack assumptions, not only implementations

Some of the most valuable critiques happen one level above the proposed solution.

Suppose you ask for a feature that automatically categorizes every incoming note.

The model designs a sophisticated classification system.

Attack could focus on accuracy, latency, taxonomy drift, or model costs.

But a deeper challenge might be:

> Why does every note need a category at all?

Perhaps the feature solves the wrong problem.

This is why a strong attack phase looks at several layers:

- **execution:** can this actually work?
- **failure:** what happens when it goes wrong?
- **assumptions:** what must be true for this to be useful?
- **incentives:** how might people respond differently than expected?
- **edge cases:** where does the model break?
- **alternatives:** is there a simpler way to achieve the same goal?

The attack phase is most valuable when it is allowed to challenge the frame, not merely polish implementation details.

## Repair is not replacement

After criticism, there is a temptation to discard the original idea entirely.

That is often wasteful.

A proposal usually contains something valuable, or it would not have survived the generation phase.

Repair asks:

> Which weaknesses are fundamental, and which can be addressed while preserving the core advantage?

Suppose a proposed interface relies heavily on keyboard shortcuts. The attack phase reveals that new users may never discover them.

Replacement might remove keyboard shortcuts.

Repair might preserve them while adding discoverability: contextual hints, a command palette, visible shortcut labels, and gradual onboarding.

The resulting system keeps the original strength—speed for experienced users—while addressing the weakness.

This connects closely to **Preserve the Invariants**.

Repair works best when the model knows what qualities of the original solution should survive.

## Don't ask the model to perform a ritual

There is a common weak version of this pattern:

> Critique your answer.

The model dutifully produces three mild caveats:

- it may require resources,
- implementation details may vary,
- more testing is needed.

Nothing changes.

The critique has become ceremonial.

A better attack prompt creates stakes:

> Identify three concrete scenarios in which this design would produce a bad outcome. At least one must challenge a core assumption rather than an implementation detail.

Or:

> Try to construct a counterexample that breaks the rule you proposed.

Or:

> What would make us regret this decision six months from now?

These prompts force the critique toward consequences.

## The attack should be proportional

Not every task needs adversarial analysis.

If you ask an LLM to write a birthday message, running a red-team phase is excessive.

The pattern becomes valuable when errors are:

- expensive,
- hard to notice,
- difficult to reverse,
- likely to hide behind plausible reasoning,
- or capable of propagating into later work.

Architecture, strategy, important writing, research reasoning, product decisions, plans, and complex code are good candidates.

The attack phase can also scale with stakes. A small decision might get one challenge. A consequential design might undergo several attack–repair cycles.

## Iterating the loop

The basic pattern is:

**Propose → Attack → Repair**

But it can repeat:

**Propose → Attack → Repair → Re-attack → Repair**

Each cycle should become more specific.

The first attack might reveal structural weaknesses.

The second can target the repaired areas.

Eventually, additional attacks begin producing minor edge cases rather than meaningful changes. That is a useful stopping signal.

The goal is not an unassailable solution. Such a thing rarely exists.

The goal is a solution that has survived deliberate attempts to expose its weaknesses.

## From agreeable assistant to thinking partner

LLMs are often used in a conversational mode where the user proposes an idea and the model helps develop it.

That collaboration feels productive because progress is visible.

But development and validation are different activities.

A model that only elaborates your ideas can become an extraordinarily sophisticated confirmation machine.

The attack phase changes the relationship.

You are no longer asking:

> Can you help me make this idea work?

You are also asking:

> What would have to be true for this idea *not* to work?

Only then do you return to construction.

The result is not pessimism.

It is better engineering of ideas.

## Related patterns

- [[preserve-the-invariants|Preserve the Invariants]] — Keep the valuable core while addressing weaknesses.
- [[run-a-premortem|Run a Premortem]] — Find concrete scenarios that would make the proposal fail.
- [[prefer-the-smallest-useful-experiment|Prefer the Smallest Useful Experiment]] — Test the repaired proposal rather than relying only on critique.
