---
id: separate-reversible-from-irreversible-decisions
type: pattern
title: "Separate Reversible from Irreversible Decisions"
summary: "Match deliberation to the cost of being wrong and the cost of changing course."
status: published
aliases:
  - "Reversibility Check"
  - "Two-Way and One-Way Doors"
tags:
  - decision-making
  - reversibility
  - risk
verses:
  - decision-making
---

Some decisions deserve several weeks of careful thought. Others deserve twenty minutes and a willingness to change your mind.

The difficulty is that they can feel surprisingly similar while you are making them.

Someone choosing between two note-taking applications might spend days comparing features, watching reviews, and imagining which system will serve them best five years from now. At the same time, the same person might accept a job offer, sign a long lease, or make a large investment after relatively little reflection.

The useful distinction is not simply between *important* and *unimportant* decisions. It is between decisions that are easy to reverse and decisions that are costly, slow, or impossible to reverse.

A reversible decision preserves the possibility of learning after acting. You can try a different application, switch exercise routines, attend one class, experiment with a workflow, or use a service for a month. If the choice turns out badly, the cost of changing course is limited.

An irreversible decision places much more weight on what you know beforehand. Selling a company, undergoing an elective procedure, signing a difficult-to-exit contract, moving a family across continents, or publishing something permanently under your name may create consequences that cannot simply be undone.

This changes how much analysis is rational.

For reversible decisions, acting is often itself a way of gathering information. Suppose you are unsure whether you prefer working from a coworking space or from home. You could construct an elaborate comparison based on imagined concentration, social contact, travel time, and cost. But if you can rent a desk for a week, the decision is highly reversible. Trying it produces better information than continued speculation.

An irreversible decision works differently. Imagine considering a degree program that would require leaving your job, moving to another city, and spending most of your savings. You can still experiment around the edges—visit the university, speak to graduates, take an introductory course—but the central commitment deserves more careful examination because learning afterward may come too late.

Reversibility is also a spectrum. A choice can be technically reversible but practically sticky. You can leave a new job, but perhaps doing so requires another search and creates financial stress. You can move cities again, but not without considerable cost. A subscription may be trivial to cancel, while a five-year business partnership is not.

It therefore helps to ask about the **cost of being wrong** and the **cost of changing course**.

This pattern also counters a common tendency to demand certainty before action. Many everyday decisions do not require confidence because their reversibility provides protection. Instead of trying to predict perfectly, you can decide quickly, observe the result, and adjust.

The opposite mistake also occurs: treating a major commitment as though it were just another experiment. “I can always change later” may be technically true while hiding substantial financial, relational, or psychological switching costs.

The goal is not to become cautious about everything. It is to allocate deliberation where it has the greatest value.

A useful rule of thumb is:

**The harder a decision is to reverse, the more valuable careful reasoning before commitment becomes. The easier it is to reverse, the more valuable learning through action becomes.**

This connects naturally with **Prefer the Smallest Useful Experiment**. A large irreversible choice can sometimes be transformed into several smaller reversible ones. It also connects with **Look for the Decisive Unknown**: before making a difficult-to-reverse commitment, identify which remaining uncertainty actually matters.

## Practice — The Reversibility Check

**Purpose:** Match the amount of deliberation to the consequences of committing.

**Time:** 5–10 minutes.

Choose a decision you are currently considering.

Write the options and answer:

- If I choose this and dislike the result, how easily can I change course?
- How much money, time, reputation, relationship capital, or effort would changing course cost?
- How long would I be committed before I could reconsider?
- What consequences would remain even after reversing the decision?

Classify the decision as:

**Easy to reverse → Moderately reversible → Difficult to reverse**

Then choose a response:

- **Easy to reverse:** decide or test relatively quickly.
- **Moderately reversible:** gather the most important missing information first.
- **Difficult to reverse:** slow down, examine failure modes, and look for smaller preliminary experiments.

Finally ask:

**Can I redesign this decision so that the first step is more reversible than the full commitment?**

## Related patterns

[[prefer-the-smallest-useful-experiment|Prefer the Smallest Useful Experiment]] · [[look-for-the-decisive-unknown|Look for the Decisive Unknown]]

```patternverse-language
:language 1
:title "The Reversibility Check"

step_1 = !form {
  :title "Name the decision"
  !show {
5–10 minutes. You are overanalyzing a low-cost choice or considering a commitment that may be hard to undo. No AI is needed. Answers remain only in this open worksheet; copy anything you want to keep.
  }
  !show {
Choose a decision you are currently considering. Write the serious options; the same decision may have different switching costs for different options.
  }
  !ask decision {
    :required true
    :multiline true
What decision are you considering, and what are the options?
  }
}

step_2 = !form {
  :title "Examine reversibility"
  !show {
For each option, consider the costs of being wrong and changing course. A technically reversible choice can still be practically sticky.
  }
  !ask ease {
    :required true
    :multiline true
If you dislike the result, how easily could you change course?
  }
  !ask switching-costs {
    :required true
    :multiline true
What money, time, reputation, relationship capital, or effort would changing course cost?
  }
  !ask commitment-period {
    :required true
    :multiline true
How long would you be committed before you could reconsider?
  }
  !ask lasting-consequences {
    :required true
    :multiline true
What consequences would remain even after reversing the decision?
  }
}

step_3 = !form {
  :title "Match deliberation to commitment"
  !show {
Classify each option as **easy to reverse**, **moderately reversible**, or **difficult to reverse**.

Easy to reverse → decide or test relatively quickly.
Moderately reversible → gather the most important missing information first.
Difficult to reverse → slow down, examine failure modes, and look for smaller preliminary experiments.
  }
  !ask classification {
    :required true
    :multiline true
How reversible is each option?
  }
  !ask deliberation {
    :required true
    :multiline true
What response fits that level of reversibility?
  }
}

step_4 = !form {
  :title "Redesign the first step"
  !show {
A full commitment sometimes contains a smaller, reversible first move. Keep real safety, legal, and contractual constraints in view.
  }
  !ask first-step {
    :required true
    :multiline true
Can you redesign this decision so that the first step is more reversible than the full commitment?
  }
}

-> end
```
