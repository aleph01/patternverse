:language 1
:title "Flexible attention"
:output outcome
= focus "Practice moving attention deliberately rather than eliminating thoughts."
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
    Choose two safe external anchors, such as an object and a sound.
}
!ask step2 {
    Notice one briefly, then the other. What changes?
}
!ask step3 {
    Try broadening attention to both without forcing it. What do you notice?
}
!ask step4 {
    Where might choosing your focus help with a small action today?
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
