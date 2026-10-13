---
id: reframing-validate-frame
type: pattern
title: "Validate the Frame"
summary: "Design a small real-world check that could strengthen, weaken, or refine a promising frame."
status: published
tags:
  - reframing
  - validation
  - experiments
  - learning
verses:
  - creativity
attribution: "Original Patternverse adaptation inspired by Thomas Wedell-Wedellsborg, What's Your Problem? Not an official implementation."
---

A compelling reframe can be just as seductive as the original story. Validate the Frame treats each interpretation as a hypothesis with observable implications. The goal is not to prove the new idea right; it is to learn which frame better predicts what happens, using the smallest reasonable check. This turns reframing from a clever conversation into a guide for action.

Imagine two accounts of abandoned signups:

> **Frame A:** The form is confusing.  
> **Prediction:** Removing unnecessary fields or clarifying labels should materially improve completion, especially at the troublesome step.

> **Frame B:** Visitors do not yet see enough value to provide their details.  
> **Prediction:** A clearer demonstration of the benefit before signup should help more than a cosmetic form change.

A cheap comparison could combine a short observation of where people hesitate, a few interviews, and a limited page test. If people understand the form but decline to provide details, Frame B gains support. If they intend to sign up but cannot complete the fields, Frame A gains support. Either result can be mixed; the test should allow the frame to be refined rather than force a winner.

A workplace example begins with “The team misses dates because planning is poor” versus “Unplanned work enters after planning.” For two weeks, record planned work, incoming requests, and where work waits. A high rate of late arrivals would strengthen the second frame; stable scope with repeated estimation errors would strengthen the first. The measurement is simple enough to try without a large reorganization.

In personal life, “I avoid exercise because I lack motivation” competes with “the chosen time conflicts with my actual day.” Trying the same modest activity at two different times for a week might reveal whether timing matters. That does not reduce a person to a metric; it gives them information for the next choice.

A useful validation plan names the frame, its prediction, the proposed observation or limited experiment, and what supporting and disconfirming results would imply. Favor low-cost, reversible steps and existing evidence when possible. Avoid tests that burden other people without consent or that create a high-stakes intervention before uncertainty is reduced.

The chief failure mode is confirmation seeking: selecting a question that can only support the preferred story, or interpreting every result as success. Another is demanding laboratory certainty where a few practical observations would already improve the decision. [[reframing-generate-real-options]] supplies meaningfully different candidates; this pattern compares their consequences in the world. The result may send you back to [[reframing-rapid-reframe]] with a better starting frame.

## Related patterns

[[reframing-rapid-reframe]]

## Source

Inspired by Thomas Wedell-Wedellsborg's *What's Your Problem?* This is an original Patternverse procedure, not reproduced book text or an official implementation.

## Executable Pattern Markdown

```text
:language 1
:title "Validate the Frame"
:input frame text
:output validation_plan

!agent proposed_plan {
    :returns text

    Frame to test: {{frame}}
    Propose one small, reversible real-world learning step. State what observation would support this frame, what would weaken it, and how the test distinguishes this frame from a plausible alternative.
    Do not ask for more abstract analysis and do not present the frame as established fact.
}
!ask next_step {
    A possible test is: {{proposed_plan}}

    What concrete step, if any, would you actually choose to try? You can change or decline the suggestion.
}
= validation_plan concat(proposed_plan, concat(" Participant's chosen next step: ", next_step))
!show {
    The frame remains a hypothesis. Your tentative learning plan: {{validation_plan}}
}
-> end
```
