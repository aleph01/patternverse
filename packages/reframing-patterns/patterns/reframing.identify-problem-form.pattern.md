:language 1
:title "Identify the Problem Form"
:input frame text
:output form
:output candidate_frame

type ProblemForm = pain | goal | solution | specified | mixed
classifier problem_form -> ProblemForm {
    :case pain "The statement mainly describes a difficulty or felt pain without a clear outcome or mechanism."
    :case goal "The statement mainly describes an outcome the person wants."
    :case solution "The statement mainly prescribes an intervention or artifact."
    :case specified "The statement describes a clear, bounded problem with relevant evidence."
    :fallback mixed
}
form = frame ?~ problem_form
!show {
    One tentative reading of this statement is {{form}}. A statement can fit more than one form; use this only to choose a useful next question.
}
?match form {
    :case pain -> pain
    :case goal -> goal
    :case solution -> solution
    :case specified -> specified
    :case mixed -> mixed
}
pain:
!use reframing.frame-problem as pain_frame {
    :with problem = frame
}
= candidate_frame pain_frame.frame
-> end
goal:
!use reframing.rethink-goal as goal_frame {
    :with frame
}
= candidate_frame goal_frame.candidate_frame
-> end
solution:
!use reframing.detect-baked-solution as solution_frame {
    :with frame
}
= candidate_frame solution_frame.candidate_frame
-> end
specified:
= candidate_frame frame
-> end
mixed:
!use reframing.frame-problem as mixed_frame {
    :with problem = frame
}
= candidate_frame mixed_frame.frame
-> end
