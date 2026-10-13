---
id: act-stories
type: pattern
title: "Name a recurring story"
summary: "Name a familiar mental story to create room for choice."
status: published
verses:
  - therapy
---

Name a familiar mental story to create room for choice.

## How to use it

Work with a manageable everyday situation. The sequence below is an invitation, not an assessment. You can skip by ending the exercise, correct your wording, or stop at any time.

1. What recurring thought or story is showing up?
2. What short, non-insulting title could you give it? A title is optional.
3. Notice the story is here without debating or obeying it. What is that like?
4. With the story present, what small action serves what matters?

## With mira

[Open this technique in mira](/apps/mira?technique=act.stories). Review the selection before starting. This scripted exercise can run offline; it makes no AI requests. Your answers are saved on this device in the session's encrypted exercise state. They are not automatically inserted into ordinary AI chat.

## Scope and source

An original self-reflection adaptation of ACT principles, not a complete treatment protocol or a clinically validated chatbot intervention. It cannot assess risk. Avoid overwhelming or traumatic material; stop if distressed and consider qualified support. Acceptance never means accepting abuse, danger, or an unwanted situation.

Steven C. Hayes, Kirk D. Strosahl, and Kelly G. Wilson, *Acceptance and Commitment Therapy: The Process and Practice of Mindful Change*, 2nd edition (2012). [ACBS: the ACT model](https://contextualscience.org/about_act).

## Executable Pattern Markdown

The same version-1 source is bundled in mira. This view is for inspection; it does not execute automatically.

```text
:language 1
:title "Name a recurring story"
:output outcome
= focus "Name a familiar mental story to create room for choice."
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
    What recurring thought or story is showing up?
}
!ask step2 {
    What short, non-insulting title could you give it? A title is optional.
}
!ask step3 {
    Notice the story is here without debating or obeying it. What is that like?
}
!ask step4 {
    With the story present, what small action serves what matters?
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
