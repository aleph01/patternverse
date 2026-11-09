:language 1
:title "Rethink the Goal"
:input frame text
:output candidate_frame

higher = !use reframing.surface-higher-goals {
    :with frame
}
direction = !choose {
    :option logic "Test whether the immediate goal leads to that outcome"
    :option paths "Look for another path to that outcome"
    An underlying outcome might be: {{higher.candidate_frame}}

    Which question would help now?
}
?match direction {
  :case logic {
    finding = !use reframing.challenge-goal-logic {
        :with frame
    }
    candidate_frame = finding.candidate_frame
    -> end
  }
  :else {
    finding = !use reframing.alternative-paths {
        :with frame
    }
    candidate_frame = finding.candidate_frame
    -> end
  }
}
