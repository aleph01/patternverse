:language 1
:title "Prioritize values"
:output outcome
= focus "Explore competing valued directions without ranking your worth."
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
    List a few qualities of action that matter in this situation.
}
!choose values [multi, min=0, prefer=checklist] {
    Pick any qualities you want to consider. This list is only a starting point; your own words above remain important.
    - care: "Care"
    - connection: "Connection"
    - learning: "Learning"
    - creativity: "Creativity"
    - honesty: "Honesty"
    - courage: "Courage"
}
!rank step2 [from=values] {
    Arrange these for what needs attention now. This is not a permanent hierarchy.
}
!ask step3 {
    Where do they conflict? What small action might honor more than one?
}
!ask step4 {
    What priority will you choose for now, and when might you revisit it?
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
