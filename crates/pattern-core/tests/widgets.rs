use pattern_core::{
    compiler,
    manager::{self, Command, ManagerLimits},
    runtime::{Event, Fulfillment, Receipt, Request, Status},
    snapshot::{ExecutableSnapshot, SourceBundle},
    widgets::Package,
};
use serde_json::json;
use std::collections::BTreeMap;
fn package() -> Package {
    serde_json::from_value(json!({"identity":"workspace/widget-a","manifest":{"schemaVersion":1,"publisher":"personal","name":"test-widget","version":"0.1.0","hostApi":1,"permissions":[],"exports":{"needs":{"kind":"widget","path":"widget.json"},"catalogue":{"kind":"data","path":"choices.json","type":"choices"}}},"files":{"widget.html":"<button>Example</button>","choices.json":json!({"choices":[{"value":"rest","label":"Rest"},{"value":"care","label":"Care"}]}).to_string(),"widget.json":json!({"schemaVersion":1,"name":"Test","entry":"widget.html","inputs":{"options":{"type":"choices","defaultFrom":"catalogue"},"max":{"type":"number","default":2,"integer":true,"minimum":1,"maximum":1000},"view":{"type":"text","default":"simple","enum":["simple","detailed"]}},"outputs":{"needs":{"type":"list[choice]","from":"options","minItems":0,"maxItemsFrom":"max"}},"fallback":{"kind":"multi-choice","input":"options","output":"needs"}}).to_string()}})).unwrap()
}
const SOURCE:&str=":language 1\n:import \"personal/test-widget@0.1.0\" as ui\n:output result\nselection = !widget ui.needs {\n :with max = 1\n Select needs.\n}\nresult = selection.needs\n!show {\nSelected: {{result}}\n}\n-> end\n";
fn snapshot(source: &str, p: Package) -> ExecutableSnapshot {
    ExecutableSnapshot::build_with_widgets(
        SourceBundle {
            root: "test".into(),
            patterns: BTreeMap::from([("test".into(), source.into())]),
        },
        BTreeMap::new(),
        BTreeMap::from([(p.reference(), p)]),
    )
    .unwrap()
}
#[test]
fn widget_confirmation_is_typed_normalized_and_replay_safe() {
    let p = package();
    p.validate().unwrap();
    let compiled = compiler::compile_with_widgets(
        SOURCE,
        &BTreeMap::new(),
        &BTreeMap::from([(p.reference(), p.clone())]),
    )
    .unwrap();
    assert_eq!(compiled.inspect().unwrap().steps[0].kind, "widget");
    let turn = manager::start(
        snapshot(SOURCE, p),
        "run".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap();
    let effect = turn.state.pending().unwrap();
    assert!(matches!(effect.request, Request::Widget(_)));
    let command = Command {
        run_id: effect.run_id.clone(),
        event: Event::Fulfill(Receipt {
            effect_id: effect.effect_id.clone(),
            result: Fulfillment::Widget(json!({"needs":[{"value":"rest","label":"Forged label"}]})),
        }),
    };
    let done = manager::transition(&turn.state, command.clone()).unwrap();
    assert_eq!(done.state.root().status(), &Status::Completed);
    assert!(serde_json::to_string(done.state.root().outputs())
        .unwrap()
        .contains("Rest"));
    assert!(!serde_json::to_string(done.state.root().outputs())
        .unwrap()
        .contains("Forged"));
    let bytes = serde_json::to_vec(&done.state).unwrap();
    let restored: pattern_core::manager::RunManager = serde_json::from_slice(&bytes).unwrap();
    manager::replay(&restored).unwrap();
    manager::transition(&restored, command).unwrap();
}
#[test]
fn invalid_answers_do_not_advance_or_partially_bind() {
    let turn = manager::start(
        snapshot(SOURCE, package()),
        "run".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap();
    let effect = turn.state.pending().unwrap();
    for value in [
        json!({}),
        json!({"needs":[],"extra":true}),
        json!({"needs":[{"value":"unknown","label":"X"}]}),
        json!({"needs":[{"value":"rest","label":"Rest"},{"value":"rest","label":"Rest"}]}),
        json!({"needs":[{"value":"rest","label":"Rest"},{"value":"care","label":"Care"}]}),
    ] {
        assert!(manager::transition(
            &turn.state,
            Command {
                run_id: effect.run_id.clone(),
                event: Event::Fulfill(Receipt {
                    effect_id: effect.effect_id.clone(),
                    result: Fulfillment::Widget(value)
                })
            }
        )
        .is_err());
    }
    assert!(turn.state.root().outputs().is_empty());
}
#[test]
fn contracts_imports_and_versions_are_checked_before_running() {
    let p = package();
    let packages = BTreeMap::from([(p.reference(), p.clone())]);
    for source in [
        SOURCE.replace(":with max = 1", ":with max = \"wrong\""),
        SOURCE.replace(":with max = 1", ":with missing = 1"),
        SOURCE.replace("ui.needs", "ui.missing"),
        SOURCE.replace("personal/test-widget@0.1.0", "personal/missing@1"),
    ] {
        assert!(
            compiler::compile_with_widgets(&source, &BTreeMap::new(), &packages).is_err(),
            "{source}"
        );
    }
    let old = snapshot(SOURCE, p.clone());
    let before = old.id().to_owned();
    let serialized = serde_json::to_value(&old).unwrap();
    let mut newer = p;
    newer.manifest.version = "0.2.0".into();
    assert_ne!(
        before,
        snapshot(&SOURCE.replace("@0.1.0", "@0.2.0"), newer).id()
    );
    let restored: ExecutableSnapshot = serde_json::from_value(serialized).unwrap();
    assert_eq!(before, restored.id());
}
#[test]
fn arbitrary_record_outputs_use_the_same_widget_interaction() {
    let mut p = package();
    p.manifest.exports.remove("catalogue");
    p.files.insert("widget.json".into(),json!({"schemaVersion":1,"name":"Reflection","entry":"widget.html","inputs":{},"outputs":{"note":{"type":"text"},"energy":{"type":"number","minimum":0,"maximum":10},"tags":{"type":"list[text]","minItems":0,"maxItems":3}}}).to_string());
    p.validate().unwrap();
    let interaction =
        pattern_core::widgets::prepare(p, "needs", BTreeMap::new(), "Reflect".into()).unwrap();
    assert!(interaction
        .accept_json(&json!({"note":"Example","energy":7,"tags":[]}))
        .is_ok());
    assert!(interaction
        .accept_json(&json!({"note":"Example","energy":11,"tags":[]}))
        .is_err());
}

#[test]
fn strict_contracts_defaults_and_catalogue_graphs_are_rejected_early() {
    for definition in [
        r#"{"schemaVersion":1,"schemaVersion":1,"name":"X","entry":"widget.html","inputs":{},"outputs":{"x":{"type":"text"}}}"#,
        r#"{"schemaVersion":1,"name":"X","entry":"widget.html","inputs":{"x":{"type":"text","default":"bad","enum":["good"]}},"outputs":{"x":{"type":"text"}}}"#,
        r#"{"schemaVersion":1,"name":"X","entry":"widget.html","inputs":{},"outputs":{"x":{"type":"text","mystery":true}}}"#,
    ] {
        let mut p = package();
        p.files.insert("widget.json".into(), definition.into());
        assert!(p.validate().is_err());
    }
    for sidecar in [
        json!({"groups":[{"id":"a","label":"A","parent_ids":["a"]}]}),
        json!({"groups":[{"id":"a","label":"A"}],"memberships":{"unknown":["a"]}}),
        json!({"groups":[{"id":"a","label":"A"}],"starterIdsByArea":{"a":["rest"]}}),
    ] {
        let mut p = package();
        p.files.insert(
            "choices.json".into(),
            json!({"choices":[{"value":"rest","label":"Rest"}],"presentation":sidecar}).to_string(),
        );
        assert!(p.validate().is_err());
    }
    let p = package();
    let env = BTreeMap::from([(p.reference(), p)]);
    assert!(compiler::compile_with_widgets(
        &SOURCE.replace(":with max = 1", ":with view = \"invalid\""),
        &BTreeMap::new(),
        &env
    )
    .is_err());
}

#[test]
fn explicit_null_defaults_and_closed_nested_records_are_supported() {
    let mut p = package();
    p.files.insert("widget.json".into(),json!({"schemaVersion":1,"name":"Generic","entry":"widget.html","inputs":{"note":{"type":"Optional[text]","default":null}},"outputs":{"record":{"type":"{note: Optional[text], score: number}"}}}).to_string());
    let interaction =
        pattern_core::widgets::prepare(p, "needs", BTreeMap::new(), String::new()).unwrap();
    assert!(interaction
        .accept_json(&json!({"record":{"note":null,"score":2}}))
        .is_ok());
    assert!(interaction
        .accept_json(&json!({"record":{"score":2}}))
        .is_err());
    assert!(interaction
        .accept_json(&json!({"record":{"note":null,"score":2,"extra":true}}))
        .is_err());
}

#[test]
fn pause_restore_and_stale_confirmation_keep_the_original_pending_effect() {
    let turn = manager::start(
        snapshot(SOURCE, package()),
        "run".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap();
    let effect = turn.state.pending().unwrap().clone();
    let result = Fulfillment::Widget(json!({"needs":[{"value":"rest","label":"Rest"}]}));
    let command = Command {
        run_id: effect.run_id.clone(),
        event: Event::Fulfill(Receipt {
            effect_id: effect.effect_id.clone(),
            result: result.clone(),
        }),
    };
    let paused = manager::transition(
        &turn.state,
        Command {
            run_id: effect.run_id.clone(),
            event: Event::Pause,
        },
    )
    .unwrap();
    assert_eq!(paused.state.root().status(), &Status::Paused);
    assert!(manager::transition(&paused.state, command.clone()).is_err());
    let restored: pattern_core::manager::RunManager =
        serde_json::from_slice(&serde_json::to_vec(&paused.state).unwrap()).unwrap();
    let resumed = manager::transition(
        &restored,
        Command {
            run_id: effect.run_id.clone(),
            event: Event::Resume,
        },
    )
    .unwrap();
    assert_eq!(resumed.state.pending().unwrap().effect_id, effect.effect_id);
    assert!(manager::transition(
        &resumed.state,
        Command {
            run_id: effect.run_id.clone(),
            event: Event::Fulfill(Receipt {
                effect_id: "previous-mount".into(),
                result
            })
        }
    )
    .is_err());
    let accepted = manager::transition(&resumed.state, command.clone()).unwrap();
    let again = manager::transition(&accepted.state, command).unwrap();
    assert_eq!(again.state, accepted.state);
}
