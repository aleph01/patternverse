:language 1
:title "Work with barriers"
:output outcome
= focus "Distinguish practical constraints from discomfort and adapt without blame."
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
    What values-led step would you like to take?
}
!ask step2 {
    What external constraints and internal experiences might get in the way?
}
!ask step3 {
    Which constraints need problem-solving or support? Which feelings could come along without deciding the action?
}
!ask step4 {
    What smaller plan is realistic, and what if it does not work?
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
