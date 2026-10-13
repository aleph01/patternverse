:language 1
:title "Create a coping card"
:output outcome
= focus "Write a short personal reminder combining perspective, action, and support."
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
    In what manageable recurring situation would a reminder help?
}
!ask step2 {
    What balanced statement feels credible rather than overly reassuring?
}
!ask step3 {
    What safe action and available support would you like to remember?
}
!ask step4 {
    Write a short final card in your own words.
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
