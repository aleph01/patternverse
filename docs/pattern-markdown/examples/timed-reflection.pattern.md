:language 1
:title "Timed reflection"
:output reflection

pause = !timer {
  :duration 60
  :adjustable true
  :min 10
  :max 300
  :blocking true
  Take a quiet pause.

  Start when you are ready. You can pause or reset the countdown.
}

background = !timer {
  :duration 120
  :blocking false
  Give yourself some time to reflect.

  Once you start, you can write your response while the timer continues above.
}

reflection = !ask {
  What did you notice?
}
-> end
