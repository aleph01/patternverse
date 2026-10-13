:language 1
:title "Plan a behavioral experiment"
:output outcome
= focus "Plan a small safe test of a prediction with a clear observation and review plan."
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
    What specific everyday prediction would you like to test?
}
!ask step2 {
    What low-risk action could give useful information? Do not test physical danger, medical advice, or another person's consent.
}
!ask step3 {
    What would you observe? What would count for or against the prediction?
}
!ask step4 {
    When could you try it? What support, stop condition, and review time would help?
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
