:language 1
:title "DBT · Pause and observe"
:output outcome
!choose pause {
    :option observe "I can safely pause and notice"
    :option support "I need immediate help"
    :option leave "Stop for now"
    If it is safe, you may pause the action you were about to take and notice something around you with your eyes open. There is no special breathing or body exercise to perform. Would you like to continue?
}
?branch {
    :when pause.value == "observe" -> observe
    :when pause.value == "support" -> support
    :else -> declined
}
observe:
!ask event {
    What is happening around you right now, as distinct from what you fear or infer?
}
!ask feeling {
    What feeling is here? You do not have to change it or explain why it exists.
}
!ask urge {
    What do you feel pulled to do? Naming an urge is not a commitment to act on it.
}
!choose next {
    :option plan "Consider one safe next step"
    :option support "I may act unsafely and need help"
    :option leave "Keep pausing or stop"
    Would planning help, or would real-world support be more useful? The exercise cannot assess whether a situation is safe.
}
?branch {
    :when next.value == "plan" -> plan
    :when next.value == "support" -> support
    :else -> declined
}
plan:
!ask action {
    What safe next step could protect what matters without making things worse? Waiting, leaving safely or contacting support are possible choices.
}
!show {
    You considered: {{action}}
    The feeling may still be present. You can reconsider this option; nothing has been done on your behalf.
}
= outcome "option_considered"
-> end
support:
!show {
    Let us stop planning. If you may imminently harm yourself or someone else, or face immediate danger, contact local emergency services now. If possible, contact a trusted person or qualified crisis support and do not rely on this chat for urgent care.
}
= outcome "support_requested"
-> end
declined:
!show {
    We can stop here. You do not have to complete a skill or make the feeling go away.
}
= outcome "declined"
-> end
