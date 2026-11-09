:language 1
:title "Theme Explorer"
:input situation text
:output theme

themes = !agent {
    :returns choices
    :min 3
    :max 5

    Given:

    > {{situation}}

    Generate several short, distinct themes.
}

theme = !choose {
    :from themes

    Which feels closest?
}

!show {
    You chose **{{theme}}**.
}

-> end
