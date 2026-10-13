:language 1
:title "Notice overlooked evidence"
:output outcome
= focus "Record experiences that a broad negative belief might discount."
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
    What broad belief would you like to examine gently?
}
!ask step2 {
    Recall one specific event that does not entirely fit it, however small.
}
!ask step3 {
    What did you do and what happened, without exaggerating or dismissing it?
}
!ask step4 {
    What modest conclusion does this support? How might you notice similar data?
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
