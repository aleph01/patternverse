---
id: define-the-decision-before-comparing-options
type: pattern
title: "Define the Decision Before Comparing Options"
summary: "Clarify the desired outcome and genuine constraints before judging alternatives."
status: published
aliases:
  - "Decision Framing"
  - "Rewrite the Decision"
tags:
  - decision-making
  - framing
  - clarity
verses:
  - decision-making
---

A decision can be difficult because the alternatives are genuinely close. But sometimes the difficulty comes earlier: you have not yet established what decision you are actually making.

Imagine someone saying, “I don't know whether I should quit my job.”

That sounds like a two-option decision:

**Stay** or **quit**.

But several different questions may be hiding inside it.

Is the problem the current employer? The profession? Working full-time? A particular manager? Lack of meaning? Commuting? Burnout? Salary? A desire to become self-employed?

If the real problem is working five days a week, comparing “stay forever” with “resign immediately” is a badly framed decision. Other options—reduced hours, unpaid leave, a different team, another employer, or a gradual transition—may matter more than either of the original alternatives.

Decision quality depends heavily on the frame.

A frame determines what counts as an option, what counts as success, what constraints seem fixed, and what information appears relevant. Once a frame has been accepted, later analysis can be perfectly logical while still solving the wrong problem.

This is why sophisticated comparison tools cannot rescue a poorly defined decision.

Suppose a company asks:

“Should we build feature A or feature B?”

The team might estimate engineering cost, expected adoption, revenue impact, and maintenance burden. But perhaps the underlying objective is reducing customer churn. If neither feature addresses the main reasons people leave, the entire comparison is misplaced.

A better starting point might be:

**What should we do next quarter to reduce preventable churn?**

Feature A and feature B can then compete against documentation improvements, onboarding changes, pricing changes, support improvements, or doing nothing.

The same happens in personal decisions.

“Which laptop should I buy?” may actually mean “What is the cheapest setup that lets me edit video comfortably?”

“Should I move to Berlin?” may mean “How can I have more social and cultural opportunities without losing too much stability?”

“Should we hire another employee?” may mean “How can we handle growing demand without degrading service?”

Good framing expands the decision just enough to reveal the real problem, but not so much that everything becomes an existential inquiry.

A useful decision statement contains three elements:

**What needs to change? What are we trying to achieve? What constraints genuinely matter?**

Constraints deserve special attention because people often treat assumptions as fixed realities.

“We have to choose between these two vendors.”

Do you?

“We need to decide this week.”

Why?

“I have to either continue the degree or abandon it.”

Could you pause it?

Questioning the frame does not mean rejecting every constraint. Some constraints are real: budgets, laws, health requirements, deadlines, contracts, technical dependencies. The important move is distinguishing these from constraints inherited from habit or from the first formulation of the problem.

Another common mistake is framing decisions around actions rather than outcomes. “Should I buy X?” places the proposed solution at the center. “What do I need to accomplish?” creates room for alternatives.

This pattern should therefore usually come early. Before estimating probabilities, weighting preferences, or examining trade-offs, make sure those calculations belong to the right question.

## Practice — Rewrite the Decision

**Purpose:** Turn a vague or prematurely narrowed choice into a clear decision problem.

**Time:** 10 minutes.

Write your current decision exactly as it appears in your mind.

For example:

**Should I quit my job?**

Now answer:

1. What problem am I trying to solve?
2. What would a good outcome give me?
3. Which constraints are genuinely fixed?
4. Which constraints am I merely assuming?
5. What alternatives disappear because of the way I phrased the question?

Rewrite the decision as:

**How might I ______ while preserving/avoiding ______?**

Example:

**How might I reduce the amount of exhausting work in my week while preserving financial stability?**

Generate at least three possible options under the new frame.

Do not evaluate them yet. The purpose of this practice is only to improve the question.

## Related patterns

[[make-trade-offs-explicit|Make Trade-offs Explicit]] · [[look-for-the-decisive-unknown|Look for the Decisive Unknown]]

```patternverse-language
:language 1
:title "Rewrite the Decision"

step_1 = !form {
  :title "Capture the current question"
  !show {
10 minutes. You keep comparing options but suspect that the question itself is too narrow or unclear. No AI is needed. Answers remain only in this open worksheet; copy anything you want to keep.
  }
  !show {
Write the decision exactly as it currently appears in your mind—for example, “Should I quit my job?”
  }
  !ask current-decision {
    :required true
    :multiline true
How are you currently phrasing the decision?
  }
}

step_2 = !form {
  :title "Clarify the outcome"
  !show {
Look behind the proposed action. A useful decision statement says what needs to change and what a good outcome would give you.
  }
  !ask problem {
    :required true
    :multiline true
What problem are you trying to solve?
  }
  !ask outcome {
    :required true
    :multiline true
What would a good outcome give you?
  }
}

step_3 = !form {
  :title "Separate facts from assumptions"
  !show {
Some constraints are real: budgets, laws, health requirements, deadlines, contracts, or technical dependencies. Others may come from habit or the first formulation of the problem.
  }
  !ask fixed {
    :required true
    :multiline true
Which constraints are genuinely fixed?
  }
  !ask assumed {
    :required true
    :multiline true
Which constraints are you merely assuming?
  }
  !ask excluded-options {
    :required true
    :multiline true
What alternatives disappear because of the way you phrased the question?
  }
}

step_4 = !form {
  :title "Rewrite the decision"
  !show {
Complete: **How might I ______ while preserving/avoiding ______?**

For example: “How might I reduce the amount of exhausting work in my week while preserving financial stability?”
  }
  !ask new-question {
    :required true
    :multiline true
What is your rewritten decision question?
  }
}

step_5 = !form {
  :title "Generate options without evaluating"
  !show {
Generate at least three possible options under the new frame. Do not score or choose yet; this practice is about improving the question.
  }
  !ask new-options {
    :required true
    :multiline true
What are at least three options that the new question makes visible?
  }
}

-> end
```
