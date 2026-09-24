:language 1
:title "Choose a next step"
:output focus
:output next_step
:output doubled_energy

!ask focus {
    What would you like to make time for?
}

!rate energy 0..10 {
    :prefer slider
    :low "Very little"
    :high "Plenty"
    How much energy do you have for {{focus}} today?
}

= doubled_energy energy * 2

?branch {
    :when energy >= 8 -> high
    :when energy >= 4 -> medium
    :else -> low
}

high:
= next_step "Try a focused work period."
-> review

medium:
= next_step "Choose one small action."
-> review

low:
= next_step "Make room to rest."
-> review

review:
!show {
    Your focus: **{{focus}}**.
    A possible next step: {{next_step}}
}
-> end
