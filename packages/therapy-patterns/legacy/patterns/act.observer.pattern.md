:language 1
:title "The noticing perspective"
:output outcome
= focus "See an experience as part of the moment, not the whole of who you are."
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
    Name a thought, feeling, or role prominent right now.
}
!ask step2 {
    Try: I notice that I am having this experience. Does that wording fit?
}
!ask step3 {
    What else can you notice in the room? If things feel unreal or disorienting, stop and orient to your surroundings.
}
!ask step4 {
    How could holding this experience as one part of the moment leave room for choice?
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
