:language 1
:title "Name a feeling"
:output outcome
= focus "Distinguish feelings, interpretations, and action urges without judging your reaction."
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
    Briefly describe a manageable situation.
}
!ask step2 {
    Which feeling words fit, even approximately?
}
!ask step3 {
    If useful, rate each feeling from 0 to 10. What urge accompanied it?
}
!ask step4 {
    What might you need or choose next? A feeling is information, not a command.
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
