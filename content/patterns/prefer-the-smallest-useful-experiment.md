---
id: prefer-the-smallest-useful-experiment
type: pattern
title: "Prefer the Smallest Useful Experiment"
summary: "Replace speculation with the smallest safe real-world test that teaches you something important."
status: published
aliases:
  - "Smallest Useful Experiment"
  - "Micro-Experiment"
tags:
  - decision-making
  - experimentation
  - learning
verses:
  - decision-making
---

Many decisions are difficult because the information you need does not yet exist.

You can research what it is like to work as a teacher. You can interview teachers, read forums, watch videos, compare salaries, and examine training requirements. Eventually, however, you may encounter a question that research cannot answer:

**Will I actually enjoy doing this?**

That is no longer primarily an information-search problem. It is an experience problem.

The smallest useful experiment pattern asks:

**What is the cheapest, safest, fastest real-world action that would teach me something important about this larger decision?**

Suppose you are considering becoming self-employed. The maximal version of the decision might be:

Quit your job → start a company → hope it works.

A useful experiment might instead be:

Keep your job → offer the service to three clients → observe whether people pay and whether you enjoy doing the work.

You have replaced a large forecast with a smaller encounter with reality.

The word **useful** matters. Not every small action teaches you anything.

Designing a logo for your hypothetical business is small, but it tells you almost nothing about whether customers want what you plan to sell. Building a prototype and putting it in front of five potential users is more informative.

Likewise, visiting a city for a weekend may tell you whether you enjoy its atmosphere, but not whether you would like living there through winter while commuting to work. A month-long sublet could produce much stronger evidence.

Experiments therefore need to preserve something important about the real decision.

A useful experiment often tests one of four things:

**Demand:** Will people actually want this?

**Ability:** Can I realistically do this?

**Preference:** Do I actually enjoy or value this when experienced rather than imagined?

**Feasibility:** Does this work under real constraints?

The pattern is powerful because humans are often asked to predict their reaction to experiences they have never had. We construct simulations: what parenthood will feel like, what remote work will feel like, what running a business will feel like, what living alone will feel like. Those simulations contain useful information, but they are incomplete.

Real-world contact updates them.

Experiments also make failure cheaper. A failed two-week trial can be valuable because it prevents a failed two-year commitment.

However, experimentation has limitations. Some experiences cannot be meaningfully simulated. You cannot fully test parenthood for a month. An internship does not perfectly represent a twenty-year career. A first date does not reveal an entire relationship.

Experiments provide samples, not certainty.

There is also a danger of designing experiments so safe that they remove the very property you need to learn about. Performing music alone at home will not tell you whether you enjoy performing in front of people. Running a business simulation without asking anyone for money will not tell you whether customers will buy.

The best experiment is therefore not simply the smallest possible action. It is the smallest action that preserves the uncertainty you care about.

## Practice — Design a Micro-Experiment

**Purpose:** Replace speculation with a small encounter with reality.

**Time:** 10–15 minutes to design; execution varies.

Choose a larger decision you feel uncertain about.

Complete:

**The thing I wish I knew before deciding is: ______.**

Now generate three ways you could learn about it through action.

For each experiment estimate:

- effort,
- cost,
- risk,
- what it would actually teach you.

Choose the smallest experiment that still exposes you to the important feature of the real decision.

Before running it, write:

**If X happens, I will update my belief toward ______.  
If Y happens, I will update my belief toward ______.**

This prevents you from explaining away the result afterward.

## Related patterns

[[separate-reversible-from-irreversible-decisions|Separate Reversible from Irreversible Decisions]] · [[look-for-the-decisive-unknown|Look for the Decisive Unknown]]

```patternverse-language
:language 1
:title "Design a Micro-Experiment"

step_1 = !form {
  :title "Name the missing experience"
  !show {
10–15 minutes to design; execution varies. Research cannot answer how a choice will work or feel in practice. No AI is needed. Answers remain only in this open worksheet; copy anything you want to keep.
  }
  !show {
Choose a larger decision you feel uncertain about. Complete: **The thing I wish I knew before deciding is: ______.**
  }
  !ask larger-decision {
    :required true
    :multiline true
What larger decision are you considering?
  }
  !ask wish-knew {
    :required true
    :multiline true
What do you wish you knew before deciding?
  }
}

step_2 = !form {
  :title "Generate three possible experiments"
  !show {
Look for actions that test demand, ability, preference, or feasibility. Generate three ways to learn through action, rather than more speculation.
  }
  !ask experiments {
    :required true
    :multiline true
What are three possible real-world experiments?
  }
}

step_3 = !form {
  :title "Compare cost and learning"
  !show {
For each experiment estimate effort, cost, risk, and what it would actually teach you. A small action is not useful if it removes the very uncertainty you need to test.
  }
  !ask test-comparison {
    :required true
    :multiline true
For each experiment, what are the effort, cost, risk, and likely learning?
  }
}

step_4 = !form {
  :title "Choose the smallest useful test"
  !show {
Choose the smallest safe experiment that still exposes you to an important feature of the real decision. Respect consent and genuine constraints; some experiences cannot be meaningfully simulated.
  }
  !ask chosen-test {
    :required true
    :multiline true
Which experiment will you try, and what important uncertainty does it preserve?
  }
}

step_5 = !form {
  :title "Decide what the result would mean"
  !show {
Before running it, write:

**If X happens, I will update my belief toward ______.**
**If Y happens, I will update my belief toward ______.**

This makes it harder to explain away an inconvenient result. An experiment provides a sample, not certainty; you do not need to run it during this worksheet.
  }
  !ask update-rules {
    :required true
    :multiline true
What outcomes would update your belief in each direction?
  }
  !ask test-plan {
    :required true
    :multiline true
When and how could you run this experiment?
  }
}

-> end
```
