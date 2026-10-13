:language 1
:title "Explore a personal rule"
:output outcome
= focus "Notice rigid assumptions and consider flexibility without losing what matters."
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
    What should, must, or if-then rule appears in a recent manageable situation?
}
!ask step2 {
    What purpose might it serve, and where does it become costly?
}
!ask step3 {
    What are its exceptions? Would you apply it unchanged to someone you care about?
}
!ask step4 {
    Draft a flexible guideline and a safe small way to try it.
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
