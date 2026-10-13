---
id: make-trade-offs-explicit
type: pattern
title: "Make Trade-offs Explicit"
summary: "Name what each option gives you and what it asks you to sacrifice."
status: published
aliases:
  - "Name the Exchange"
  - "Explicit Trade-Offs"
tags:
  - decision-making
  - trade-offs
  - priorities
verses:
  - decision-making
---

Many difficult decisions are difficult for a legitimate reason: there is no option that gives you everything.

One job pays more but requires commuting.

Another gives you autonomy but less security.

A third offers interesting work but limited advancement.

People often respond by continuing to search for the option that somehow combines the salary of the first, the freedom of the second, and the intellectual appeal of the third.

Sometimes that option exists. Often it does not.

Decision-making becomes clearer when you stop treating disadvantages as defects that must be eliminated and start treating them as **trade-offs that must be chosen**.

A trade-off exists whenever improving one valued dimension tends to worsen another.

Speed versus thoroughness.

Income versus leisure.

Specialization versus flexibility.

Performance versus simplicity.

Privacy versus convenience.

Short-term comfort versus long-term development.

These tensions appear because resources and systems have constraints. Time spent on one thing cannot simultaneously be spent on another. A product optimized for simplicity cannot contain every advanced feature. A highly diversified investment may reduce certain risks while limiting concentrated upside.

Making trade-offs explicit does not mean reducing everything to numbers. It means naming what each option gives you and what it asks you to give up.

Consider someone choosing between two apartments.

Apartment A is large, inexpensive, and thirty-five minutes from the city center.

Apartment B is small, expensive, and five minutes from work and friends.

The question is not simply “Which apartment is better?” They are packages of competing benefits.

The more revealing question might be:

**How much living space and money am I willing to exchange for an extra hour of usable time each day?**

That exposes the actual decision.

Trade-offs also help when arguments repeat endlessly. Two colleagues may appear to disagree about the best technical architecture. Eventually they discover they mostly agree about the facts. One values rapid delivery more strongly; the other places greater weight on maintainability under future growth.

Their disagreement is partly a preference disagreement, not an engineering mystery.

This connects directly with **Map Outcomes, Likelihoods, and Preferences**. Many apparently factual decisions contain subjective judgments about which consequences matter most.

A common failure is creating a giant weighted decision matrix containing fifteen criteria, each scored from one to ten. This can produce an impressive-looking answer without improving thinking. Criteria may overlap, arbitrary scores create false precision, and the final number can conceal rather than illuminate the core tension.

Often two or three trade-offs dominate.

Another mistake is treating every disadvantage as equally important. Paying €20 more each month and adding an hour to a commute are both “cons,” but they may have dramatically different importance.

A good decision therefore asks not merely:

**What are the pros and cons?**

but:

**What am I gaining, what am I sacrificing, and which exchange am I actually willing to make?**

Once the trade-off is visible, a difficult choice may remain difficult—but it becomes difficult for the right reason.

## Practice — Name the Exchange

**Purpose:** Reveal the central sacrifices hidden inside a choice.

**Time:** 10 minutes.

Take two or three serious options.

For each, complete:

**Choosing this gives me ______, but I give up ______.**

Do this several times until the differences become concrete.

Then identify the two or three dimensions that actually matter most.

Write the decision as an exchange:

**How much ______ am I willing to sacrifice for more ______?**

Examples:

- How much salary am I willing to sacrifice for more free time?
- How much convenience am I willing to sacrifice for more privacy?
- How much certainty am I willing to sacrifice for greater potential upside?

Do not calculate a final score.

Notice which trade-off produces the strongest reaction. That often reveals what the decision is really about.

## Related patterns

[[map-outcomes-likelihoods-and-preferences|Map Outcomes, Likelihoods, and Preferences]] · [[define-the-decision-before-comparing-options|Define the Decision Before Comparing Options]]

```patternverse-language
:language 1
:title "Name the Exchange"

step_1 = !form {
  :title "Name the serious options"
  !show {
10 minutes. No option gives you everything, or repeated arguments conceal different priorities. No AI is needed. Answers remain only in this open worksheet; copy anything you want to keep.
  }
  !show {
Take two or three serious options. Focus on real alternatives, not an imagined option that gives you every benefit at once.
  }
  !ask options {
    :required true
    :multiline true
What are the two or three options?
  }
}

step_2 = !form {
  :title "Name each exchange"
  !show {
For each option, complete several times: **Choosing this gives me ______, but I give up ______.**

Keep the gains and sacrifices concrete.
  }
  !ask gains-sacrifices {
    :required true
    :multiline true
For each option, what do you gain and what do you give up?
  }
}

step_3 = !form {
  :title "Find what matters most"
  !show {
Identify the two or three dimensions that matter most. Do not treat every disadvantage as equally important.
  }
  !ask dimensions {
    :required true
    :multiline true
Which two or three dimensions dominate this decision?
  }
}

step_4 = !form {
  :title "State the central trade-off"
  !show {
Write the decision as an exchange: **How much ______ am I willing to sacrifice for more ______?**

Examples: salary for free time; convenience for privacy; certainty for potential upside.
  }
  !ask exchange {
    :required true
    :multiline true
What is the central exchange you are considering?
  }
}

step_5 = !form {
  :title "Notice your response"
  !show {
Do not calculate a final score. Notice which trade-off produces the strongest reaction; it may reveal what the decision is really about. A clear trade-off can remain genuinely difficult.
  }
  !ask reaction {
    :required true
    :multiline true
Which exchange produces the strongest reaction, and what does it tell you about your priorities?
  }
}

-> end
```
