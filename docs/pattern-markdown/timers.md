# Countdown timers

`!timer` is an interactive countdown under `:language 1`. It uses the same immutable
bindings, effect identities and receipt replay as `!ask` and `!rate`.

```pattern
pause = !timer {
  :duration 60
  :adjustable true
  :min 10
  :max 300
  :blocking true
  Take a quiet pause.
}
```

`!timer pause { ... }` is also accepted. A binding is required. Attributes precede
the authored prompt. Durations are whole **seconds**, from 1 through 86,400 (24 hours).

| Parameter | Meaning |
| --- | --- |
| `:duration N` | Required initial duration in seconds. |
| `:adjustable true/false` | Optional; defaults to false. Adjustment is allowed before starting. |
| `:min N`, `:max N` | Both required when adjustable is true; inclusive bounds. Not allowed otherwise. The initial duration must be within these bounds. |
| `:sticky true/false` | Optional; defaults to true. False keeps the timer in its authored step instead of moving to the sticky area. Works for standalone and form timers. |
| `:blocking true/false` | Required. True waits for completion; false allows continuation after starting. |

The widget provides start, pause, resume and reset. There is no automatic progression:
the participant confirms **Continue**. Blocking timers keep Continue unavailable
until the countdown finishes. Non-blocking timers allow Continue after starting,
remain visible in their configured placement, and may continue after the pattern completes.
Cancelling/pausing a run pauses its timers. Leaving the page removes countdowns.

The web widget is a compact, single-row black bar with icon controls. Adjustable
timers show `−1` / `+1` minute buttons before starting, disabled at the authored
bounds. With `:sticky true` (the default), a started timer moves into the sticky practice-level timer area, above
the scrolling steps. Its original step keeps a receipt and any required Continue
action, not a second clock. Reset keeps the controls in that area; restarting or
leaving the practice clears them. Multiple started timers are separately labeled.
With `:sticky false`, the controls and countdown remain in the authored step, including after continuation. Placement does not change duration, blocking, or receipt validation. Form `:persistent` separately controls whether a completed step still allows timer controls.

The same presentation is used by the website, Mira and the editor preview.

The block editor accepts minutes, including fractional minutes, while the language
and receipts continue to store exact whole seconds. Existing definitions are not
rewritten or rounded when opened.

The interpreter emits `interaction.timer` with `{prompt, timer}`. The host submits:

```json
{"kind":"timer","value":{"duration_seconds":60,"elapsed_seconds":60,"completed":true}}
```

The immutable bound record has `duration_seconds`, `elapsed_seconds` and `completed`.
Authored expressions can read these fields. A non-blocking receipt is the snapshot
**at continuation**, not a live clock. Background completion does not mutate it or
send a second fulfillment. Durations must match a fixed timer or fall within its
adjustable bounds. Elapsed time must be within duration, and `completed` must agree
with elapsed time. Blocking timers reject incomplete results atomically.

Countdowns are host-local presentation state, not durable background jobs. Historical
receipts never restart a timer when a saved run is reopened. The pure Rust engine
validates reported durations/status but does not verify wall-clock passage; a timer
is not a security mechanism or proof that an exercise was performed. No clock reads,
sleeping, external scheduler or AI model are introduced into interpretation or replay.

See the [example](examples/timed-reflection.pattern.md) and
[simulation fixture](examples/timed-reflection.fixture.json). The CLI accepts explicit
host-reported timer JSON for interactive runs, or fixture replies for simulations;
its fixture interface does not provide a live countdown widget.
