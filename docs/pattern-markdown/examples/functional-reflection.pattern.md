:language 1
:title "A few reflections — functional core example"
:output reflections
:output total

fn clean(text: text) -> text => text |> trim |> normalize_whitespace
fn score(entry: {question: text, answer: text, intensity: number}) -> number => entry.intensity
fn add(total: number, next: number) -> number => total + next

questions = [
  "What felt difficult today?",
  "What helped, even a little?",
]

reflections = each question in questions {
  raw = !ask {
    {{question}} Share only what you want to put into words.
  }
  intensity = !rate 0..10 {
    How intense does this feel now?
  }
  normalized = clean(raw)
  -> yield {
    question: question,
    answer: normalized,
    intensity: intensity,
  }
}

total = reflections
  |> map(score)
  |> fold(0, add)

!show {
  Thank you. These are your own reflections, not an assessment or a diagnosis.
}
-> end
