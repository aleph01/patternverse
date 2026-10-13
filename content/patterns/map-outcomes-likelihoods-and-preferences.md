---
id: map-outcomes-likelihoods-and-preferences
type: pattern
title: "Map Outcomes, Likelihoods, and Preferences"
summary: "Separate possible futures, their likelihood, and how much you value them."
status: published
aliases:
  - "Outcome Map"
  - "Options Outcomes Probabilities Preferences"
tags:
  - decision-making
  - uncertainty
  - preferences
verses:
  - decision-making
---

An option is not an outcome.

Choosing to start a business does not produce “starting a business.” It opens a set of possible futures. The business might become profitable, survive modestly, fail quickly, consume far more time than expected, create valuable connections, or lead to an entirely different career.

Likewise, choosing not to start it creates its own possible outcomes.

Many decisions become muddled because we compare options as labels:

**Take the job** versus **don't take the job**.

**Move** versus **stay**.

**Launch** versus **wait**.

A richer model separates four layers:

**Option → possible outcomes → likelihood of each outcome → preference for each outcome**

Suppose you are deciding whether to accept a new job.

One possible future is that you enjoy the work, learn quickly, and earn more. Another is that the environment is stressful. Another is that you dislike it but can move again after a year.

The current job has its own outcome distribution: stability, boredom, possible promotion, future redundancy, comfortable colleagues, limited growth.

Once these possibilities are visible, two questions that are often confused become distinct.

**How much would I like this outcome?**

and

**How likely do I think this outcome is?**

People routinely blur them.

A desired outcome can start to feel more probable because we want it.

A feared outcome can dominate attention despite being unlikely.

Conversely, an outcome may be very likely but not especially important.

Consider two simplified choices:

Option A offers a 20% chance of an excellent result and an 80% chance of an unpleasant result.

Option B offers an 80% chance of a moderately good result and a 20% chance of disappointment.

There is no universal answer about which is preferable. The choice depends both on the probabilities and on how the person values the different outcomes.

This is the foundation of expected-value reasoning, but the pattern does not require precise mathematics.

In ordinary life, numbers such as “35%” may suggest more knowledge than we possess. Broad estimates—unlikely, plausible, likely—or probability ranges can still improve thinking by forcing assumptions into the open.

Preference ratings are similarly imperfect. Saying one outcome is “8/10” and another is “6/10” does not turn subjective values into objective measurements. The numbers are scaffolding for thought.

The most important insight is the separation itself.

A person might discover:

“I strongly prefer the best-case outcome of option A, but I don't actually think it is very likely.”

Or:

“I've been focusing on a frightening downside, but I think its probability is below 5%, and even if it happens it would be recoverable.”

The map can also reveal missing outcomes. People often model only success and failure. Reality usually contains many intermediate states.

A new business need not become either a unicorn or a disaster. It might become a pleasant small business. A relationship need not lead to marriage or heartbreak. It might be valuable for a few years and then end.

Good outcome maps contain enough detail to represent meaningful possibilities without branching into hundreds of hypothetical futures.

This pattern is particularly useful when uncertainty matters. If outcomes are essentially guaranteed, a simple comparison may be enough. But when different options create different distributions of possible futures, explicitly mapping them can transform vague anxiety into a structure that can be examined.

## Practice — Build an Outcome Map

**Purpose:** Separate what might happen, how likely it is, and how much you care about it.

**Time:** 15–25 minutes.

Choose two or three realistic options.

For each option, identify three to five meaningful outcomes.

Create four columns:

**Option | Outcome | Likelihood | Preference**

Estimate likelihood using either:

- rough percentages,
- ranges,
- or labels such as unlikely / plausible / likely.

Then rate preference independently.

For example:

**+5** = extremely desirable  
**0** = neutral  
**−5** = extremely undesirable

Do not calculate immediately.

First inspect the map and ask:

- Which desirable outcomes am I treating as more likely because I want them?
- Which feared outcomes might I be overweighting?
- Are there important middle outcomes missing?
- Which probability estimates drive the decision most strongly?
- Are there outcomes that matter enormously even if they are uncommon?

Only afterward, if useful, calculate rough probability-weighted values.

The map is primarily a tool for exposing assumptions, not for manufacturing a mathematically authoritative answer.

## Related patterns

[[make-trade-offs-explicit|Make Trade-offs Explicit]] · [[look-for-the-decisive-unknown|Look for the Decisive Unknown]]

```patternverse-language
:language 1
:title "Build an Outcome Map"

step_1 = !form {
  :title "Choose realistic options"
  !show {
15–25 minutes. Uncertain futures, hopes, and fears are getting mixed together while you compare options. No AI is needed. Answers remain only in this open worksheet; copy anything you want to keep.
  }
  !show {
Choose two or three realistic options. An option opens several possible futures; it is not itself the outcome.
  }
  !ask options {
    :required true
    :multiline true
What are your two or three options?
  }
}

step_2 = !form {
  :title "Map possible outcomes"
  !show {
For each option, identify three to five meaningful outcomes. Include plausible middle outcomes as well as success and failure.

Start your map as **Option | Outcome**. One line per possible outcome is enough.
  }
  !ask outcome-map {
    :required true
    :multiline true
    :placeholder "Option | Outcome"
What meaningful outcomes could follow each option?
  }
}

step_3 = !form {
  :title "Estimate likelihood independently"
  !show {
Add a **Likelihood** column. Use rough percentages, ranges, or labels such as unlikely / plausible / likely.

If you use probabilities intended to cover all mutually exclusive outcomes for one option, check that they roughly total 100%. Overlapping outcomes need not add up; avoid pretending they form a complete distribution.
  }
  !ask likelihood-map {
    :required true
    :multiline true
    :placeholder "Option | Outcome | Likelihood"
How likely is each outcome? Use the same option and outcome labels as above.
  }
}

step_4 = !form {
  :title "Rate preference separately"
  !show {
Rate desirability independently of likelihood. One possible scale is **+5 = extremely desirable**, **0 = neutral**, **−5 = extremely undesirable**.

The ratings are scaffolding for thought, not objective measurements. Do not calculate a final score yet.
  }
  !ask preference-map {
    :required true
    :multiline true
    :placeholder "Option | Outcome | Likelihood | Preference"
How much would you like or dislike each outcome?
  }
}

step_5 = !form {
  :title "Inspect the map"
  !show {
Ask:

- Which desirable outcomes are you treating as more likely because you want them?
- Which feared outcomes might you be overweighting?
- Are important middle outcomes missing?
- Which probability estimates drive the decision most strongly?
- Are there outcomes that matter enormously even if they are uncommon?
  }
  !ask assumptions {
    :required true
    :multiline true
What assumptions, missing outcomes, or influential estimates become visible?
  }
}

step_6 = !form {
  :title "Use judgment, not automatic authority"
  !show {
Only now, if useful, calculate rough probability-weighted values yourself. Labels and broad ranges may be more honest than a single number. The app does not calculate a score or recommend a winning option.

The map exposes assumptions; it does not manufacture a mathematically authoritative answer.
  }
  !ask conclusion {
    :required true
    :multiline true
What does the map clarify, and what still needs judgment?
  }
  !ask rough-calculation {
    :required false
    :multiline true
Optional rough calculation, with its assumptions and limitations
  }
}

-> end
```
