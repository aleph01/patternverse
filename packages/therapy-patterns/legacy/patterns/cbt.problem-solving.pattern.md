:language 1
:title "Structured problem-solving"
:output outcome
= focus "Identify an actionable problem, compare options, and choose a practical step."
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
    Describe a concrete problem and the parts within your influence.
}
!ask step2 {
    What acceptable improvement would you like? List possible actions.
}
!ask step3 {
    Compare their realistic benefits, costs, and constraints.
}
!ask step4 {
    Choose one small action, when to try it, and how to review it.
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
