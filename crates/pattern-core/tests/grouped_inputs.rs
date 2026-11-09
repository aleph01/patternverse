use pattern_core::{
    compiler,
    runtime::{self, Event, Fulfillment, Receipt, Request, RunState, Status},
    value::{Choice, Type, Value},
};
use std::collections::BTreeMap;

const SOURCE: &str = r#":language 1
:input available choices
:output assessment
:output score
assessment = !form {
  :title "Assess an initiative"
  name = !ask {
    What initiative?
  }
  impact = !rate -2.5..5 {
    :low "Little"
    :high "Much"
    Impact?
  }
  evidence = !choose {
    Evidence?
    - observed: "Observed"
    - assumed: "Assumed"
  }
  dependencies = !choose [multi, min=0, max=2, from=available] {
    Dependencies?
  }
}
score = assessment.impact * 2
!show {
  {{assessment.evidence.label}}
}
-> end
"#;

fn choice(id: &str) -> Choice {
    Choice {
        value: id.into(),
        label: id.to_uppercase(),
    }
}
fn choices(ids: &[&str]) -> Value {
    Value::List {
        element_type: Type::Choice,
        items: ids.iter().map(|id| Value::Choice(choice(id))).collect(),
    }
}
fn start() -> RunState {
    runtime::start(
        compiler::compile(SOURCE).unwrap(),
        "grouped".into(),
        BTreeMap::from([(
            "available".into(),
            Value::Choices(vec![choice("a"), choice("b")]),
        )]),
    )
    .unwrap()
    .state
}
fn answers() -> BTreeMap<String, Value> {
    BTreeMap::from([
        ("name".into(), Value::Text("Improve onboarding".into())),
        ("impact".into(), Value::Number(-1.5)),
        ("evidence".into(), Value::Choice(choice("observed"))),
        ("dependencies".into(), choices(&["b", "a"])),
    ])
}
fn submit(state: &RunState, fields: BTreeMap<String, Value>) -> Event {
    Event::Fulfill(Receipt {
        effect_id: state.pending().unwrap().effect_id.clone(),
        result: Fulfillment::Form(fields),
    })
}

#[test]
fn mixed_form_has_one_offer_typed_outputs_and_canonical_selections() {
    let state = start();
    let Request::Form(form) = &state.pending().unwrap().request else {
        panic!("expected form")
    };
    assert_eq!(form.blocks.len(), 4);
    let event = submit(&state, answers());
    let done = runtime::transition(&state, event.clone()).unwrap();
    assert_eq!(done.state.status(), &Status::Completed);
    assert_eq!(done.state.outputs()["score"], Value::Number(-3.));
    let Value::Record(fields) = &done.state.outputs()["assessment"] else {
        panic!("record")
    };
    assert_eq!(fields["dependencies"], choices(&["a", "b"]));
    assert_eq!(
        fields["evidence"],
        Value::Choice(Choice {
            value: "observed".into(),
            label: "Observed".into()
        })
    );
    let mut reordered = answers();
    reordered.insert("dependencies".into(), choices(&["a", "b"]));
    assert_eq!(
        runtime::transition(&done.state, submit(&state, reordered))
            .unwrap()
            .state,
        done.state
    );
    let restored: RunState =
        serde_json::from_str(&serde_json::to_string(&done.state).unwrap()).unwrap();
    assert_eq!(
        runtime::transition(&restored, event).unwrap().state,
        restored
    );
}

#[test]
fn invalid_mixed_fields_are_rejected_atomically_and_can_be_corrected() {
    let state = start();
    let before = serde_json::to_string(&state).unwrap();
    let invalid = [
        ("impact", Value::Number(5.1)),
        ("impact", Value::Number(f64::NAN)),
        ("impact", Value::Number(f64::INFINITY)),
        ("impact", Value::Text("4".into())),
        ("evidence", Value::Choice(choice("unknown"))),
        ("evidence", Value::Text("observed".into())),
        ("dependencies", choices(&["a", "a"])),
        ("dependencies", choices(&["missing"])),
        (
            "dependencies",
            Value::List {
                element_type: Type::Text,
                items: vec![],
            },
        ),
        ("name", Value::Text(" ".into())),
    ];
    for (id, value) in invalid {
        let mut fields = answers();
        fields.insert(id.into(), value);
        assert!(
            runtime::transition(&state, submit(&state, fields)).is_err(),
            "accepted {id}"
        );
        assert_eq!(serde_json::to_string(&state).unwrap(), before);
    }
    for id in ["name", "impact", "evidence", "dependencies"] {
        let mut fields = answers();
        fields.remove(id);
        assert!(runtime::transition(&state, submit(&state, fields)).is_err());
    }
    let mut extra = answers();
    extra.insert("extra".into(), Value::Number(1.));
    assert!(runtime::transition(&state, submit(&state, extra)).is_err());
    assert!(state.outputs().is_empty());
    let mut valid = answers();
    valid.insert("impact".into(), Value::Number(0.));
    valid.insert("dependencies".into(), choices(&[]));
    assert_eq!(
        runtime::transition(&state, submit(&state, valid))
            .unwrap()
            .state
            .status(),
        &Status::Completed
    );
}

#[test]
fn grouped_selection_bounds_and_lifecycle_reuse_existing_contracts() {
    let mut state = start();
    let offer = state.pending().unwrap().clone();
    state = runtime::transition(&state, Event::Pause).unwrap().state;
    let restored: RunState = serde_json::from_str(&serde_json::to_string(&state).unwrap()).unwrap();
    assert!(runtime::transition(&restored, submit(&restored, answers())).is_err());
    let resumed = runtime::transition(&restored, Event::Resume).unwrap();
    assert_eq!(resumed.effects, vec![offer]);
    let cancelled = runtime::transition(&resumed.state, Event::Cancel)
        .unwrap()
        .state;
    assert!(runtime::transition(&cancelled, submit(&resumed.state, answers())).is_err());
    let required = SOURCE.replace("min=0, max=2", "min=1, max=1");
    let state = runtime::start(
        compiler::compile(&required).unwrap(),
        "required".into(),
        BTreeMap::from([(
            "available".into(),
            Value::Choices(vec![choice("a"), choice("b")]),
        )]),
    )
    .unwrap()
    .state;
    assert!(runtime::transition(&state, submit(&state, answers())).is_err());
    let mut empty = answers();
    empty.insert("dependencies".into(), choices(&[]));
    assert!(runtime::transition(&state, submit(&state, empty)).is_err());
    let unsatisfiable = SOURCE.replace("min=0, max=2", "min=3, max=3");
    assert!(runtime::start(
        compiler::compile(&unsatisfiable).unwrap(),
        "bounds".into(),
        BTreeMap::from([("available".into(), Value::Choices(vec![choice("a")]))])
    )
    .is_err());
}

#[test]
fn grouped_fields_reject_invalid_contracts_and_sibling_dependencies() {
    for source in [
        SOURCE.replace("-2.5..5", "5..1"),
        SOURCE.replace("-2.5..5", "0..inf"),
        SOURCE.replace("evidence = !choose", "impact = !choose"),
        SOURCE.replace("Impact?", "{{name}}"),
        SOURCE.replace("from=available", "from=assessment.dependencies"),
        SOURCE.replace("min=0, max=2", "min=3, max=2"),
        SOURCE.replace("- assumed:", "- observed:"),
        SOURCE.replace("evidence = !choose", "evidence = !rank"),
    ] {
        assert!(compiler::compile(&source).is_err(), "accepted {source}");
    }
}
