:language 1
:title "Balanced thought record"
:output outcome
= focus "Bring a situation, thought, feeling, evidence, and response into one short record."
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
    Name the situation, automatic thought, and feeling or intensity.
}
!ask step2 {
    What observations support the thought and what complicates it?
}
!ask step3 {
    Write a balanced response acknowledging difficulty and uncertainty, not forced optimism.
}
!ask step4 {
    How do you feel now, if different at all? What response would you choose?
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
