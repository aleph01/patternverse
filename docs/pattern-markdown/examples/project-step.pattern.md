:language 1
:title "Choose a small step"
:input topic text
:output next_step
detail = !ask {
    What would you like to try for {{topic}}?
}
next_step = !ask {
    What is one small step toward {{detail}}?
}
-> end
