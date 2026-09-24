:language 1
:title "Choose and arrange what matters"
:output ordered_values

!choose values [multi, min=0, prefer=chips] {
    Which, if any, would you like to give some attention to today?
    This is a small example list, not a complete description of your values.

    - connection: "Connection"
    - learning: "Learning"
    - creativity: "Creativity"
    - care: "Care"
}
!rank ordered_values [from=values] {
    Arrange these by what you would like to attend to first today.
    There is no correct order and it does not have to stay the same tomorrow.
}
!show {
    Your order for today: {{ordered_values}}
}
-> end
