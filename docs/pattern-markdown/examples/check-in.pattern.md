:language 1
:title "Choose a next step"
:output focus
:output next_step
:output doubled_energy

focus = !ask {
    What would you like to make time for?
}
energy = !rate 0..10 {
    :prefer slider
    :low "Very little"
    :high "Plenty"
    How much energy do you have for {{focus}} today?
}
doubled_energy = energy * 2
?branch {
  :when energy >= 8 {
    next_step = "Try a focused work period."
  }
  :when energy >= 4 {
    next_step = "Choose one small action."
  }
  :else {
    next_step = "Make room to rest."
  }
}
!show {
    Your focus: **{{focus}}**.
    A possible next step: {{next_step}}
}
-> end
