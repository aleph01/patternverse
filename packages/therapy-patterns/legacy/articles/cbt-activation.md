---
id: cbt-activation
type: pattern
title: "One manageable action"
summary: "Plan a small activity connected to care or enjoyment, with a realistic fallback."
status: published
verses:
  - therapy
---

Plan a small activity connected to care or enjoyment, with a realistic fallback.

## How it works

This guided reflection invites you to choose a manageable everyday focus, describe your experience, and decide what you wish to take forward. There is no required emotional outcome. The full steps are shown below, and you can decline or stop at any point.

[Open this technique in mira](/apps/mira?technique=cbt.activation). The existing scripted exercise runs offline without a model request. Your answers stay in the encrypted exercise state, separate from ordinary chat.

## Scope and sources

An original self-reflection adaptation, not a complete therapy protocol or a clinically validated chatbot intervention. Avoid overwhelming material and seek qualified support when needed.

Judith S. Beck (2020), *Cognitive Behavior Therapy: Basics and Beyond*, third edition. [Beck Institute resources](https://beckinstitute.org/cbt-resources/resources-for-professionals-and-students/cbtresources/).

## Executable Pattern Markdown

```text
:language 1
:title "CBT · One manageable action"
:output outcome
= focus "We can plan something small without requiring motivation or promising a change in mood. Rest and support can be legitimate choices."
!use therapy.ready as readiness {
    :with focus
}
?branch {
    :when readiness.decision.value == "begin" -> explore
    :when readiness.decision.value == "support" -> support
    :else -> declined
}
explore:
!ask direction {
    What part of today could use a little care, connection, enjoyment or structure?
}
!ask action {
    What is one small, safe action in that direction that fits your actual energy and circumstances?
}
!ask timing {
    When or after what ordinary event could you try it? This is an invitation, not a commitment you must keep.
}
!ask obstacle {
    What might get in the way?
}
!ask fallback {
    If that happens, what smaller action, rest or support would be reasonable instead?
}
!choose decision {
    :option keep "Keep this as an option"
    :option leave "Leave the plan for now"
    Your proposed action: {{action}}
    Possible timing: {{timing}}
    Your fallback: {{fallback}}

    Would you like to keep this option? It is not a test of effort or worth, and it does not need to improve your mood.
}
?branch {
    :when decision.value == "keep" -> kept
    :else -> declined
}
kept:
!show {
    Your option is saved here. If you try it, you can notice what actually happens without grading yourself. Nothing has been scheduled or carried out for you.
}
= outcome "option_kept"
-> end
support:
!show {
    Stop the exercise and seek immediate real-world support if needed. For immediate danger, contact local emergency services. A trusted person or qualified crisis service may help you get support; Mira cannot provide emergency care.
}
= outcome "support_requested"
-> end
declined:
!show {
    No action is required. You can leave the plan, rest, or return to ordinary conversation.
}
= outcome "declined"
-> end
```
