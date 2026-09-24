# Flows and active-pattern events

Available in `:language 1`, in the Rust runtime used by desktop chat and preview.
The [executable example](../../crates/pattern-core/examples/flows-events.pattern.md)
classifies a side question, answers it, and returns to the original question.

## Named flows

Flows are effectful procedures. They use the same input/output declarations as a
pattern, avoiding a second parameter or return convention:

```pattern
flow ask_topic {
  :input topic text
  :output answer
  answer = !ask {
    What comes to mind about {{topic}}?
  }
  -> end
}
result = !use ask_topic {
  :with topic = "today"
}
```

The result is a typed record: `result.answer`. Inputs are explicit, bindings are
isolated, and `-> end` returns the declared outputs. Flows may call sibling flows
and pinned imported patterns. They share the enclosing source's enum, classifier,
pure-helper, and import declarations—not its participant inputs or local values.
Declare flows before the main steps. Nested flow declarations, recursion, and more
than 32 local flows are rejected. Existing child-run depth and count limits apply.
Saved runs retain exact source, typed interfaces, and replayable child state.

## Message handlers

```pattern
events {
  on user.message -> handle_message
}
```

`handle_message` must be a local flow with exactly two text inputs, `message` and
`prompt`, and one output, `disposition`. Prefer a closed enum with exactly `pass`
and `handled`; text is also accepted, but any other returned text rejects the
transition without changing the saved run.

- `pass`: deliver the original message to the original waiting text question once.
- `handled`: retain that exact unanswered question; show it after the side conversation.

The nearest enclosing pattern's hook receives text submitted to an active `!ask`,
including asks in its called flows. It receives only that text and the rendered
question, not ambient chat, session history, or private bindings. Handlers do not
intercept their own messages, and only one handler may be active per run tree.
They can contain multiple turns and survive an app restart.

This is deliberately **not a global chat listener**. Ratings, selections, review
acceptance, and other explicit controls bypass it. Paused and finished patterns
do not receive messages. Ordinary chat remains ordinary chat.

Pause, end, and loop-stop controls remain authoritative even during a handler.
No handler or classifier can approve wording, renew a budget, or interpret a
message as cancellation. Unsupported events (including `user.cancel`) fail
compilation. Operational/model errors do not silently become `pass` or `handled`.

In chat, handler AI steps use the selected local model automatically, with the
same interruptible generation and durable-save boundaries as existing wording
steps. Preview supports the same message routing and mock AI replies. The source
editor offers flow/event templates and local-flow call suggestions.
