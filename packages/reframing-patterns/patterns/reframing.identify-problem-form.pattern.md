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
  :case pain {
    pain_frame = !use reframing.frame-problem {
        :with problem = frame
    }
    candidate_frame = pain_frame.frame
    -> end
  }
  :case goal {
    goal_frame = !use reframing.rethink-goal {
        :with frame
    }
    candidate_frame = goal_frame.candidate_frame
    -> end
  }
  :case solution {
    solution_frame = !use reframing.detect-baked-solution {
        :with frame
    }
    candidate_frame = solution_frame.candidate_frame
    -> end
  }
  :case specified {
    candidate_frame = frame
    -> end
  }
  :case mixed {
    mixed_frame = !use reframing.frame-problem {
        :with problem = frame
    }
    candidate_frame = mixed_frame.frame
    -> end
  }
}
