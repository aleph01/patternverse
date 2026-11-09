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

An AI produces a persuasive proposal. The argument flows, the plan has sensible steps, and the conclusion sounds confident. You ask it to improve the answer, and it returns a more polished version. The assumptions remain untouched.

A different follow-up changes the task: “Find a concrete situation in which this would fail.” Now the conversation can expose a weakness instead of elaborating the same proposal.

Making review a separate phase is useful both for challenging an idea and for auditing a finished artifact against specific requirements.

## The core idea

Separate construction, review, and repair. First make something coherent enough to inspect. Then examine it for concrete weaknesses. Finally, address the findings while preserving the qualities that made the original worth pursuing.

The sequence is **propose → attack or audit → repair → check again**. “Attack” means testing a proposal against counterexamples and failure scenarios. An audit can be quieter: checking factual support, completeness, consistency, accessibility, or compliance with an agreed brief.

Each review pass needs a purpose. Finding an unsupported claim is a different job from checking whether the main action is easy to discover. Separate those lenses when combining them would make findings vague or difficult to act on.

![A loop moves from Propose to Attack to Repair to Test again. Preserve the valuable core stays at the center.](/diagrams/ai-usage/attack-then-repair.svg "Separate construction, criticism, and repair. Test again while preserving the valuable core.")

## Why it works

A request to create a convincing answer and a request to find weaknesses have different objectives. Giving review its own prompt makes the criterion explicit and gives you a separate set of findings to assess before anything is rewritten.

Focused passes also support comparison. A factual audit can identify a claim, its source, and a mismatch. A completeness pass can identify a requirement and where the artifact fails to meet it. Those are more inspectable than a general verdict that the work “looks good.”

Research provides qualified support for iterative feedback: [Self-Refine](https://arxiv.org/abs/2303.17651) reported improvements on its evaluated tasks. However, [research on intrinsic reasoning self-correction](https://arxiv.org/abs/2310.01798) found failures and sometimes worse results without external feedback. These studies do not establish that repeated review by the same model reliably verifies arbitrary work. Sources, tests, and human judgment remain important.

## How to use it

Choose the lens from the consequences of being wrong. For a consequential proposal, ask for concrete failure scenarios. For a finished article, start with the brief and the supplied sources.

> Audit this draft for factual support. For each finding, quote the relevant claim, identify the source passage or missing evidence, and explain the mismatch. Do not rewrite yet. Do not invent findings to reach a quota.

A separate pass might ask:

> Check whether every requirement in the brief is satisfied. Identify omissions with their location and consequence. Keep style preferences separate from unmet requirements.

Triage the findings before repair. Some are valid, some are speculative, and some reflect criteria you did not choose. Revise the supported findings, then recheck the affected parts and any essential properties that could have changed.

Changing the model or starting a fresh conversation can introduce another perspective, but neither makes the review independent evidence. Give the reviewer the actual artifact and relevant materials.

## A worked example

Lea asks an AI to draft an event information page from an organizer's notes. The result reads well, and a general review returns minor wording suggestions. Before publishing, she runs a focused completeness pass against the notes.

The audit identifies that the page gives the date and location but omits the cancellation deadline. It also claims that access instructions are missing, although they appear under a different heading. Lea accepts the first finding and rejects the second after checking the page.

Next, she requests a factual pass using the organizer's notes. It flags “free admission” because the notes specify free entry for members and a fee for guests. A final pass checks whether a first-time visitor can find the booking action and understand what happens after submitting it.

Lea asks for repairs that preserve the concise introduction and the existing booking route. The revised page restores the deadline and corrects the admission statement. She compares the changed passages with the notes and opens the booking form to check its actual behavior.

The audit passes have produced concrete corrections, but one also produced a false alarm. The useful outcome comes from connecting findings to evidence and checking the repairs, rather than counting passes or accepting every objection.

For a design proposal, the same pattern might expose offline conflicts or an unsupported assumption about user behavior. Repair could preserve the design's main advantage while adding a recovery path or testing the assumption with a small trial.

## When it helps—and where it falls short

Use separate review when errors can hide behind fluency, when several criteria matter, or when the work is consequential enough to justify another pass. Writing, research synthesis, plans, designs, and code can all benefit from a suitable lens.

Avoid ceremonial criticism: generic caveats, arbitrary issue quotas, and endless requests to “be more critical.” A useful finding changes a decision, identifies a mismatch, or leads to a check. A confident objection can be wrong too.

Repeated passes can introduce regressions or consume time without adding evidence. Stop when the relevant criteria have been checked, material findings have been addressed, and remaining uncertainty is explicit. A minor task may need one quick review; a complex artifact may need several different checks.

Preserve the valuable core during repair. Removing every distinctive feature can make a proposal easier to defend while making it less useful. Address the actual failure, then inspect whether the original purpose still survives.

## Related patterns

[[preserve-the-invariants|Preserve the Invariants]] — Keep the valuable core while addressing supported findings.

[[run-a-premortem|Run a Premortem]] — Use concrete failure scenarios to challenge an untested proposal.

[[work-in-inspectable-steps|Work in Inspectable Steps]] — Place review where its findings can steer subsequent work.
