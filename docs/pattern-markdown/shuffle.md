# Shuffle

`shuffle` returns a new permutation of a homogeneous list or choices catalogue.
Every original item is retained, including duplicates, complete records, and choice
IDs/labels. The source stays unchanged. Empty and single-item inputs keep their type
and contents. A permutation is allowed to equal the original order.

## Shuffle once for a run

```pattern
:language 1
:output answers

questions = ["What matters today?", "What could help?", "What is one small step?"]
order = shuffle(questions)
answers = each question in order {
  answer = !ask {
    {{question}}
  }
  -> yield {question: question, answer: answer}
}
-> end
```

`order = questions |> shuffle` is equivalent. Without a seed, shuffle must be the
entire right-hand side of a binding. Bind its result before applying another
operation. Pure helpers and nested expressions require the seeded form below.

The permutation is derived from the run identity, pinned source, call site and
iteration identity. New runs should have unique IDs, as ordinary website runs do;
reusing a run ID with the same program and execution path reproduces its order.
Different iterations can produce different orders. Pause/resume, replay, and saved
run restoration preserve already computed orders without generating external
effects. There is no wall-clock read or ambient random generator.

## Reproduce an order explicitly

```pattern
:language 1
:output result
result = shuffle([1, 2, 3, 4, 5, 6], "demo")
-> end
```

This produces `[6, 2, 3, 1, 4, 5]`. `items |> shuffle("demo")` is equivalent.
The same text seed and ordered input reproduce the same order across runs and
native/WASM hosts. Seeded calls are pure and may appear in helpers, records, and
longer pipelines. Use an annotated empty list such as `[]:text` when its element
type cannot otherwise be inferred. The run-scoped form also accepts a contextual
binding annotation such as `order: list[text] = shuffle([])`.

Both forms use the version-one SHA-256-based Fisher–Yates permutation with rejection
sampling and fixed-width byte encoding. Existing expression/value budgets apply.
This is for presentation order, not secrets, lotteries, or balanced assignment
across research participants. No experiment-allocation service is introduced.
