:language 1
:title "Break down a task"
:output outcome
= focus "Reduce a task until its first step is feasible rather than perfect."
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
    What everyday task matters but feels difficult to begin?
}
!ask step2 {
    List small component steps in a workable order.
}
!ask step3 {
    Which first step fits your current energy and resources?
}
!ask step4 {
    When and where could you do it, and what is a smaller fallback?
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
