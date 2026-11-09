:language 1
:title "Thought diary — optional thinking-style checklist"
:output outcome

ready = !choose {
    Would you like to reflect on one manageable moment? You can pause or stop at any point.
    - begin: "Explore a moment"
    - stop: "Not now"
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
    thinking_styles = !choose [multi, min=0, prefer=checklist] {
        Which descriptions, if any, seem to fit? These are tentative descriptions, not a diagnosis.
        You can leave all unchecked and continue without a label.

        - all_or_nothing: "All-or-nothing thinking"
        - mind_reading: "Assuming what someone else thinks"
        - discounting: "Discounting something positive"
    }
    ?branch {
      :when count(thinking_styles) == 0 {
        !show {
            We can leave the labels aside. Your account does not need one.
        }
      }
      :else {
      }
    }
    !show {
        Event: {{event}}
        Thought: {{thought}}
        Your response: {{consequence}}
        Your tentative selections: {{thinking_styles}}
    }
    outcome = "reviewed"
    -> end
  }
  :else {
    !show {
        We can leave this here.
    }
    outcome = "declined"
    -> end
  }
}
