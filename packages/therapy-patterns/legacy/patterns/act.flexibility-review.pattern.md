:language 1
:title "Review flexibility"
:output outcome
= focus "Reflect on noticing, openness, and chosen action without performance scoring."
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
    Describe a recent situation in which you had a choice.
}
!ask step2 {
    What did you notice, what was hard to allow, and how did you respond?
}
!ask step3 {
    How did your response serve what mattered, or not, in context?
}
!ask step4 {
    What would you try differently, with kindness and realistic support?
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
