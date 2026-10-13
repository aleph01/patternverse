---
id: act-values-priority
type: pattern
title: "Prioritize values"
summary: "Explore competing valued directions without ranking your worth."
status: published
verses:
  - therapy
---

Explore competing valued directions without ranking your worth.

## How to use it

Work with a manageable everyday situation. The sequence below is an invitation, not an assessment. You can skip by ending the exercise, correct your wording, or stop at any time.

1. List a few qualities of action that matter in this situation.
2. Which need attention now and which could wait? Put them in a provisional order if useful.
3. Where do they conflict? What small action might honor more than one?
4. What priority will you choose for now, and when might you revisit it?

## With mira

[Open this technique in mira](/apps/mira?technique=act.values-priority). Review the selection before starting. This scripted exercise can run offline; it makes no AI requests. Your answers are saved on this device in the session's encrypted exercise state. They are not automatically inserted into ordinary AI chat.

## Scope and source

An original self-reflection adaptation of ACT principles, not a complete treatment protocol or a clinically validated chatbot intervention. It cannot assess risk. Avoid overwhelming or traumatic material; stop if distressed and consider qualified support. Acceptance never means accepting abuse, danger, or an unwanted situation.

Steven C. Hayes, Kirk D. Strosahl, and Kelly G. Wilson, *Acceptance and Commitment Therapy: The Process and Practice of Mindful Change*, 2nd edition (2012). [ACBS: the ACT model](https://contextualscience.org/about_act).

## Executable Pattern Markdown

The same version-1 source is bundled in mira. This view is for inspection; it does not execute automatically.

```text
:language 1
:title "Prioritize values"
:output outcome
= focus "Explore competing valued directions without ranking your worth."
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
    List a few qualities of action that matter in this situation.
}
!choose values [multi, min=0, prefer=checklist] {
    Pick any qualities you want to consider. This list is only a starting point; your own words above remain important.
    - care: "Care"
    - connection: "Connection"
    - learning: "Learning"
    - creativity: "Creativity"
    - honesty: "Honesty"
    - courage: "Courage"
}
!rank step2 [from=values] {
    Arrange these for what needs attention now. This is not a permanent hierarchy.
}
!ask step3 {
    Where do they conflict? What small action might honor more than one?
}
!ask step4 {
    What priority will you choose for now, and when might you revisit it?
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
