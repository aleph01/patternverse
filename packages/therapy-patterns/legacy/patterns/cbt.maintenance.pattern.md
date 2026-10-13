:language 1
:title "Make a maintenance plan"
:output outcome
= focus "Prepare to recognize difficulty and return to useful supports."
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
    What has been useful and what would you like to maintain?
}
!ask step2 {
    What early signs might tell you things are getting harder?
}
!ask step3 {
    Which manageable actions and trusted supports could you return to?
}
!ask step4 {
    When would you seek professional support and where will you keep this plan?
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
