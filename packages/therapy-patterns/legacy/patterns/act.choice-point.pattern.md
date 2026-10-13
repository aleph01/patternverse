:language 1
:title "A choice-point reflection"
:output outcome
= focus "Notice available responses and their workability without moral judgment."
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
    What everyday situation, thoughts, or feelings are showing up?
}
!ask step2 {
    What responses are available, including your usual response?
}
!ask step3 {
    Which moves toward what matters here? What are the short- and long-term costs?
}
!ask step4 {
    Choose a small workable response or a safer smaller version.
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
