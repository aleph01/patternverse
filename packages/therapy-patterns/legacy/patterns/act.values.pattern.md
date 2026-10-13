:language 1
:title "ACT · A values-led step"
:output outcome
= focus "We can explore a quality you freely want to express, not a rule about who you should be or a goal you must achieve."
!use therapy.ready as readiness {
    :with focus
}
?branch {
    :when readiness.decision.value == "begin" -> explore
    :when readiness.decision.value == "support" -> support
    :else -> declined
}
explore:
!ask area {
    Which part of life would you like to consider, such as relationships, learning or caring for yourself?
}
!ask quality {
    In that area, what quality of action matters to you by your own choice, even without praise or a guaranteed outcome?
}
!ask step {
    What small, safe action could express {{quality}} in your present circumstances?
}
!ask obstacle {
    What thought, feeling or practical constraint might accompany that action?
}
!choose willingness {
    :option proceed "Keep this step as an option"
    :option adapt "Make it smaller or get support"
    :option leave "Leave it for now"
    You suggested: {{step}}
    Possible obstacle: {{obstacle}}

    What feels workable? Willingness is not approval of harm, enduring coercion, or ignoring a medical or practical need.
}
?branch {
    :when willingness.value == "proceed" -> kept
    :when willingness.value == "adapt" -> adapt
    :else -> declined
}
adapt:
!ask smaller {
    What safer, smaller step or support would fit better? Rest or postponing may fit your values too.
}
!show {
    Your adapted option: {{smaller}}
}
-> kept
kept:
!show {
    Your chosen quality was {{quality}}. You can return to it flexibly; one action does not define who you are. Nothing has been scheduled for you.
}
= outcome "option_kept"
-> end
support:
!show {
    Stop this exercise. For immediate danger, contact local emergency services. If possible, reach a trusted person or qualified crisis support. Values work is not a substitute for immediate care.
}
= outcome "support_requested"
-> end
declined:
!show {
    No commitment is needed. You can leave this question open and return to ordinary conversation.
}
= outcome "declined"
-> end
