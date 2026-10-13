use pattern_core::{
    compiler, host,
    runtime::{self, Error, Event, Fulfillment, Receipt, Request, RunState, Status, TimerResult},
    value::Value,
};
use std::collections::BTreeMap;

fn source(attributes: &str) -> String {
    format!(":language 1\n:output pause\npause = !timer {{\n{attributes}\nPause for a moment — gently.\n}}\n-> end\n")
}
fn start(source: &str) -> RunState {
    runtime::start(
        compiler::compile(source).unwrap(),
        "timer-test".into(),
        BTreeMap::new(),
    )
    .unwrap()
    .state
}
fn event(state: &RunState, result: TimerResult) -> Event {
    Event::Fulfill(Receipt {
        effect_id: state.pending().unwrap().effect_id.clone(),
        result: Fulfillment::Timer(result),
    })
}
fn result(duration_seconds: u32, elapsed_seconds: u32, completed: bool) -> TimerResult {
    TimerResult {
        duration_seconds,
        elapsed_seconds,
        completed,
    }
}
fn restore(state: &RunState) -> RunState {
    serde_json::from_str(&serde_json::to_string(state).unwrap()).unwrap()
}

#[test]
fn fixed_timer_is_typed_inspectable_and_supports_both_binding_forms() {
    let source = source(":duration 60\n:blocking true");
    for source in [&source, &source.replace("pause = !timer", "!timer pause")] {
        let compiled = compiler::compile(source).unwrap();
        let outline = compiled.inspect().unwrap();
        assert_eq!(outline.steps[0].kind, "timer");
        assert_eq!(outline.steps[0].text, "Pause for a moment — gently.");
        let state = start(source);
        let Request::Timer { prompt, timer } = &state.pending().unwrap().request else {
            panic!("not a timer")
        };
        assert_eq!(prompt, "Pause for a moment — gently.");
        assert_eq!(timer.duration_seconds, 60);
        assert_eq!(timer.min_seconds, 60);
        assert_eq!(timer.max_seconds, 60);
        assert!(!timer.adjustable);
        assert!(timer.blocking);
        assert_eq!(state.pending().unwrap().request.kind(), "interaction.timer");
        let done = runtime::transition(&state, event(&state, result(60, 60, true)))
            .unwrap()
            .state;
        assert_eq!(done.status(), &Status::Completed);
        assert_eq!(
            done.outputs()["pause"],
            Value::Record(BTreeMap::from([
                ("duration_seconds".into(), Value::Number(60.)),
                ("elapsed_seconds".into(), Value::Number(60.)),
                ("completed".into(), Value::Boolean(true)),
            ]))
        );
        assert_eq!(restore(&done), done);
    }
}

#[test]
fn blocking_timer_rejects_early_or_inconsistent_results_atomically() {
    let state = start(&source(":duration 60\n:blocking true"));
    let before = serde_json::to_string(&state).unwrap();
    for bad in [
        result(60, 0, false),
        result(60, 59, false),
        result(60, 59, true),
        result(60, 60, false),
        result(61, 61, true),
        result(60, 61, true),
        result(0, 0, true),
    ] {
        assert_eq!(
            runtime::transition(&state, event(&state, bad)),
            Err(Error::ContractViolation)
        );
        assert_eq!(serde_json::to_string(&state).unwrap(), before);
    }
    let wrong = Event::Fulfill(Receipt {
        effect_id: state.pending().unwrap().effect_id.clone(),
        result: Fulfillment::Rating(60.),
    });
    assert_eq!(runtime::transition(&state, wrong), Err(Error::WrongResult));
}

#[test]
fn adjustable_background_timer_accepts_inclusive_bounds_and_remains_an_immutable_receipt() {
    let source = source(":duration 60\n:adjustable true\n:min 10\n:max 120\n:blocking false");
    for duration in [10, 60, 120] {
        let state = start(&source);
        let accepted = event(&state, result(duration, 0, false));
        let done = runtime::transition(&restore(&state), accepted.clone())
            .unwrap()
            .state;
        assert_eq!(done.status(), &Status::Completed);
        assert_eq!(runtime::transition(&done, accepted).unwrap().state, done);
        assert_eq!(restore(&done), done);
        let conflicting = Event::Fulfill(Receipt {
            effect_id: state.ledger().first().map_or_else(
                || state.pending().unwrap().effect_id.clone(),
                |r| r.effect_id.clone(),
            ),
            result: Fulfillment::Timer(result(duration, duration, true)),
        });
        assert_eq!(
            runtime::transition(&done, conflicting),
            Err(Error::ConflictingDuplicate)
        );
    }
    let state = start(&source);
    for bad in [
        result(9, 0, false),
        result(121, 0, false),
        result(60, 61, false),
        result(60, 60, false),
    ] {
        assert_eq!(
            runtime::transition(&state, event(&state, bad)),
            Err(Error::ContractViolation)
        );
    }
}

#[test]
fn timer_parameters_fail_closed() {
    for attributes in [
        ":duration 60",
        ":blocking true",
        ":duration 0\n:blocking true",
        ":duration -1\n:blocking true",
        ":duration 1.5\n:blocking true",
        ":duration 86401\n:blocking true",
        ":duration NaN\n:blocking true",
        ":duration \"60\"\n:blocking true",
        ":duration 60\n:blocking yes",
        ":duration 60\n:blocking \"true\"",
        ":duration 60\n:blocking true\n:adjustable yes",
        ":duration 60\n:blocking true\n:adjustable true",
        ":duration 60\n:blocking false\n:min 10",
        ":duration 60\n:blocking true\n:adjustable false\n:min 10\n:max 120",
        ":duration 60\n:blocking true\n:adjustable true\n:min 61\n:max 120",
        ":duration 60\n:blocking true\n:adjustable true\n:min 10\n:max 59",
        ":duration 60\n:blocking true\n:adjustable true\n:min 120\n:max 10",
        ":duration 60\n:blocking true\n:duration 60",
        ":duration 60\n:blocking true\n:unknown true",
    ] {
        assert!(
            compiler::compile(&source(attributes)).is_err(),
            "accepted invalid parameters: {attributes}"
        );
    }
    assert!(compiler::compile(
        &source(":duration 60\n:blocking true").replace("pause = !timer", "!timer")
    )
    .is_err());
    assert!(serde_json::from_str::<TimerResult>(
        r#"{"duration_seconds":60,"elapsed_seconds":60,"completed":true,"extra":1}"#
    )
    .is_err());
    assert!(serde_json::from_str::<TimerResult>(
        r#"{"duration_seconds":60,"elapsed_seconds":-1,"completed":false}"#
    )
    .is_err());
}

#[test]
fn pause_cancel_and_wrong_effect_cannot_complete_a_timer() {
    let state = start(&source(":duration 1\n:blocking true"));
    let accepted = event(&state, result(1, 1, true));
    let paused = runtime::transition(&state, Event::Pause).unwrap().state;
    assert_eq!(
        runtime::transition(&paused, accepted.clone()),
        Err(Error::Paused)
    );
    let resumed = runtime::transition(&paused, Event::Resume).unwrap().state;
    assert_eq!(
        runtime::transition(&resumed, accepted.clone())
            .unwrap()
            .state
            .status(),
        &Status::Completed
    );
    let cancelled = runtime::transition(&state, Event::Cancel).unwrap().state;
    assert_eq!(
        runtime::transition(&cancelled, accepted),
        Err(Error::Terminal)
    );
    let wrong = Event::Fulfill(Receipt {
        effect_id: "wrong-effect".into(),
        result: Fulfillment::Timer(result(1, 1, true)),
    });
    assert_eq!(runtime::transition(&state, wrong), Err(Error::WrongEffect));
}

#[test]
fn timer_fields_are_available_to_authored_expressions_and_loop_yields() {
    let source = source(":duration 1\n:blocking false").replace("-> end", "elapsed = pause.elapsed_seconds\n!show {\nElapsed: {{elapsed}}; completed: {{pause.completed}}\n}\n-> end");
    let state = start(&source);
    let turn = runtime::transition(&state, event(&state, result(1, 0, false))).unwrap();
    assert!(turn.effects.iter().any(|effect| matches!(&effect.request, Request::Show { markdown, .. } if markdown == "Elapsed: 0; completed: false")));
    let loop_source = ":language 1\n?loop[2] state = 0 {\npause = !timer {\n:duration 1\n:blocking true\nPause\n}\n-> repeat state + 1\n}\n-> end";
    compiler::compile(loop_source).unwrap();
}

#[test]
fn timer_fixture_is_executable_in_the_cli_host() {
    let source =
        include_str!("../../../docs/pattern-markdown/examples/timed-reflection.pattern.md");
    let fixture = serde_json::from_str(include_str!(
        "../../../docs/pattern-markdown/examples/timed-reflection.fixture.json"
    ))
    .unwrap();
    let simulation = host::simulate(
        compiler::compile(source).unwrap(),
        "timer-fixture".into(),
        fixture,
    )
    .unwrap();
    assert_eq!(simulation.state.status(), &Status::Completed);
}

#[test]
fn timer_placement_defaults_preserve_old_requests_and_accept_step_local_timers() {
    let old = start(&source(":duration 60\n:blocking true"));
    let Request::Timer { timer, .. } = &old.pending().unwrap().request else {
        panic!("timer")
    };
    assert!(timer.sticky);
    let serialized = serde_json::to_value(timer).unwrap();
    assert!(serialized.get("sticky").is_none());
    let restored: pattern_core::compiler::Timer = serde_json::from_value(serialized).unwrap();
    assert!(restored.sticky);
    assert_eq!(restore(&old), old);
    for sticky in [true, false] {
        let state = start(&source(&format!(
            ":duration 60\n:blocking true\n:sticky {sticky}"
        )));
        let Request::Timer { timer, .. } = &state.pending().unwrap().request else {
            panic!("timer")
        };
        assert_eq!(timer.sticky, sticky);
        assert_eq!(restore(&state), state);
        assert_eq!(
            runtime::transition(&state, event(&state, result(60, 60, true)))
                .unwrap()
                .state
                .status(),
            &Status::Completed
        );
        let grouped = format!(":language 1\nstep = !form {{\n!show {{\nRehearse your new scene.\n}}\n!timer rehearsal {{\n:duration 60\n:blocking true\n:sticky {sticky}\nRehearse.\n}}\n}}\n-> end");
        assert!(compiler::compile(&grouped).is_ok());
    }
    for invalid in ["yes", "\"false\"", "", "false\n:sticky true"] {
        assert!(compiler::compile(&source(&format!(
            ":duration 60\n:blocking true\n:sticky {invalid}"
        )))
        .is_err());
    }
}
