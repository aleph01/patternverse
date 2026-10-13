:language 1
:title "Explore a recurring belief"
:output outcome
= focus "Examine a belief tentatively, without searching for trauma or imposing labels."
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
    What repeated belief about yourself, others, or life would you like to understand?
}
!ask step2 {
    When does it appear, and when is it less convincing?
}
!ask step3 {
    What experiences support it and what makes it less absolute?
}
!ask step4 {
    What flexible belief might fit? You may leave this unresolved or discuss it with a therapist.
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
