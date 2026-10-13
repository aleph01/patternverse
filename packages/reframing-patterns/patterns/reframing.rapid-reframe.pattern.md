:language 1
:title "Rapid Reframe"
:output selected_frame
:output validation_plan

type Strategy = outside | goal | tradeoff | general
classifier strategy -> Strategy {
    :case outside "The frame may omit context, time, systemic influences, or overlooked resources."
    :case goal "The immediate goal or its causal logic may deserve reconsideration."
    :case tradeoff "An either-or choice is central to the frame."
    :fallback general
}
!ask problem {
    What problem feels stuck? A short, provisional description is enough.
}
!use reframing.frame-problem as framed {
    :with problem
}
!use reframing.review-frame as reviewed {
    :with frame = framed.frame
}
strategy = framed.frame ?~ strategy
?match strategy {
    :case outside -> outside
    :case goal -> goal
    :case tradeoff -> tradeoff
    :case general -> general
}
outside:
!use reframing.look-outside-frame as lens {
    :with frame = framed.frame
}
= additional lens.candidate_frame
-> options
goal:
!use reframing.rethink-goal as lens {
    :with frame = framed.frame
}
= additional lens.candidate_frame
-> options
tradeoff:
!use reframing.break-tradeoff as lens {
    :with frame = framed.frame
}
= additional lens.candidate_frame
-> options
general:
= additional framed.frame
-> options
options:
= observations concat(reviewed.candidate_frame, concat(" Another possibility: ", additional))
!use reframing.generate-real-options as alternatives {
    :with frame = framed.frame
    :with observations
}
= selected_frame alternatives.selected_frame
!use reframing.validate-frame as validation {
    :with frame = selected_frame.label
}
= validation_plan validation.validation_plan
!show {
    You selected one frame to test: {{selected_frame.label}}

    {{validation_plan}}

    What you learn can change the frame again. There is no need to generate more possibilities right now.
}
-> end
