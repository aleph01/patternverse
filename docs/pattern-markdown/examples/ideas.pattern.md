:language 1
:title "Small project ideas"
:input topic text
:output ideas
:output plans

!collect ideas {
    :min 1
    :max 3

    !ask idea {
        What is one small idea for {{topic}}?
    }
    !rate interest 0..10 {
        How interested are you in {{idea}}?
    }
}

!collect plans {
    :from ideas
    :as item

    = idea item.idea
    !ask next_step {
        What would be a first step for {{item.idea}}?
    }
}

= idea_count count(ideas)
!show {
    You explored {{idea_count}} ideas.
}
-> end
