---
id: look-for-the-decisive-unknown
type: pattern
title: "Look for the Decisive Unknown"
summary: "Focus investigation on the uncertainty that could actually change what you choose."
status: published
aliases:
  - "Expose the Decisive Unknown"
  - "Decisive Unknown"
  - "Value of Information"
tags:
  - ai-usage
  - thinking-with-language-models
  - decision-making
  - uncertainty
  - research
verses:
  - decision-making
  - ai-usage
---

Complex decisions often contain dozens of uncertainties.

How much will it cost?

Will I enjoy it?

Will demand increase?

How will the market change?

How difficult will implementation be?

Will my priorities be the same in two years?

This can create the impression that you need more information about everything.

Usually you do not.

Some unknowns would barely affect the decision even if resolved completely. Others could flip the answer.

The decisive unknown is the uncertainty whose resolution has the greatest chance of changing what you choose.

Imagine deciding whether to open a café.

You are uncertain about décor, supplier prices, menu design, branding, staffing, foot traffic, rent, customer preferences, and opening hours.

After some analysis, you realize that almost everything depends on one question:

**Is there enough weekday customer traffic at this location to support the required revenue?**

If the answer is clearly yes, several business models become viable. If it is clearly no, optimizing the menu is largely irrelevant.

That is the decisive unknown.

The pattern changes information gathering from:

**What else could I learn?**

to:

**What information would actually change my decision?**

This is a subtle but powerful distinction.

Suppose you are considering accepting a job in another city. You could spend hours researching restaurants, neighborhoods, tax rates, weather, transportation, and cultural events.

But perhaps your decision really turns on whether the employer will permit three days of remote work.

Until that is known, most of the other research has little decision value.

Or imagine choosing between two software architectures. The team has debates about elegance, future extensibility, performance, developer familiarity, and ecosystem maturity. Eventually they realize both architectures would be acceptable unless expected traffic exceeds a particular threshold.

The decisive unknown becomes expected load.

Once found, it concentrates effort.

This pattern is closely related to the formal idea of the **value of information**: information is valuable when obtaining it can change what you do enough to justify the cost of obtaining it.

You do not need to calculate this formally to benefit from the principle.

A useful test is:

**Imagine I knew the answer to this question with certainty. Could it realistically change my choice?**

If the answer is no, the unknown may be interesting but not decisive.

A second test is:

**Could the plausible range of answers cross a decision boundary?**

Suppose an option remains clearly preferable whether a project takes four months, six months, or eight months. Better schedule information is unlikely to change the decision.

But if the project is worthwhile only when it can launch within six months, then schedule uncertainty becomes critical.

This pattern also protects against research as procrastination. Gathering more information feels productive and postpones the discomfort of commitment. Decisive-unknown thinking imposes discipline: after the important uncertainties have been resolved as far as practical, additional research may have very little value.

Of course, some decisions have several decisive unknowns. And sometimes the decisive unknown cannot be resolved cheaply—or at all. Recognizing this is still useful. You can then decide whether to accept uncertainty, protect against downside, preserve optionality, or run a small experiment.

The key is not to eliminate uncertainty.

It is to find the uncertainty that matters.

## Using this pattern with language models

Many weak answers are not caused by poor reasoning. They are caused by one missing fact.

You ask an LLM whether you should use a local database or a cloud database. It gives a nuanced comparison. Halfway through reading it, you realize that the answer changes completely depending on whether the application must work offline.

You ask how to structure a course. The model writes several paragraphs before it becomes clear that the real issue is whether the students already know the prerequisites.

You ask why a system is slow. The model lists twelve possible bottlenecks, but one measurement—whether the delay occurs before or after the database query—would eliminate most of them.

Not all missing information is equally valuable.

The useful question is:

> **Which unknown, if resolved, would most change what we should do?**

Expose that unknown first.

![A decisive question splits the investigation into Answer A leading to Action A and Answer B leading to Action B.](/diagrams/ai-usage/look-for-the-decisive-unknown.svg "Ask the question whose different answers lead to different next actions.")

### From missing information to valuable information

When context is incomplete, a common prompting strategy is:

> Ask me any questions you need.

That is better than guessing, but it has a weakness. The model may produce a long interview:

- What is your budget?
- What framework are you using?
- How many users?
- What is your deadline?
- What platforms?
- What is your preferred design style?
- What are your performance requirements?

Some of these questions may matter. Others may not affect the answer at all.

A better approach asks the model to reason about the **value of information**.

> What is the single missing fact that would most change your recommendation?

Now the model is not merely looking for absent details. It is estimating which uncertainty is decision-relevant.

That is a more powerful operation.

### A technical example

Suppose an application occasionally loses user edits.

There are dozens of possible causes:

- failed network requests,
- race conditions,
- stale state,
- database errors,
- autosave timing,
- multiple tabs,
- optimistic updates,
- browser storage problems.

The model could immediately generate a large debugging checklist.

But suppose the decisive unknown is:

> Are the lost edits visible in the network request payload?

If **no**, the problem is probably upstream in client state or autosave logic.

If **yes**, attention shifts downstream toward transport, backend processing, or persistence.

One observation divides the search space.

That is a decisive unknown.

A good LLM interaction might therefore begin:

> Before suggesting fixes, identify the observation that would split the plausible causes most sharply.

Now the model becomes an information-gathering partner rather than a speculation engine.

### Decision trees are hiding everywhere

Many questions that look like ordinary requests are actually incomplete decision trees.

Consider:

> Should I build this feature?

The answer may depend on whether users are already attempting the underlying task manually.

If they are, the feature may solve an observed problem.

If they are not, the problem may be hypothetical.

That unknown may be more important than implementation cost, UI design, or technical elegance.

A useful mental model is:

**Possible worlds → missing observation → worlds separate → better action**

The best next question is often the one that divides plausible worlds into groups that lead to different actions.

### Why this matters with LLMs

Language models are unusually capable of filling gaps.

That is one of their strengths.

It is also one reason missing context can be hard to notice.

If you omit an important assumption, the response usually does not collapse. The model supplies a plausible assumption and continues smoothly.

The resulting answer may therefore sound more certain and complete than the underlying information warrants.

Asking for the decisive unknown interrupts this process.

Instead of silently completing the problem, the model inspects the uncertainty surrounding it.

This is especially valuable whenever plausible assumptions lead to different actions.

### Example: choosing a tool

Imagine asking:

> Which note-taking system should I use?

The model could compare Notion, Obsidian, Apple Notes, Logseq, and others.

But perhaps the decisive unknown is:

> Do you want to organize information manually, or do you want the system to work even if you barely organize anything?

That preference may change the recommendation more than dozens of feature comparisons.

Notice that this is not merely “ask more questions.”

It is **find the branching variable**.

### Example: explaining something

The same pattern applies outside decisions.

Suppose someone says:

> I don't understand monads.

The model could launch into a detailed tutorial.

But the decisive unknown might be what exactly is failing:

- the category theory vocabulary,
- the motivation,
- the type signatures,
- the relationship to familiar programming constructs,
- or the laws.

An answer aimed at the wrong gap can be technically excellent and practically useless.

Asking:

> Which distinction should we clarify to determine what part is actually confusing?

can dramatically shorten the path to understanding.

### Decisive does not mean certain

The model may be wrong about which unknown matters most.

Treat its proposal as a hypothesis.

Sometimes two or three unknowns have similar information value. In that case, it can be useful to ask for a small ranked set and explain how each answer would change the next step.

For example:

> Identify the three highest-value unknowns. For each one, show how different answers would change your recommendation.

That makes the reasoning inspectable.

### When not to use it

The pattern is unnecessary when the cost of gathering information exceeds the cost of trying something.

If changing a button label takes thirty seconds, there is little reason to conduct an elaborate uncertainty analysis. Make the change and observe what happens.

This connects naturally to **Smallest Useful Experiment**: sometimes the best way to resolve the decisive unknown is not another question but a cheap experiment.

The pattern is most useful when:

- the decision is expensive or difficult to reverse,
- there are many plausible explanations,
- context is incomplete,
- the model is producing broad generic advice,
- additional data is available but expensive to collect,
- or you feel that the conversation contains lots of information but still lacks one crucial piece.

The goal is not to eliminate uncertainty.

It is to find the uncertainty worth eliminating.

## Practice — Find the Question That Could Flip the Decision

**Purpose:** Focus research and experimentation on information with real decision value.

**Time:** 10–15 minutes.

Write your current leading option.

Now list the major things you are uncertain about.

For each unknown, ask:

**If I learned the answer with certainty, could that realistically make me choose differently?**

Mark each as:

**No effect / Might matter / Could flip the decision**

Take the unknowns marked **Could flip the decision** and ask:

1. What range of answers is plausible?
2. At what point would my choice change?
3. Can I obtain better information?
4. What would obtaining it cost?
5. Could a small experiment answer it?

Finish the exercise with one sentence:

**Before deciding, the most valuable thing for me to learn is ______ because ______.**

If no unknown could realistically change the choice, further research may not be the thing you need. The next step may simply be to decide.

## Related patterns

[[prefer-the-smallest-useful-experiment|Prefer the Smallest Useful Experiment]] · [[run-a-premortem|Run a Premortem]]

- [[separate-exploration-from-selection|Separate Exploration from Selection]] — Distinguish a lack of possibilities from a lack of information.
- [[choose-the-representation-before-solving|Choose the Representation Before Solving]] — Represent the question as branches that lead to different actions.

```patternverse-language
:language 1
:title "Find the Question That Could Flip the Decision"

step_1 = !form {
  :title "Name the current leading option"
  !show {
10–15 minutes. Many unanswered questions are creating a research loop, but only a few would change the choice. No AI is needed. Answers remain only in this open worksheet; copy anything you want to keep.
  }
  !show {
Write your current leading option, even if it is provisional. You need a choice to compare possible new information against.
  }
  !ask leading-option {
    :required true
    :multiline true
What option are you currently leaning toward?
  }
}

step_2 = !form {
  :title "List the major unknowns"
  !show {
List the major things you are uncertain about. Avoid researching them yet.
  }
  !ask unknowns {
    :required true
    :multiline true
What are the major unknowns?
  }
}

step_3 = !form {
  :title "Test whether answers would matter"
  !show {
For each unknown, ask: **If I learned the answer with certainty, could that realistically make me choose differently?**

Mark each as **No effect / Might matter / Could flip the decision**.
  }
  !ask impact {
    :required true
    :multiline true
How would you classify each unknown's effect on the decision?
  }
}

step_4 = !form {
  :title "Examine the decisive questions"
  !show {
Take the unknowns marked **Could flip the decision**. Some decisions have several; sometimes none can be resolved cheaply.

For each, identify the plausible range of answers and the point at which your choice would change.
  }
  !ask range {
    :required true
    :multiline true
What range of answers is plausible for the decisive unknowns?
  }
  !ask boundary {
    :required true
    :multiline true
At what point would your choice change?
  }
}

step_5 = !form {
  :title "Compare ways to learn"
  !show {
Information has decision value when it changes what you do enough to justify obtaining it. Some uncertainty cannot be eliminated; you may instead protect downside or preserve optionality.
  }
  !ask better-information {
    :required true
    :multiline true
Can you obtain better information, and how?
  }
  !ask information-cost {
    :required true
    :multiline true
What would obtaining it cost in time, effort, money, or delay?
  }
  !ask small-test {
    :required true
    :multiline true
Could a small experiment answer it?
  }
}

step_6 = !form {
  :title "Choose the most valuable next question"
  !show {
Finish with one sentence: **Before deciding, the most valuable thing for me to learn is ______ because ______.**

If the crucial uncertainty cannot be resolved, say what you will preserve, protect, or knowingly leave uncertain.
  }
  !ask learning-priority {
    :required true
    :multiline true
What is the most valuable thing to learn before deciding, and why?
  }
}

-> end
```
