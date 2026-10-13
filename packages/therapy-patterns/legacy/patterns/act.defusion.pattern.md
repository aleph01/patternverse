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
