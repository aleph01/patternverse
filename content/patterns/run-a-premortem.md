---
id: run-a-premortem
type: pattern
title: "Run a Premortem"
summary: "Imagine a plan has failed, then identify plausible causes and safeguards before committing."
status: published
aliases:
  - "Premortem"
  - "Pre-Mortem"
  - "Failure Has Already Happened"
tags:
  - decision-making
  - planning
  - risk
verses:
  - decision-making
---

Plans often look strongest just before they are tested by reality.

A team has agreed on a launch date. Everyone likes the concept. The spreadsheet works. The presentation makes sense. The obstacles feel manageable.

Asking “Does anyone see any problems?” often produces little.

Now change the question:

**Imagine it is six months later. The project failed badly. What happened?**

Suddenly people become much more imaginative.

“The supplier couldn't scale.”

“We underestimated migration work.”

“Customers didn't understand the product.”

“The two people who knew the old system left.”

“We launched before support was ready.”

This is the logic of the premortem: rather than predicting whether something will fail, temporarily assume that failure has already happened and reconstruct plausible causes.

The shift matters because ordinary planning is socially and psychologically asymmetric. Once a group has started building momentum behind an idea, criticism can feel like obstruction. Individually, commitment to an option makes us more likely to notice supporting evidence and explain away warning signs.

A premortem gives doubt a legitimate role.

Instead of asking someone to argue that the plan is bad, it asks them to explain an imagined outcome. This creates psychological distance from the current consensus.

The technique works outside formal projects as well.

Suppose you are considering moving abroad. Rather than merely listing pros and cons, imagine yourself twelve months after moving and deeply regretting it.

What happened?

Perhaps you underestimated loneliness. Perhaps employment was more difficult than expected. Maybe bureaucracy became exhausting. Perhaps the city simply did not fit your preferred lifestyle.

None of those possibilities automatically argues against moving. Their value lies in revealing what deserves investigation or protection.

Maybe you discover that social isolation is the most concerning failure mode. That can lead to concrete questions: Do you already know people there? Could you spend a month there first? Are there communities you could join? How easy would returning home be?

Premortems are particularly useful for plans with multiple moving parts because failures often arise from interactions. A project can survive one underestimated task or one delayed supplier. But two or three such problems occurring together may destroy the schedule.

They also reveal preventable failures. “A global recession occurs” may be worth noting, but you may have little control over it. “We have only one engineer who understands the deployment system” suggests an actionable vulnerability.

A weak premortem becomes a generic exercise in pessimism. “Everything could go wrong” teaches nothing. The useful question is not whether failure is conceivable—it always is—but **what plausible mechanisms would produce it**.

Another mistake is turning every identified risk into a reason not to proceed. A premortem is not a veto mechanism. Some valuable decisions are risky. The purpose is to improve the plan, identify uncertainties, and expose assumptions before reality does.

The strongest output is usually not a longer risk list. It is a handful of changes: gather information about one uncertainty, add a safety margin, create a backup, test a fragile assumption, or abandon an option whose failure modes are unacceptable.

This pattern pairs especially well with **Look for the Decisive Unknown** and **Prefer the Smallest Useful Experiment**. The premortem discovers what might break; those patterns help determine what to investigate next.

## Practice — Failure Has Already Happened

**Purpose:** Surface risks that ordinary planning may overlook.

**Time:** 10–20 minutes.

Choose a decision or plan that you currently favor.

Imagine:

**It is one year from now, and this decision turned out badly. You regret it.**

Without censoring yourself, write at least five plausible explanations for what happened.

Then classify each explanation:

- preventable,
- partially controllable,
- largely uncontrollable.

Circle the two or three failures that are both plausible and consequential.

For each, answer:

**What could I learn, change, test, or protect against before committing?**

Finish by identifying one concrete modification to the current plan.

## Related patterns

[[look-for-the-decisive-unknown|Look for the Decisive Unknown]] · [[prefer-the-smallest-useful-experiment|Prefer the Smallest Useful Experiment]]

```patternverse-language
:language 1
:title "Failure Has Already Happened"

step_1 = !form {
  :title "Choose the favored plan"
  !show {
10–20 minutes. A favored plan has momentum and ordinary questions are not surfacing its vulnerabilities. No AI is needed. Answers remain only in this open worksheet; copy anything you want to keep.
  }
  !show {
Choose a decision or plan you currently favor. Describe it enough to make the imagined failure specific.
  }
  !ask plan {
    :required true
    :multiline true
What decision or plan are you considering?
  }
}

step_2 = !form {
  :title "Assume failure has happened"
  !show {
Imagine: **It is one year from now, and this decision turned out badly. You regret it.**

Without censoring yourself, write at least five plausible explanations. Look for mechanisms, not just “everything went wrong.”
  }
  !ask failure-causes {
    :required true
    :multiline true
What are at least five plausible explanations for the failure?
  }
}

step_3 = !form {
  :title "Distinguish what you can influence"
  !show {
Classify each explanation as **preventable**, **partially controllable**, or **largely uncontrollable**. Some risks combine or amplify one another.
  }
  !ask control {
    :required true
    :multiline true
How would you classify each explanation?
  }
}

step_4 = !form {
  :title "Choose the consequential risks"
  !show {
Select two or three failures that are both plausible and consequential. A premortem improves the plan; it does not make every possible risk a veto.
  }
  !ask priority-risks {
    :required true
    :multiline true
Which two or three failure mechanisms deserve attention?
  }
  !ask protection {
    :required true
    :multiline true
For each, what could you learn, change, test, or protect against before committing?
  }
}

step_5 = !form {
  :title "Make one concrete modification"
  !show {
Turn the useful insight into a change: better information, a safety margin, a backup, a test, or a different commitment.
  }
  !ask modification {
    :required true
    :multiline true
What is one concrete modification to the current plan?
  }
}

-> end
```
