---
id: cbt-coping-card
type: pattern
title: "Create a coping card"
summary: "Write a short personal reminder combining perspective, action, and support."
status: published
verses:
  - therapy
---

Write a short personal reminder combining perspective, action, and support.

## How to use it

Work with a manageable everyday situation. The sequence below is an invitation, not an assessment. You can skip by ending the exercise, correct your wording, or stop at any time.

1. In what manageable recurring situation would a reminder help?
2. What balanced statement feels credible rather than overly reassuring?
3. What safe action and available support would you like to remember?
4. Write a short final card in your own words.

## With mira

[Open this technique in mira](/apps/mira?technique=cbt.coping-card). Review the selection before starting. This scripted exercise can run offline; it makes no AI requests. Your answers are saved on this device in the session's encrypted exercise state. They are not automatically inserted into ordinary AI chat.

## Scope and source

An original self-reflection adaptation of CBT principles, not a complete treatment protocol or a clinically validated chatbot intervention. It cannot assess risk. Avoid overwhelming or traumatic material; stop if distressed and consider qualified support. Acceptance never means accepting abuse, danger, or an unwanted situation.

Judith S. Beck, *Cognitive Behavior Therapy: Basics and Beyond*, 3rd edition (2020). [Beck Institute resources](https://beckinstitute.org/cbt-resources/resources-for-professionals-and-students/cbtresources/).

## Executable Pattern Markdown

The same version-1 source is bundled in mira. This view is for inspection; it does not execute automatically.

```text
:language 1
:title "Create a coping card"
:output outcome
= focus "Write a short personal reminder combining perspective, action, and support."
!use therapy.ready as readiness {
    :with focus
}
?branch {
    :when readiness.decision.value == "begin" -> explore
    :when readiness.decision.value == "support" -> support
    :else -> declined
}
explore:
!ask step1 {
    In what manageable recurring situation would a reminder help?
}
!ask step2 {
    What balanced statement feels credible rather than overly reassuring?
}
!ask step3 {
    What safe action and available support would you like to remember?
}
!ask step4 {
    Write a short final card in your own words.
}
!show {
    Your reflection, in your own words:

    1. {{step1}}
    2. {{step2}}
    3. {{step3}}
    4. {{step4}}

    You may leave this here. Nothing needs to feel resolved.
}
= outcome "reflected"
-> end
support:
!show {
    Stop the exercise. If anyone is in immediate danger, contact local emergency services. Reach a trusted person or qualified crisis support if you can. This exercise cannot provide emergency care.
}
= outcome "support_requested"
-> end
declined:
!show {
    We can leave this here. You do not need to explain or finish.
}
= outcome "declined"
-> end
```
