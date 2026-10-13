:language 1
:title "Behavioral Activation"
:output outcome
= focus "Schedule a small, meaningful or rewarding activity rather than waiting for motivation. There is no required emotional outcome."
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
    What part of your day could use some care, enjoyment, connection, or meaning?
}
!ask activity {
    Choose one small, safe activity that fits your energy and circumstances. Rest and support can also be meaningful choices.
}
!ask timing {
    When and where could you try it? Choose a realistic time or an ordinary event to link it to.
}
!ask fallback {
    What might get in the way? What smaller version or support would make it more manageable?
}
!ask review {
    If you have tried the activity, what did you notice about mood, pleasure, or accomplishment? Otherwise, when could you review it? A lack of improvement is information, not failure.
}
!show {
    Your notes, in your own words:

    1. {{direction}}
    2. {{activity}}
    3. {{timing}}
    4. {{fallback}}
    5. {{review}}

    You can leave this here or return later. Nothing has been scheduled or carried out for you.
}
= outcome "reflected"
-> end
support:
!show {
    Stop the exercise. For immediate danger, contact local emergency services. Reach a trusted person or qualified crisis support if you can. This exercise cannot provide emergency care.
}
= outcome "support_requested"
-> end
declined:
!show {
    We can leave this here. You do not need to explain or finish.
}
= outcome "declined"
-> end
