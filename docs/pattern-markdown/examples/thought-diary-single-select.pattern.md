:language 1
:title "Thought diary — single-selection capability fixture"
:output outcome

ready = !choose {
    :option begin "Explore one manageable moment"
    :option stop "Not now"
    Would you like to try a brief reflection? You can pause or stop at any point.
}
?match ready {
  :case begin {
    event = !ask {
        What happened, as far as you could observe?
    }
    thought = !ask {
        What went through your mind at that moment?
    }
    consequence = !ask {
        What did you feel and do next?
    }
    identify = !choose {
        :option explore "Look at possible thinking styles"
        :option skip "Leave the labels aside"
        Would it be useful to consider a possible thinking style? No label is required.
    }
    ?match identify {
      :case explore {
        thinking_style = !choose {
            :option all_or_nothing "All-or-nothing thinking"
            :option mind_reading "Assuming what someone else thinks"
            :option none "None of these fits"
            :option unsure "I am not sure"
            Which description, if any, feels closest to your experience?
            This example accepts one answer, not a checklist. It is not a diagnosis.
        }
        !show {
            Event: {{event}}
            Thought: {{thought}}
            Your response: {{consequence}}
            Your tentative selection: {{thinking_style}}
        }
        outcome = "reviewed"
        -> end
      }
      :else {
        !show {
            We can leave the labels aside. Your account does not need one.
        }
        outcome = "labels_skipped"
        -> end
      }
    }
  }
  :else {
    !show {
        We can leave this here.
    }
    outcome = "declined"
    -> end
  }
}
