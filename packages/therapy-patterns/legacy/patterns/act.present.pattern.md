:language 1
:title "Notice the present moment"
:output outcome
= focus "Contact your surroundings without needing to calm down or close your eyes."
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
    Choose a sight, sound, or contact with a surface as an anchor. External anchors may be easier than inward attention.
}
!ask step2 {
    Notice that anchor briefly. What do you observe?
}
!ask step3 {
    If attention wandered, what was it like to gently return? No particular feeling is required.
}
!ask step4 {
    What would you like to attend to next?
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
