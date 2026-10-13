:language 1
:title "Look Outside the Frame"
:input frame text
:output candidate_frame

type OutsideLens = hammer | time | influence | properties | uncertain
classifier outside_lens -> OutsideLens {
    :case hammer "A favored method, discipline, or tool appears to define the problem."
    :case time "The frame concentrates on one episode and nearby before or after may matter."
    :case influence "Omitted social, organizational, environmental, or economic conditions may matter."
    :case properties "Existing resources or information may have overlooked properties."
    :fallback uncertain
}
lens = frame ?~ outside_lens
?match lens {
    :case hammer -> hammer
    :case time -> time
    :case influence -> influence
    :case properties -> properties
    :case uncertain -> uncertain
}
hammer:
!use reframing.escape-hammer as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
time:
!use reframing.expand-time-window as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
influence:
!use reframing.find-hidden-influence as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
properties:
!use reframing.find-hidden-properties as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
uncertain:
!use reframing.find-hidden-influence as finding {
    :with frame
}
= candidate_frame finding.candidate_frame
-> end
