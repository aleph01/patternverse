:language 1
:title "Explore willingness"
:output outcome
= focus "Consider whether making room for discomfort serves a freely chosen direction."
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
    What matters to you in this everyday situation?
}
!ask step2 {
    What uncomfortable thought or feeling shows up when you move toward it?
}
!ask step3 {
    What discomfort, if any, are you willing to make room for? This is not an obligation to endure danger.
}
!ask step4 {
    What smaller action or support respects your choice and limits?
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
