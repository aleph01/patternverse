:language 1
:title "Choose a small step"
:input topic text
:output next_step
!ask detail {
    What would you like to try for {{topic}}?
}
!ask next_step {
    What is one small step toward {{detail}}?
}
-> end
