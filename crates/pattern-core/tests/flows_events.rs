use pattern_core::{
    compiler,
    manager::{self, Command, ManagerLimits, RunManager},
    runtime::{Event, Fulfillment, Receipt, Status},
    snapshot::{ExecutableSnapshot, SourceBundle},
    value::Value,
};
use std::collections::BTreeMap;

const SOURCE: &str = r#":language 1
:output answer
flow ask_topic {
  :input topic text
  :output answer
  answer = !ask {
    Tell me about {{topic}}
  }
  -> end
}
flow side_question {
  :input message text
  :input prompt text
  :output disposition
  response = !ask {
    Side question: {{message}}. Original: {{prompt}}
  }
  disposition = response
  -> end
}
events {
  on user.message -> side_question
}
result = !use ask_topic {
  :with topic = "today"
}
answer = result.answer
-> end
"#;

fn start(source: &str) -> RunManager {
    let snapshot = ExecutableSnapshot::build(SourceBundle {
        root: "root".into(),
        patterns: BTreeMap::from([("root".into(), source.into())]),
    })
    .unwrap();
    manager::start(
        snapshot,
        "test".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap()
    .state
}
fn message(state: &RunManager, id: &str) -> Command {
    let effect = state.pending().unwrap();
    Command {
        run_id: effect.run_id.clone(),
        event: Event::Message {
            effect_id: effect.effect_id.clone(),
            message_id: id.into(),
            text: "Why this question?".into(),
        },
    }
}
fn reply(state: &RunManager, text: &str) -> Command {
    let effect = state.pending().unwrap();
    Command {
        run_id: effect.run_id.clone(),
        event: Event::Fulfill(Receipt {
            effect_id: effect.effect_id.clone(),
            result: Fulfillment::Text(text.into()),
        }),
    }
}
fn restored(state: &RunManager) -> RunManager {
    serde_json::from_str(&serde_json::to_string(state).unwrap()).unwrap()
}

#[test]
fn typed_flow_is_isolated_and_returns_record_outputs() {
    let state = start(SOURCE);
    assert!(state.handles_messages());
    let end = manager::transition(&state, reply(&state, "Walking"))
        .unwrap()
        .state;
    assert_eq!(end.root().status(), &Status::Completed);
    assert_eq!(
        end.root().outputs()["answer"],
        Value::Text("Walking".into())
    );
    assert_eq!(restored(&end), end);
    assert!(compiler::compile(SOURCE).unwrap().inspect().is_ok());
}

#[test]
fn handled_message_returns_to_exact_pending_step_after_restart() {
    let state = start(SOURCE);
    let pending = state.pending().unwrap().clone();
    let command = message(&state, "one");
    let handling = manager::transition(&state, command.clone()).unwrap().state;
    assert_ne!(handling.pending(), Some(&pending));
    assert!(!handling.handles_messages());
    assert!(manager::transition(&handling, reply(&state, "late answer")).is_err());
    assert!(manager::transition(&handling, message(&handling, "nested")).is_err());
    let handling = restored(&handling);
    let returned = manager::transition(&handling, reply(&handling, "handled"))
        .unwrap()
        .state;
    assert_eq!(returned.pending(), Some(&pending));
    assert_eq!(
        manager::transition(&returned, command).unwrap().state,
        returned
    );
    assert_eq!(restored(&returned), returned);
}

#[test]
fn pass_message_is_delivered_once_and_replayed() {
    let state = start(SOURCE);
    let command = message(&state, "one");
    let handling = manager::transition(&state, command.clone()).unwrap().state;
    let ended = manager::transition(&handling, reply(&handling, "pass"))
        .unwrap()
        .state;
    assert_eq!(
        ended.root().outputs()["answer"],
        Value::Text("Why this question?".into())
    );
    assert_eq!(ended.ledger().count(), 2);
    assert_eq!(restored(&ended), ended);
    assert_eq!(manager::transition(&ended, command).unwrap().state, ended);
}

#[test]
fn pause_resume_cancel_and_invalid_handler_result_are_atomic() {
    let state = start(SOURCE);
    let handling = manager::transition(&state, message(&state, "one"))
        .unwrap()
        .state;
    assert!(manager::transition(&handling, reply(&handling, "cancel")).is_err());
    let life = |s: &RunManager, event| {
        manager::transition(
            s,
            Command {
                run_id: s.root().run_id().into(),
                event,
            },
        )
        .unwrap()
        .state
    };
    let paused = life(&handling, Event::Pause);
    assert!(manager::transition(&paused, reply(&paused, "handled")).is_err());
    let resumed = life(&restored(&paused), Event::Resume);
    assert_eq!(resumed.pending(), handling.pending());
    let cancelled = life(&resumed, Event::Cancel);
    assert!(cancelled.pending().is_none());
    assert!(manager::transition(&cancelled, reply(&handling, "handled")).is_err());
    assert_eq!(restored(&cancelled), cancelled);
}

#[test]
fn invalid_declarations_fail_closed() {
    for source in [
        SOURCE.replace("flow ask_topic", "flow side_question"),
        SOURCE.replace("on user.message", "on user.cancel"),
        SOURCE.replace(":input message text", ":input message number"),
        SOURCE.replace(":with topic = \"today\"", ":with topic = 42"),
        SOURCE.replace(
            "answer = !ask {\n    Tell me about {{topic}}\n  }",
            "answer = !use ask_topic {\n:with topic\n}",
        ),
    ] {
        assert!(compiler::compile(&source).is_err(), "Accepted {source}");
    }
}

#[test]
fn documented_example_handles_a_question_then_passes_an_answer() {
    let state = start(include_str!("../examples/flows-events.pattern.md"));
    let pending = state.pending().unwrap().clone();
    let handling = manager::transition(&state, message(&state, "question"))
        .unwrap()
        .state;
    let fulfill = |state: &RunManager, result| {
        let effect = state.pending().unwrap();
        manager::transition(
            state,
            Command {
                run_id: effect.run_id.clone(),
                event: Event::Fulfill(Receipt {
                    effect_id: effect.effect_id.clone(),
                    result,
                }),
            },
        )
        .unwrap()
        .state
    };
    let explanation = fulfill(&handling, Fulfillment::Classified("handled".into()));
    let returned = fulfill(
        &restored(&explanation),
        Fulfillment::Turn(
            "It is an invitation to notice, without needing to change anything.".into(),
        ),
    );
    assert_eq!(returned.pending(), Some(&pending));
    let answering = manager::transition(&returned, message(&returned, "answer"))
        .unwrap()
        .state;
    let ended = fulfill(&answering, Fulfillment::Classified("pass".into()));
    assert_eq!(ended.root().status(), &Status::Completed);
    assert_eq!(restored(&ended), ended);
}

#[test]
fn loop_stop_remains_authoritative_during_a_handler() {
    let source = SOURCE.replace("result = !use ask_topic {\n  :with topic = \"today\"\n}\nanswer = result.answer", "?loop[3] topic = \"today\" {\nnext = !ask {\nWhat about {{topic}}?\n}\n-> repeat next\n}\nanswer = \"stopped\"");
    let state = start(&source);
    let original = state.pending().unwrap().clone();
    let handling = manager::transition(&state, message(&state, "one"))
        .unwrap()
        .state;
    assert_eq!(handling.loop_effect(), Some(&original));
    let stopped = manager::transition(
        &handling,
        Command {
            run_id: original.run_id,
            event: Event::StopLoop {
                effect_id: original.effect_id,
            },
        },
    )
    .unwrap()
    .state;
    assert_eq!(stopped.root().status(), &Status::Completed);
    assert!(manager::transition(&stopped, reply(&handling, "handled")).is_err());
    assert_eq!(restored(&stopped), stopped);
}

#[test]
fn durable_checkpoint_restores_handler_and_display_only_message() {
    use pattern_core::persistence::{self, MemoryStore};
    let snapshot = start(SOURCE).snapshot().clone();
    let mut store = MemoryStore::default();
    let first = persistence::create(
        &mut store,
        snapshot,
        "saved".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap();
    let handling = persistence::apply(&mut store, &first, message(first.state(), "one")).unwrap();
    let loaded = persistence::load(&mut store, "saved").unwrap().unwrap();
    assert_eq!(handling, loaded);
    assert_eq!(
        loaded
            .deliverable()
            .iter()
            .map(|e| e.request.kind())
            .collect::<Vec<_>>(),
        ["content.show", "interaction.ask"]
    );
    let returned =
        persistence::apply(&mut store, &loaded, reply(loaded.state(), "handled")).unwrap();
    assert_eq!(returned.state().pending(), first.state().pending());
    assert_eq!(
        persistence::load(&mut store, "saved").unwrap().unwrap(),
        returned
    );
}

#[test]
fn sibling_calls_share_only_explicit_values_and_reject_cycles() {
    let source = ":language 1\n:output value\nflow first {\n:output value\nr = !use second {\n}\nvalue = r.value\n-> end\n}\nflow second {\n:output value\nvalue = \"hello\"\n-> end\n}\nr = !use first {\n}\nvalue = r.value\n-> end";
    let done = start(source);
    assert_eq!(done.root().outputs()["value"], Value::Text("hello".into()));
    assert_eq!(restored(&done), done);
    assert!(compiler::compile(
        &source.replace("value = \"hello\"", "r = !use first {\n}\nvalue = r.value")
    )
    .is_err());
    assert!(compiler::compile(
        &source
            .replace("value = \"hello\"", "value = private")
            .replace(
                ":output value\nflow first",
                ":output value\n:input private text\nflow first"
            )
    )
    .is_err());
}
