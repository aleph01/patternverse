:language 1
:title "Review the Frame"
:input frame text
:output candidate_frame

type FrameSignal = evidence | constraint | solution | form | agency | emotion | tradeoff | no_clear_signal
classifier frame_signal -> FrameSignal {
    :case evidence "A consequential factual claim or inferred motive is being treated as established."
    :case constraint "An apparent must, fixed boundary, or unnecessary restriction narrows the problem."
    :case solution "A proposed intervention is embedded in the problem statement."
    :case form "The statement's form as a pain, goal, solution, or specified problem is unclear or mixed."
    :case agency "Responsibility or causation is narrowly located in one actor or an abstract system."
    :case emotion "An emotionally loaded judgment carries an unexamined interpretation."
    :case tradeoff "The statement presents a possibly false either-or choice."
    :fallback no_clear_signal
}
signal = frame ?~ frame_signal
?match signal {
    :case evidence -> evidence
    :case constraint -> constraint
    :case solution -> solution
    :case form -> form
    :case agency -> agency
    :case emotion -> emotion
    :case tradeoff -> tradeoff
    :case no_clear_signal -> unsure
}
evidence:
!use reframing.verify-statement as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
constraint:
!use reframing.remove-constraints as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
solution:
!use reframing.detect-baked-solution as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
form:
!use reframing.identify-problem-form as form_finding {
    :with frame
}
= candidate_frame form_finding.candidate_frame
-> end
agency:
!use reframing.locate-problem as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
emotion:
!use reframing.inspect-emotion as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
tradeoff:
!use reframing.break-tradeoff as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
unsure:
= candidate_frame frame
!show {
    No single framing trap stands out yet. The current statement can remain provisional.
}
-> end
