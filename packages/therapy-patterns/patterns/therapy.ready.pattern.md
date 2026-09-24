:language 1
:title "Choose whether to begin"
:input focus text
:output decision

!choose decision {
    :option begin "Yes, begin gently"
    :option stop "Not now"
    :option support "I need immediate help"
    {{focus}}

    This is a guided self-reflection, not therapy or emergency care. Choose an everyday situation that feels manageable, not a traumatic event. You can pause or end at any step; no explanation is needed. Your answers stay in this exercise unless you choose to share them elsewhere.

    Would you like to begin?
}
-> end
