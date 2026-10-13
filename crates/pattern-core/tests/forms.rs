use pattern_core::{
    compiler,
    runtime::{self, Error, Event, Fulfillment, Receipt, Request, RunState, Status},
    value::Value,
};
use std::collections::BTreeMap;

const SOURCE: &str = r#":language 1
:output reflection
reflection = !form {
  :title "A small next step"
  !show {
Notice what matters.
  }
  !ask thought {
    :required true
    :multiline true
    :placeholder "Your thought…"
What comes to mind?
  }
  !ask note {
    :required false
    :multiline false
Anything else?
  }
}
!show {
{{reflection.thought}}
}
-> end
"#;

fn start(source: &str) -> RunState {
    runtime::start(
        compiler::compile(source).unwrap(),
        "form-test".into(),
        BTreeMap::new(),
    )
    .unwrap()
    .state
}
fn submit(state: &RunState, answers: BTreeMap<String, Value>) -> Event {
    Event::Fulfill(Receipt {
        effect_id: state.pending().unwrap().effect_id.clone(),
        result: Fulfillment::Form(answers),
    })
}
fn answers(text: &str) -> BTreeMap<String, Value> {
    BTreeMap::from([
        ("thought".into(), Value::Text(text.into())),
        ("note".into(), Value::Text(String::new())),
    ])
}

#[test]
fn grouped_answers_have_one_typed_atomic_transition_and_replay() {
    let compiled = compiler::compile(SOURCE).unwrap();
    assert_eq!(compiled.inspect().unwrap().steps[0].kind, "form");
    let state = start(SOURCE);
    let Request::Form(form) = &state.pending().unwrap().request else {
        panic!("expected a form");
    };
    assert_eq!(form.title.as_deref(), Some("A small next step"));
    assert_eq!(form.blocks.len(), 3);
    let request = serde_json::to_value(state.pending().unwrap()).unwrap();
    assert_eq!(
        request["request"]["payload"]["blocks"][1]["placeholder"],
        "Your thought…"
    );
    let receipt = submit(&state, answers("I can try one small step."));
    let done = runtime::transition(&state, receipt.clone()).unwrap();
    assert_eq!(done.state.status(), &Status::Completed);
    assert!(done.effects.iter().any(|effect| matches!(&effect.request, Request::Show { markdown, .. } if markdown == "I can try one small step.")));
    assert_eq!(
        done.state.outputs()["reflection"],
        Value::Record(answers("I can try one small step."))
    );
    let restored: RunState =
        serde_json::from_str(&serde_json::to_string(&done.state).unwrap()).unwrap();
    assert_eq!(restored, done.state);
    assert_eq!(
        runtime::transition(&restored, receipt).unwrap().state,
        restored
    );
}

#[test]
fn missing_extra_wrong_type_and_blank_required_answers_do_not_change_state() {
    let state = start(SOURCE);
    let before = serde_json::to_string(&state).unwrap();
    let mut extra = answers("yes");
    extra.insert("extra".into(), Value::Text("no".into()));
    let mut wrong = answers("yes");
    wrong.insert("note".into(), Value::Number(1.));
    for invalid in [
        answers(" \n "),
        BTreeMap::new(),
        extra,
        wrong,
        answers(&"x".repeat(32_001)),
    ] {
        assert_eq!(
            runtime::transition(&state, submit(&state, invalid)),
            Err(Error::ContractViolation)
        );
        assert_eq!(serde_json::to_string(&state).unwrap(), before);
    }
}

#[test]
fn forms_reject_duplicate_fields_nested_effects_and_intra_form_references() {
    for invalid in [
        SOURCE.replace("!ask note", "!ask thought"),
        SOURCE.replace("Anything else?", "{{thought}}"),
        SOURCE.replace("Anything else?", "~ Interpret this."),
        SOURCE.replace("!ask note", "!choose note"),
        SOURCE.replace(":required false", ":required \"false\""),
        SOURCE.replace("reflection = !form {", "reflection = !form"),
    ] {
        assert!(compiler::compile(&invalid).is_err(), "accepted {invalid}");
    }
}

#[test]
fn instruction_only_forms_are_acknowledgeable_and_form_timers_reuse_timer_validation() {
    let state = start(":language 1\nstep = !form {\n!show {\nTry a small step.\n}\n}\n-> end");
    assert_eq!(
        runtime::transition(&state, submit(&state, BTreeMap::new()))
            .unwrap()
            .state
            .status(),
        &Status::Completed
    );
    let source = ":language 1\nstep = !form {\n!timer pause {\n:duration 60\n:blocking true\nTake a pause.\n}\n}\n-> end";
    let state = start(source);
    let timer = |seconds, completed| {
        BTreeMap::from([(
            "pause".into(),
            Value::Record(BTreeMap::from([
                ("duration_seconds".into(), Value::Number(60.)),
                ("elapsed_seconds".into(), Value::Number(seconds)),
                ("completed".into(), Value::Boolean(completed)),
            ])),
        )])
    };
    assert_eq!(
        runtime::transition(&state, submit(&state, timer(59., false))),
        Err(Error::ContractViolation)
    );
    assert_eq!(
        runtime::transition(&state, submit(&state, timer(60., true)))
            .unwrap()
            .state
            .status(),
        &Status::Completed
    );
}
