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
  :case hammer {
    finding = !use reframing.escape-hammer {
        :with frame
    }
    candidate_frame = finding.candidate_frame
    -> end
  }
  :case time {
    finding = !use reframing.expand-time-window {
        :with frame
    }
    candidate_frame = finding.candidate_frame
    -> end
  }
  :case influence {
    finding = !use reframing.find-hidden-influence {
        :with frame
    }
    candidate_frame = finding.candidate_frame
    -> end
  }
  :case properties {
    finding = !use reframing.find-hidden-properties {
        :with frame
    }
    candidate_frame = finding.candidate_frame
    -> end
  }
  :case uncertain {
    finding = !use reframing.find-hidden-influence {
        :with frame
    }
    candidate_frame = finding.candidate_frame
    -> end
  }
}
