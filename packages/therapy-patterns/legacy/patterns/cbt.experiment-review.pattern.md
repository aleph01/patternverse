:language 1
:title "Review an experiment"
:output outcome
= focus "Compare a prediction with observations, allowing mixed or inconclusive results."
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
    What did you predict and what did you actually try?
}
!ask step2 {
    What did you observe, separate from your interpretation?
}
!ask step3 {
    What was supported, challenged, or still uncertain? One result is not universal.
}
!ask step4 {
    What would you keep, revise, or test differently?
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
