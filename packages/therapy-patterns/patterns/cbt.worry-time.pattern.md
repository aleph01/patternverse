:language 1
:title "Worry Time / Stimulus Control for Worry"
:output outcome
!timer period {
    :duration 600
    :adjustable true
    :min 60
    :max 1800
    :blocking false
    Start your worry time

    The timer defaults to 10 minutes. Adjust it before starting if you prefer, then continue to write while it runs. You can pause or finish early.
}
!ask worries {
    Give your worries some space

    Write down the "what if" thoughts on your mind. You can explore several worries. To follow one further, ask: "If that happened, what might happen next? What would I be afraid of then?"

    Let the chain of worries unfold without needing to solve it or reassure yourself as you write.
}
!show {
    Your worry notes, in your own words:

    {{worries}}
}
= outcome "reflected"
-> end
