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
  :case explore {
    finding = !use reframing.look-outside-frame {
        :with frame
    }
    candidate_frame = finding.candidate_frame
    -> end
  }
  :case break {
    finding = !use reframing.rethink-goal {
        :with frame
    }
    candidate_frame = finding.candidate_frame
    -> end
  }
  :case uncertain {
    direction = !choose {
        :option explore "Explore what may be missing"
        :option break "Question the frame itself"
        Which direction seems more useful for {{frame}}?
    }
    ?match direction {
      :case explore {
        finding = !use reframing.look-outside-frame {
            :with frame
        }
        candidate_frame = finding.candidate_frame
        -> end
      }
      :else {
        finding = !use reframing.rethink-goal {
            :with frame
        }
        candidate_frame = finding.candidate_frame
        -> end
      }
    }
  }
}
