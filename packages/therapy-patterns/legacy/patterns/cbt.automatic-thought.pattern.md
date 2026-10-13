:language 1
:title "Identify an automatic thought"
:output outcome
= focus "Capture a passing thought before deciding whether to examine it."
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
    Choose a recent moment when your mood shifted.
}
!ask step2 {
    What exact words or image passed through your mind? It is okay not to know.
}
!ask step3 {
    What emotion accompanied it? Optionally rate belief in the thought from 0 to 100.
}
!ask step4 {
    What would you like to understand about it? You need not change it now.
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
