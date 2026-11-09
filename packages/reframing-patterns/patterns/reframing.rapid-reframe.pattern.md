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
problem = !ask {
    What problem feels stuck? A short, provisional description is enough.
}
framed = !use reframing.frame-problem {
    :with problem
}
reviewed = !use reframing.review-frame {
    :with frame = framed.frame
}
strategy = framed.frame ?~ strategy
?match strategy {
  :case outside {
    lens = !use reframing.look-outside-frame {
        :with frame = framed.frame
    }
    additional = lens.candidate_frame
  }
  :case goal {
    lens = !use reframing.rethink-goal {
        :with frame = framed.frame
    }
    additional = lens.candidate_frame
  }
  :case tradeoff {
    lens = !use reframing.break-tradeoff {
        :with frame = framed.frame
    }
    additional = lens.candidate_frame
  }
  :case general {
    additional = framed.frame
  }
}
observations = concat(reviewed.candidate_frame, concat(" Another possibility: ", additional))
alternatives = !use reframing.generate-real-options {
    :with frame = framed.frame
    :with observations
}
selected_frame = alternatives.selected_frame
validation = !use reframing.validate-frame {
    :with frame = selected_frame.label
}
validation_plan = validation.validation_plan
!show {
    You selected one frame to test: {{selected_frame.label}}

    {{validation_plan}}

    What you learn can change the frame again. There is no need to generate more possibilities right now.
}
-> end
