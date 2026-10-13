:language 1
:title "Rethink the Goal"
:input frame text
:output candidate_frame

!use reframing.surface-higher-goals as higher {
    :with frame
}
!choose direction {
    :option logic "Test whether the immediate goal leads to that outcome"
    :option paths "Look for another path to that outcome"
    An underlying outcome might be: {{higher.candidate_frame}}

    Which question would help now?
}
?match direction {
    :case logic -> logic
    :else -> paths
}
logic:
!use reframing.challenge-goal-logic as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
paths:
!use reframing.alternative-paths as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
