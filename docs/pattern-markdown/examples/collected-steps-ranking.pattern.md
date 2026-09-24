:language 1
:title "Collect and arrange possible small steps"
:output ordered_steps

!collect steps {
    :max 3
    !ask description {
        What is one small step you might consider? Give it a short description.
    }
    !rate effort 0..10 {
        How much effort might {{description}} take, from 0 to 10?
    }
}
!rank ordered_steps [from=steps, label=description] {
    Arrange these in the order you would like to consider them.
    This does not commit you to doing any of them.
}
!show {
    Your possible steps, in your chosen order: {{ordered_steps}}
}
-> end
