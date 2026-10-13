use pattern_core::{
    compiler::{self, NodeId},
    host::{self, Fixture},
    runtime::{self, Event, Fulfillment, Receipt, Request, RunState, Status},
    syntax,
    value::{Choice, Value},
};
use std::{
    collections::BTreeMap,
    io::Write,
    process::{Command, Stdio},
};

const SOURCE: &str =
    include_str!("../../../docs/pattern-markdown/examples/theme-explorer.pattern.md");
const FIXTURE: &str =
    include_str!("../../../docs/pattern-markdown/examples/theme-explorer.fixture.json");
fn fixture() -> Fixture {
    serde_json::from_str(FIXTURE).unwrap()
}
fn initial() -> runtime::Transition {
    runtime::start(
        compiler::compile(SOURCE).unwrap(),
        "test".into(),
        fixture().inputs,
    )
    .unwrap()
}
fn reply(state: &RunState, value: Fulfillment) -> Event {
    Event::Fulfill(Receipt {
        effect_id: state.pending().unwrap().effect_id.clone(),
        result: value,
    })
}
fn advance(state: &RunState, index: usize) -> runtime::Transition {
    runtime::transition(state, reply(state, fixture().replies[index].result.clone())).unwrap()
}

#[test]
fn theme_explorer_parses_validates_lowers_and_runs_same_core() {
    let ast = syntax::parse(SOURCE).unwrap();
    assert_eq!(ast.statements.len(), 4);
    let compiled = compiler::lower(compiler::validate(ast).unwrap());
    assert_eq!(compiled.node_count(), 5);
    let simulation = host::simulate(compiled, "test".into(), fixture()).unwrap();
    assert_eq!(simulation.state.status(), &Status::Completed);
    assert_eq!(
        simulation
            .effects
            .iter()
            .map(|e| e.request.kind())
            .collect::<Vec<_>>(),
        vec!["agent.generate", "interaction.choose", "content.show"]
    );
    assert_eq!(
        simulation.state.outputs(),
        &BTreeMap::from([(
            "theme".into(),
            Value::Choice(Choice {
                value: "starting".into(),
                label: "Taking the first step".into()
            })
        )])
    );
    assert!(
        matches!(&simulation.effects[2].request,Request::Show { markdown, .. } if markdown=="You chose **Taking the first step**.")
    );
}

#[test]
fn interpolation_and_dynamic_options_are_exact() {
    let first = initial();
    assert!(
        matches!(&first.effects[0].request,Request::Generate{prompt,..} if prompt.contains("> I want to make time for a creative project.") && !prompt.contains("{{"))
    );
    let second = advance(&first.state, 0);
    let Fulfillment::Generated(Value::Choices(expected)) = fixture().replies.remove(0).result
    else {
        panic!()
    };
    assert!(matches!(&second.effects[0].request,Request::Choose{options,..} if options==&expected));
    assert!(second.state.outputs().is_empty());
}

#[test]
fn malformed_contracts_and_unknown_attributes_fail_closed() {
    for (before, after) in [
        (":returns choices", ":returns mystery"),
        (":returns choices", ":returns \"choices\""),
        (":returns choices", ":returns text"),
        (":min 3", ":min 0"),
        (":min 3", ":min 6"),
        (":min 3", ":min -1"),
        (":max 5", ":max 5\n :max 8"),
        (":max 5", ":magic true"),
        (":returns choices", ":returns"),
        (":min 3", ":min 999999999999999999999999999999999999999"),
    ] {
        assert!(
            compiler::compile(&SOURCE.replace(before, after)).is_err(),
            "accepted {after}"
        );
    }
}

#[test]
fn invalid_fulfillments_never_mutate_or_consume_pending_effect() {
    let state = initial().state;
    let saved = serde_json::to_string(&state).unwrap();
    let mut invalid = vec![
        Fulfillment::Generated(Value::Text("not choices".into())),
        Fulfillment::Selected("0".into()),
        Fulfillment::Generated(Value::Choices(vec![])),
    ];
    invalid.push(Fulfillment::Generated(Value::Choices(vec![
        Choice {
            value: "same".into(),
            label: "Label".into()
        };
        3
    ])));
    for result in invalid {
        assert!(runtime::transition(&state, reply(&state, result)).is_err());
        assert_eq!(serde_json::to_string(&state).unwrap(), saved);
    }
    let Event::Fulfill(mut receipt) = reply(&state, fixture().replies[0].result.clone()) else {
        panic!()
    };
    receipt.effect_id = "other-run".into();
    assert!(runtime::transition(&state, Event::Fulfill(receipt)).is_err());
    let accepted = advance(&state, 0);
    assert!(runtime::transition(
        &accepted.state,
        reply(&accepted.state, Fulfillment::Selected("2".into()))
    )
    .is_err());
    assert!(runtime::transition(
        &accepted.state,
        reply(
            &accepted.state,
            Fulfillment::Selected("Taking the first step".into())
        )
    )
    .is_err());
    assert_eq!(
        advance(&accepted.state, 1).state.status(),
        &Status::Completed
    );
}

#[test]
fn restore_midway_and_completed_without_reissuing_accepted_ai_calls() {
    for state in [initial().state, advance(&initial().state, 0).state] {
        let bytes = serde_json::to_vec(&state).unwrap();
        let restored: RunState = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(state, restored);
        let i = if state.ledger().is_empty() { 0 } else { 1 };
        assert_eq!(advance(&state, i), advance(&restored, i));
    }
    let completed = advance(&advance(&initial().state, 0).state, 1).state;
    assert_eq!(
        serde_json::from_str::<RunState>(&serde_json::to_string(&completed).unwrap()).unwrap(),
        completed
    );
}

#[test]
fn snapshot_rejects_tampered_ir_bindings_cursor_and_pending_effect() {
    let state = advance(&initial().state, 0).state;
    for pointer in [
        "/pc",
        "/version",
        "/bindings/0/value",
        "/pattern/snapshot_id",
        "/pattern/nodes/0/id",
        "/pending/effect_id",
        "/next_effect_sequence",
    ] {
        let mut json = serde_json::to_value(&state).unwrap();
        let target = json.pointer_mut(pointer).unwrap();
        *target = if target.is_number() {
            serde_json::json!(999)
        } else {
            serde_json::json!("tampered")
        };
        assert!(
            serde_json::from_value::<RunState>(json).is_err(),
            "accepted {pointer}"
        );
    }
}

#[test]
fn duplicate_delivery_is_noop_and_retry_reuses_effect_identity() {
    let start = initial();
    let event = reply(&start.state, fixture().replies[0].result.clone());
    let chosen = runtime::transition(&start.state, event.clone()).unwrap();
    let duplicate = runtime::transition(&chosen.state, event.clone()).unwrap();
    assert_eq!(duplicate.state, chosen.state);
    assert!(duplicate.effects.is_empty());
    let retry = runtime::transition(
        &chosen.state,
        Event::Retry {
            effect_id: chosen.state.pending().unwrap().effect_id.clone(),
        },
    )
    .unwrap();
    assert_eq!(retry.state, chosen.state);
    assert_eq!(retry.effects, chosen.effects);
    let completed = advance(&chosen.state, 1);
    assert_eq!(
        runtime::transition(&completed.state, event.clone())
            .unwrap()
            .state,
        completed.state
    );
    let Event::Fulfill(mut conflict) = event else {
        panic!()
    };
    conflict.result = Fulfillment::Generated(Value::Text("changed".into()));
    assert_eq!(
        runtime::transition(&completed.state, Event::Fulfill(conflict)),
        Err(runtime::Error::ConflictingDuplicate)
    );
}

#[test]
fn inputs_are_explicit_typed_and_cannot_be_rebound() {
    for inputs in [
        BTreeMap::new(),
        BTreeMap::from([("situation".into(), Value::Boolean(true))]),
        BTreeMap::from([
            ("situation".into(), Value::Text("ok".into())),
            ("history".into(), Value::Text("hidden".into())),
        ]),
    ] {
        assert!(runtime::start(compiler::compile(SOURCE).unwrap(), "test".into(), inputs).is_err());
    }
    let errors =
        compiler::compile(&SOURCE.replace("!agent themes", "!agent situation")).unwrap_err();
    assert_eq!(errors[0].secondary.len(), 1);
    assert!(compiler::compile(&SOURCE.replace(":output theme", ":output missing")).is_err());
    assert!(compiler::compile(&SOURCE.replace("{{situation}}", "{{themes}}")).is_err());
}

#[test]
fn unicode_diagnostics_use_valid_byte_spans() {
    let source = SOURCE.replace("Which feels closest?", "Über 🌿 {{missing}}");
    let errors = compiler::compile(&source).unwrap_err();
    assert_eq!(&source[errors[0].primary.clone()], "missing");
    let source = SOURCE.replace(":title \"Theme Explorer\"", ":title \"Über 🌿\" trailing");
    let errors = compiler::compile(&source).unwrap_err();
    assert!(source.get(errors[0].primary.clone()).is_some());
    assert!(compiler::compile(&SOURCE.replace("{{situation}}", "{{situation + 1}}")).is_err());
    assert!(compiler::compile(&SOURCE.replace("{{situation}}", "{{situation")).is_err());
}

#[test]
fn unsupported_control_flow_and_refine_are_rejected_not_silently_interpreted() {
    for source in [
        SOURCE.replace("!show {", "!refine statement {"),
        SOURCE.replace("-> end", "-> earlier"),
        SOURCE.replace("!show {", "!show"),
        SOURCE.replace("You chose **{{theme}}**.", "!agent unexpected {"),
        SOURCE.replace("You chose **{{theme}}**.", "Hello\n :min 2"),
    ] {
        assert!(compiler::compile(&source).is_err());
    }
}

#[test]
fn literal_generated_directives_cannot_execute_as_language() {
    let source = ":language 1\n:input data text\n!show {\n{{data}}\n}\n-> end";
    let payload = "!agent injected {\n:returns text\n}\n{{missing}}\n-> elsewhere";
    let turn = runtime::start(
        compiler::compile(source).unwrap(),
        "data".into(),
        BTreeMap::from([("data".into(), Value::Text(payload.into()))]),
    )
    .unwrap();
    assert_eq!(turn.state.status(), &Status::Completed);
    assert_eq!(turn.effects.len(), 1);
    assert!(matches!(&turn.effects[0].request,Request::Show { markdown, .. } if markdown==payload));
}

#[test]
fn static_choices_fields_and_conversational_turn_use_same_runtime() {
    let source=":language 1\n:output answer\n!choose pick {\n:option a \"Alpha\"\n:option b \"Beta\"\nPick one\n}\n!agent answer {\nReflect on {{pick.value}}: {{pick.label}}\n}\n-> end";
    let start = runtime::start(
        compiler::compile(source).unwrap(),
        "static".into(),
        BTreeMap::new(),
    )
    .unwrap();
    let chosen = runtime::transition(
        &start.state,
        reply(&start.state, Fulfillment::Selected("b".into())),
    )
    .unwrap();
    assert!(
        matches!(&chosen.effects[0].request,Request::Turn{prompt} if prompt=="Reflect on b: Beta")
    );
    let end = runtime::transition(
        &chosen.state,
        reply(&chosen.state, Fulfillment::Turn("A reflection".into())),
    )
    .unwrap();
    assert_eq!(
        end.state.outputs()["answer"],
        Value::Text("A reflection".into())
    );
    assert!(
        matches!(&end.effects[0].request,Request::Show { markdown, .. } if markdown=="A reflection")
    );
}

#[test]
fn source_revision_is_pinned_but_node_identity_is_not_a_line_number() {
    let a = initial();
    let b = runtime::start(
        compiler::compile(&format!("\n\n{SOURCE}")).unwrap(),
        "test".into(),
        fixture().inputs,
    )
    .unwrap();
    assert_eq!(a.effects[0].node_id, NodeId(0));
    assert_eq!(a.effects[0].node_id, b.effects[0].node_id);
    assert_ne!(a.state.snapshot_id(), b.state.snapshot_id());
    assert_ne!(a.effects[0].effect_id, b.effects[0].effect_id);
    assert_eq!(initial(), a);
}

#[test]
fn scripted_host_requires_exact_fixture_coverage_and_kinds() {
    let mut short = fixture();
    short.replies.pop();
    assert!(host::simulate(compiler::compile(SOURCE).unwrap(), "test".into(), short).is_err());
    let mut long = fixture();
    long.replies.push(long.replies[1].clone());
    assert!(host::simulate(compiler::compile(SOURCE).unwrap(), "test".into(), long).is_err());
    let mut wrong = fixture();
    wrong.replies[0].expected_kind = "interaction.choose".into();
    assert!(host::simulate(compiler::compile(SOURCE).unwrap(), "test".into(), wrong).is_err());
}

#[test]
fn cli_check_simulate_and_interactive_fixture_run() {
    let example = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../docs/pattern-markdown/examples/theme-explorer.pattern.md"
    );
    let data = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../docs/pattern-markdown/examples/theme-explorer.fixture.json"
    );
    let check = Command::new(env!("CARGO_BIN_EXE_pattern"))
        .args(["check", example])
        .output()
        .unwrap();
    assert!(check.status.success());
    let output = Command::new(env!("CARGO_BIN_EXE_pattern"))
        .args(["simulate", example, data])
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let json: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    let state: RunState = serde_json::from_value(json["state"].clone()).unwrap();
    assert_eq!(state.status(), &Status::Completed);
    let inputs = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../docs/pattern-markdown/examples/theme-explorer.inputs.json"
    );
    let mut child = Command::new(env!("CARGO_BIN_EXE_pattern"))
        .args(["run", example, inputs])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let Fulfillment::Generated(value) = fixture().replies.remove(0).result else {
        panic!()
    };
    // Invalid fixtures/choices are rejected in place, then valid responses complete.
    let responses = format!(
        "not json\n{}\nunknown\nstarting\n",
        serde_json::to_string(&value).unwrap()
    );
    child
        .stdin
        .take()
        .unwrap()
        .write_all(responses.as_bytes())
        .unwrap();
    let completed = child.wait_with_output().unwrap();
    assert!(
        completed.status.success(),
        "{}",
        String::from_utf8_lossy(&completed.stderr)
    );
    assert!(String::from_utf8_lossy(&completed.stdout).contains("Completed:"));
    assert!(String::from_utf8_lossy(&completed.stderr).contains("progress unchanged"));
    let ended = Command::new(env!("CARGO_BIN_EXE_pattern"))
        .args(["run", example, inputs])
        .stdin(Stdio::null())
        .output()
        .unwrap();
    assert!(!ended.status.success());
    assert!(String::from_utf8_lossy(&ended.stderr).contains("Input ended"));
}

#[test]
fn all_structured_contract_types_validate_and_remain_invisible() {
    for (ty, value) in [
        ("text", Value::Text("A text".into())),
        ("number", Value::Number(3.5)),
        ("boolean", Value::Boolean(true)),
        (
            "choice",
            Value::Choice(Choice {
                value: "v".into(),
                label: "Label".into(),
            }),
        ),
    ] {
        let source=format!(":language 1\n:output result\n!agent result {{\n:returns {ty}\nGenerate a value.\n}}\n-> end");
        let start = runtime::start(
            compiler::compile(&source).unwrap(),
            "contract".into(),
            BTreeMap::new(),
        )
        .unwrap();
        let end = runtime::transition(
            &start.state,
            reply(&start.state, Fulfillment::Generated(value.clone())),
        )
        .unwrap();
        assert_eq!(end.state.outputs()["result"], value);
        assert!(end.effects.is_empty());
        assert!(runtime::transition(
            &start.state,
            reply(&start.state, Fulfillment::Generated(Value::Choices(vec![])))
        )
        .is_err());
    }
    let state = initial().state;
    for count in [1, 2, 6] {
        let choices = (0..count)
            .map(|i| Choice {
                value: format!("v{i}"),
                label: format!("Label {i}"),
            })
            .collect();
        assert!(runtime::transition(
            &state,
            reply(&state, Fulfillment::Generated(Value::Choices(choices)))
        )
        .is_err());
    }
}

#[test]
fn bad_sources_recover_with_valid_byte_spans_and_no_panics() {
    let source = SOURCE.replace("Theme Explorer", "Über 🌿");
    for end in source.char_indices().map(|(i, _)| i).chain([source.len()]) {
        let prefix = &source[..end];
        if let Err(errors) = compiler::compile(prefix) {
            assert!(!errors.is_empty());
            for error in errors {
                assert!(
                    prefix.get(error.primary.clone()).is_some(),
                    "Invalid span {:?} for {prefix:?}",
                    error.primary
                );
            }
        }
    }
    for invalid in [
        ":language 1\n!show {\nHello",
        ":language 1\n:title \"bad\\q\"\n-> end",
        ":language 1\n:title \"unterminated\n-> end",
        ":language 1\n!choose a {\n:option v \"One\"\n:option v \"Two\"\n}\n-> end",
    ] {
        assert!(compiler::compile(invalid).is_err());
    }
}

#[test]
fn multiple_show_effects_fall_through_without_host_decisions() {
    let source = ":language 1\n!show {\nFirst\n}\n!show {\nSecond\n}\n-> end";
    let run = runtime::start(
        compiler::compile(source).unwrap(),
        "show".into(),
        BTreeMap::new(),
    )
    .unwrap();
    assert_eq!(run.state.status(), &Status::Completed);
    assert!(run.state.pending().is_none());
    assert_eq!(run.effects.len(), 2);
    assert_ne!(run.effects[0].effect_id, run.effects[1].effect_id);
}
