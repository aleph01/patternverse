---
id: keep-a-decision-journal
type: pattern
title: "Keep a Decision Journal"
summary: "Record reasoning and expectations before outcomes make the past seem more predictable."
status: published
aliases:
  - "Decision Journal"
  - "Decision Snapshot"
tags:
  - decision-making
  - reflection
  - calibration
verses:
  - decision-making
---

A successful outcome does not prove that a decision was good.

Suppose someone invests all their savings in a speculative asset after seeing three enthusiastic social-media posts. The price doubles.

Was it a good decision?

Now imagine another person carefully evaluates a business opportunity, checks demand, limits downside risk, and makes a reasonable investment. An unpredictable regulatory change destroys the market.

Was that a bad decision?

If decisions are judged purely by their outcomes, luck becomes indistinguishable from skill.

This makes learning surprisingly difficult.

After events unfold, the past also starts to look more predictable than it really was. Once a project fails, its warning signs can seem obvious. Once a company succeeds, its success can seem inevitable. We reconstruct our earlier expectations in light of what we now know.

A decision journal creates a record from the moment before the outcome is known.

At minimum, it captures:

**What am I deciding?**

**What do I currently believe?**

**What do I expect to happen?**

**How confident am I?**

**Why am I making this choice?**

Later, the record can be compared with reality.

The purpose is not bureaucratic documentation. It is to create feedback.

Suppose you repeatedly make estimates such as:

“I think there is about a 70% chance this project will finish within three months.”

Across many decisions, you can eventually ask whether your 70% predictions are actually right roughly seven times out of ten. Even without formal statistical calibration, patterns become visible.

Perhaps you systematically underestimate how long collaborative projects take.

Perhaps you overestimate how quickly enthusiasm will translate into sustained habits.

Perhaps your first instinct about people is often strong, but your financial forecasts are overly optimistic.

Without records, these lessons are easily replaced by stories.

Decision journals also protect against hindsight bias. Imagine reading an entry from a year ago:

“I am choosing option B. I think A has greater upside, but I estimate a substantial chance that it leaves me without enough savings. Given what I know today, I prefer B.”

If A later succeeds spectacularly, you may feel regret. But the journal allows a more precise question:

**Was the original probability estimate unreasonable, or did an uncertain outcome simply resolve in A's favor?**

That distinction matters.

The journal should remain lightweight. Recording every trivial decision would quickly make the practice useless. It is most valuable for decisions that are repeated, uncertain, consequential, or capable of teaching you something.

Examples include hiring, investing, project estimates, career moves, forecasts, product decisions, and major personal commitments.

A useful journal also records uncertainty rather than hiding it. Writing “I think this will work” is less informative than writing “I think there is roughly a 60–70% chance this works, mainly because of A and B; my biggest uncertainty is C.”

Over time, a decision journal becomes less like a diary and more like a personal dataset about how your judgment behaves.

## Practice — The Decision Snapshot

**Purpose:** Preserve your reasoning before hindsight changes it.

**Time:** 5–10 minutes per meaningful decision.

Before making a consequential decision, record:

**Decision:**  
What am I choosing?

**Options:**  
What were the serious alternatives?

**Current choice:**  
What am I leaning toward?

**Reasoning:**  
What are the main reasons?

**Expected outcomes:**  
What do I think will happen?

**Confidence:**  
How confident am I?

**Key uncertainty:**  
What am I least sure about?

**What would change my mind?**  
What evidence would make another option preferable?

Choose a review date appropriate to the decision.

When reviewing it later, answer separately:

1. What happened?
2. Was my reasoning good given what I knew?
3. Which assumptions were inaccurate?
4. What should change in future decisions?

> **Keeping the journal:** the guided worksheet below does not save responses or schedule reminders. Copy your snapshot to a notebook or document before leaving.

## Related patterns

[[map-outcomes-likelihoods-and-preferences|Map Outcomes, Likelihoods, and Preferences]] · [[look-for-the-decisive-unknown|Look for the Decisive Unknown]]

```patternverse-language
:language 1
:title "The Decision Snapshot"

step_1 = !form {
  :title "Capture the choice"
  !show {
5–10 minutes per meaningful decision. You want to learn from repeated, uncertain, or consequential decisions without confusing luck and judgment. No AI is needed. Answers remain only in this open worksheet; copy anything you want to keep.
  }
  !show {
Before making a meaningful decision, record the choice and its serious alternatives. Keep this lightweight; not every trivial choice needs a journal.
  }
  !ask decision {
    :required true
    :multiline true
What are you deciding?
  }
  !ask alternatives {
    :required true
    :multiline true
What were the serious alternatives?
  }
  !ask current-choice {
    :required true
    :multiline true
What are you currently leaning toward?
  }
}

step_2 = !form {
  :title "Record your reasons"
  !show {
Preserve the reasoning as it stands now, before you know the result.
  }
  !ask reasoning {
    :required true
    :multiline true
What are the main reasons for your current choice?
  }
}

step_3 = !form {
  :title "Record expectations and uncertainty"
  !show {
Record what you expect, how confident you are, and what you are least sure about. A rough probability range can help when appropriate; it is not a requirement or a guarantee.
  }
  !ask expected-outcomes {
    :required true
    :multiline true
What do you think will happen?
  }
  !ask confidence {
    :required true
    :multiline true
How confident are you, and why?
  }
  !ask uncertainty {
    :required true
    :multiline true
What is your key uncertainty?
  }
  !ask change-mind {
    :required true
    :multiline true
What evidence would make another option preferable?
  }
}

step_4 = !form {
  :title "Choose a review date"
  !show {
Choose a review date appropriate to the decision. This worksheet does not create a calendar event or reminder.

When reviewing later, answer separately:

1. What happened?
2. Was your reasoning good given what you knew?
3. Which assumptions were inaccurate?
4. What should change in future decisions?
  }
  !ask review-date {
    :required true
    :multiline true
When will you review this decision?
  }
  !ask review-plan {
    :required true
    :multiline true
How will you keep the snapshot and return to it?
  }
}

step_5 = !form {
  :title "Keep a durable copy"
  !show {
**Copy your answers into a notebook or document before leaving.** This worksheet holds responses only while it is open; it is not a saved journal.

You can review all earlier answers above, including after Finish. If you are reviewing an older snapshot now, use the questions below; otherwise leave this field blank.
  }
  !ask later-review {
    :required false
    :multiline true
Later review: what happened, was the reasoning sound at the time, which assumptions were inaccurate, and what should change?
  }
}

-> end
```
