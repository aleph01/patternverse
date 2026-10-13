:language 1
:title "ABC diary"
:output outcome
= focus "Separate an activating event, an interpretation, and its consequences."
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
    Describe a manageable event in observable terms.
}
!ask step2 {
    What belief, meaning, or prediction came to mind? It need not be wrong.
}
!ask step3 {
    Which feelings and actions followed? Separate these from the event itself.
}
!ask step4 {
    Where might there be room for a different response?
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
