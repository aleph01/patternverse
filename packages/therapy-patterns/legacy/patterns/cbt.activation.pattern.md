:language 1
:title "CBT · One manageable action"
:output outcome
= focus "We can plan something small without requiring motivation or promising a change in mood. Rest and support can be legitimate choices."
!use therapy.ready as readiness {
    :with focus
}
?branch {
    :when readiness.decision.value == "begin" -> explore
    :when readiness.decision.value == "support" -> support
    :else -> declined
}
explore:
!ask direction {
    What part of today could use a little care, connection, enjoyment or structure?
}
!ask action {
    What is one small, safe action in that direction that fits your actual energy and circumstances?
}
!ask timing {
    When or after what ordinary event could you try it? This is an invitation, not a commitment you must keep.
}
!ask obstacle {
    What might get in the way?
}
!ask fallback {
    If that happens, what smaller action, rest or support would be reasonable instead?
}
!choose decision {
    :option keep "Keep this as an option"
    :option leave "Leave the plan for now"
    Your proposed action: {{action}}
    Possible timing: {{timing}}
    Your fallback: {{fallback}}

    Would you like to keep this option? It is not a test of effort or worth, and it does not need to improve your mood.
}
?branch {
    :when decision.value == "keep" -> kept
    :else -> declined
}
kept:
!show {
    Your option is saved here. If you try it, you can notice what actually happens without grading yourself. Nothing has been scheduled or carried out for you.
}
= outcome "option_kept"
-> end
support:
!show {
    Stop the exercise and seek immediate real-world support if needed. For immediate danger, contact local emergency services. A trusted person or qualified crisis service may help you get support; Mira cannot provide emergency care.
}
= outcome "support_requested"
-> end
declined:
!show {
    No action is required. You can leave the plan, rest, or return to ordinary conversation.
}
= outcome "declined"
-> end
