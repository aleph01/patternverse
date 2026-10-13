:language 1
:title "CBT · Follow a worry chain"

!choose ready {
    This optional, scripted example asks about a worry's feared consequences. It can intensify worry and is not a full treatment protocol.
    Choose something manageable, and use Stop loop whenever you have had enough. There is no need to reach a core fear or finish all ten questions.
    - begin: "Try a manageable worry"
    - stop: "Not now"
}
?match ready {
    :case begin -> begin
    :else -> closing
}
begin:
!ask initial_worry {
    What are you afraid would happen?
}
?loop[10] worry = initial_worry {
    !ask next_worry {
        ~ Ask the user what the worst thing would be if {{worry}} happened. Keep the worry hypothetical and ask only this question, without interpretation or reassurance.
    }
    -> repeat next_worry
}
closing:
!show {
    Okay. Let's stop there.
}
-> end
