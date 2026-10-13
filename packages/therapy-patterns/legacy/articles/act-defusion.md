---
id: act-defusion
type: pattern
title: "Notice a thought"
summary: "Try noticing a thought as a mental event without disputing its truth or forcing it away."
status: published
verses:
  - therapy
---

Try noticing a thought as a mental event without disputing its truth or forcing it away.

## How it works

This guided reflection invites you to choose a manageable everyday focus, describe your experience, and decide what you wish to take forward. There is no required emotional outcome. The full steps are shown below, and you can decline or stop at any point.

[Open this technique in mira](/apps/mira?technique=act.defusion). The existing scripted exercise runs offline without a model request. Your answers stay in the encrypted exercise state, separate from ordinary chat.

## Scope and sources

An original self-reflection adaptation, not a complete therapy protocol or a clinically validated chatbot intervention. Avoid overwhelming material and seek qualified support when needed.

Hayes, Strosahl & Wilson (2012), *Acceptance and Commitment Therapy*, second edition. [ACBS introduction](https://contextualscience.org/about_act).

## Executable Pattern Markdown

```text
:language 1
:title "ACT · Notice a thought"
:output outcome
= focus "We can try changing how you relate to a thought, not proving it false or making it disappear. This is not a way to dismiss real danger or injustice."
!use therapy.ready as readiness {
    :with focus
}
?branch {
    :when readiness.decision.value == "begin" -> explore
    :when readiness.decision.value == "support" -> support
    :else -> declined
}
explore:
!ask thought {
    Is there a manageable thought you feel caught up in? Write it as it appears, or end the exercise if this is not useful.
}
!choose willingness {
    :option try "Try noticing the thought"
    :option leave "Not for me right now"
    If willing, notice that your mind is presenting these words: {{thought}}

    You could gently frame it as a thought you are noticing. You do not need to repeat it, debate it, believe less in it, or feel better. Would you like to try that briefly?
}
?branch {
    :when willingness.value == "try" -> notice
    :else -> declined
}
notice:
!ask experience {
    What did you notice, if anything? No change is a valid answer.
}
!choose continuation {
    :option continue "Consider what matters next"
    :option leave "Stop this exercise"
    Did this feel workable enough to continue? If it felt dismissive, confusing or unsettling, stopping is a reasonable choice.
}
?branch {
    :when continuation.value == "continue" -> direction
    :else -> declined
}
direction:
!ask value {
    With the thought still allowed to be there, what quality would you like to bring to your next safe action? Leaving things as they are for now is also possible.
}
!show {
    You named this direction: {{value}}
    You do not have to resolve the thought before choosing whether to act. This exercise does not decide what is true or safe for you.
}
= outcome "noticed"
-> end
support:
!show {
    Stop the exercise. If there is immediate danger, contact local emergency services. Reach a trusted person or qualified crisis support where possible. Do not use this exercise to distance yourself from a real safety need.
}
= outcome "support_requested"
-> end
declined:
!show {
    We can stop. You do not need to distance yourself from this thought or make the exercise work.
}
= outcome "declined"
-> end
```
