:language 1
:title "Collect and arrange possible small steps"
:output ordered_steps

steps = !collect {
    :max 3
    description = !ask {
        What is one small step you might consider? Give it a short description.
    }
    effort = !rate 0..10 {
        How much effort might {{description}} take, from 0 to 10?
    }
}
ordered_steps = !rank [from=steps, label=description] {
    Arrange these in the order you would like to consider them.
    This does not commit you to doing any of them.
}
!show {
    Your possible steps, in your chosen order: {{ordered_steps}}
}
-> end
