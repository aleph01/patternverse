:language 1
:title "Small project ideas"
:input topic text
:output ideas
:output plans

ideas = !collect {
    :min 1
    :max 3

    idea = !ask {
        What is one small idea for {{topic}}?
    }
    interest = !rate 0..10 {
        How interested are you in {{idea}}?
    }
}

plans = !collect {
    :from ideas
    :as item

    idea = item.idea
    next_step = !ask {
        What would be a first step for {{item.idea}}?
    }
}

idea_count = count(ideas)
!show {
    You explored {{idea_count}} ideas.
}
-> end
