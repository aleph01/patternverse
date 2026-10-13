:language 1
:title "Observe thoughts"
:output outcome
= focus "Notice thoughts as experiences without requiring distance or relief."
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
    Choose a brief manageable moment. Eyes open is fine. What thought is here?
}
!ask step2 {
    Notice it as words or an image without having to remove it. What do you notice?
}
!ask step3 {
    What else is present around you? If unsettled, return to your surroundings and stop.
}
!ask step4 {
    What would you like to do next whether the thought stays or goes?
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
