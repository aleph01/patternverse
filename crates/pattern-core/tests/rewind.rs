use pattern_core::{
    manager::{self, Command, ManagerLimits, RunManager},
    runtime::{Event, Fulfillment, Receipt, Status},
    snapshot::{ExecutableSnapshot, SourceBundle},
    value::Value,
};
use std::collections::BTreeMap;

fn answer(state: &RunManager, text: &str) -> RunManager {
    let effect = state.pending().unwrap();
    manager::transition(
        state,
        Command {
            run_id: effect.run_id.clone(),
            event: Event::Fulfill(Receipt {
                effect_id: effect.effect_id.clone(),
                result: Fulfillment::Text(text.into()),
            }),
        },
    )
    .unwrap()
    .state
}

#[test]
fn rewind_child_invalidates_parent_outputs_and_preserves_pinned_earlier_answers() {
    let snapshot = ExecutableSnapshot::build(SourceBundle {
        root: "root".into(),
        patterns: BTreeMap::from([
            ("root".into(), ":language 1\n:output answer\n!ask first {\nFirst\n}\n!use child as child {\n:with first\n}\n= answer child.answer\n-> end".into()),
            ("child".into(), ":language 1\n:input first text\n:output answer\n!ask answer {\nAfter {{first}}\n}\n-> end".into()),
        ]),
    }).unwrap();
    let initial = manager::start(
        snapshot,
        "run".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap()
    .state;
    let child = answer(&initial, "earlier answer");
    let effect = child.pending().unwrap().clone();
    let completed = answer(&child, "old child answer");
    assert_eq!(completed.root().status(), &Status::Completed);
    let reopened = manager::rewind(&completed, &effect.run_id, &effect.effect_id).unwrap();
    assert_eq!(reopened, child);
    assert!(reopened.root().outputs().is_empty());
    assert_eq!(reopened.snapshot(), completed.snapshot());
    let revised = answer(&reopened, "updated child answer");
    assert_eq!(
        revised.root().outputs()["answer"],
        Value::Text("updated child answer".into())
    );
    let restored: RunManager =
        serde_json::from_str(&serde_json::to_string(&revised).unwrap()).unwrap();
    assert_eq!(restored, revised);
    assert!(manager::rewind(&reopened, &effect.run_id, &effect.effect_id).is_err());
    assert!(manager::rewind(&completed, "wrong-run", &effect.effect_id).is_err());
}

#[test]
fn rewind_does_not_authorize_repeating_a_model_effect() {
    let snapshot = ExecutableSnapshot::build(SourceBundle {
        root: "root".into(),
        patterns: BTreeMap::from([("root".into(), ":language 1\n!agent generated {\n:returns text\nGenerate text\n}\n!ask reply {\nReply to {{generated}}\n}\n-> end".into())]),
    }).unwrap();
    let initial = manager::start(
        snapshot,
        "run".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap()
    .state;
    let effect = initial.pending().unwrap();
    let next = manager::transition(
        &initial,
        Command {
            run_id: effect.run_id.clone(),
            event: Event::Fulfill(Receipt {
                effect_id: effect.effect_id.clone(),
                result: Fulfillment::Generated(Value::Text("generated".into())),
            }),
        },
    )
    .unwrap()
    .state;
    assert!(manager::rewind(&next, &effect.run_id, &effect.effect_id).is_err());
}
