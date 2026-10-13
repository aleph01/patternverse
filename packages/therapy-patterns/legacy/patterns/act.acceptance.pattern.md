:language 1
:title "Make room for a feeling"
:output outcome
= focus "Explore openness to emotion without approving harm or giving up protection."
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
    Name a manageable feeling you are willing to notice briefly. You can decline.
}
!ask step2 {
    How do you usually respond, and what are the short- and longer-term effects?
}
!ask step3 {
    What would a little room for it look like, without forcing inward attention or surrendering protective action?
}
!ask step4 {
    What caring or meaningful step is possible with the feeling present?
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
