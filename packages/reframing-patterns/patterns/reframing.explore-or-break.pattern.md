:language 1
:title "Explore or Break the Frame"
:input frame text
:output candidate_frame

type Move = explore | break | uncertain
classifier move -> Move {
    :case explore "The current frame is useful but likely omits nearby context or variation."
    :case break "The frame itself appears to lock in a goal, cause, or solution."
    :fallback uncertain
}
move = frame ?~ move
?match move {
    :case explore -> explore
    :case break -> break
    :case uncertain -> uncertain
}
explore:
!use reframing.look-outside-frame as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
break:
!use reframing.rethink-goal as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
uncertain:
!choose direction {
    :option explore "Explore what may be missing"
    :option break "Question the frame itself"
    Which direction seems more useful for {{frame}}?
}
?match direction {
    :case explore -> user_explore
    :else -> user_break
}
user_explore:
!use reframing.look-outside-frame as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
user_break:
!use reframing.rethink-goal as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
