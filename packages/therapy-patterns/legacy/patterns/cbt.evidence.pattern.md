:language 1
:title "Review the evidence"
:output outcome
= focus "Consider observations on both sides without demanding positive thinking."
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
    Write a specific thought and optionally your confidence from 0 to 100.
}
!ask step2 {
    What observable facts support it? Separate facts from guesses.
}
!ask step3 {
    What observations do not fit, or suggest exceptions?
}
!ask step4 {
    What conclusion fits the full evidence? Uncertainty is valid.
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
