---
id: cbt-maintenance
type: pattern
title: "Make a maintenance plan"
summary: "Prepare to recognize difficulty and return to useful supports."
status: published
verses:
  - therapy
---

Prepare to recognize difficulty and return to useful supports.

## How to use it

Work with a manageable everyday situation. The sequence below is an invitation, not an assessment. You can skip by ending the exercise, correct your wording, or stop at any time.

1. What has been useful and what would you like to maintain?
2. What early signs might tell you things are getting harder?
3. Which manageable actions and trusted supports could you return to?
4. When would you seek professional support and where will you keep this plan?

## With mira

[Open this technique in mira](/apps/mira?technique=cbt.maintenance). Review the selection before starting. This scripted exercise can run offline; it makes no AI requests. Your answers are saved on this device in the session's encrypted exercise state. They are not automatically inserted into ordinary AI chat.

## Scope and source

An original self-reflection adaptation of CBT principles, not a complete treatment protocol or a clinically validated chatbot intervention. It cannot assess risk. Avoid overwhelming or traumatic material; stop if distressed and consider qualified support. Acceptance never means accepting abuse, danger, or an unwanted situation.

Judith S. Beck, *Cognitive Behavior Therapy: Basics and Beyond*, 3rd edition (2020). [Beck Institute resources](https://beckinstitute.org/cbt-resources/resources-for-professionals-and-students/cbtresources/).

## Executable Pattern Markdown

The same version-1 source is bundled in mira. This view is for inspection; it does not execute automatically.

```text
:language 1
:title "Make a maintenance plan"
:output outcome
= focus "Prepare to recognize difficulty and return to useful supports."
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
    What has been useful and what would you like to maintain?
}
!ask step2 {
    What early signs might tell you things are getting harder?
}
!ask step3 {
    Which manageable actions and trusted supports could you return to?
}
!ask step4 {
    When would you seek professional support and where will you keep this plan?
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
