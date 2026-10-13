:language 1
:title "Validate the Frame"
:input frame text
:output validation_plan

!agent proposed_plan {
    :returns text

    Frame to test: {{frame}}
    Propose one small, reversible real-world learning step. State what observation would support this frame, what would weaken it, and how the test distinguishes this frame from a plausible alternative.
    Do not ask for more abstract analysis and do not present the frame as established fact.
}
!ask next_step {
    A possible test is: {{proposed_plan}}

    What concrete step, if any, would you actually choose to try? You can change or decline the suggestion.
}
= validation_plan concat(proposed_plan, concat(" Participant's chosen next step: ", next_step))
!show {
    The frame remains a hypothesis. Your tentative learning plan: {{validation_plan}}
}
-> end
