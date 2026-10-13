use pattern_core::{
    compiler,
    host::{self, Fixture},
    runtime::{self, Event, Fulfillment, Receipt, Request, RunState, Status, Trace},
    syntax::Severity,
    value::{Choice, Type, Value},
};
use std::collections::BTreeMap;
const CHECK_IN: &str = include_str!("../../../docs/pattern-markdown/examples/check-in.pattern.md");
fn start(source: &str, inputs: BTreeMap<String, Value>) -> runtime::Transition {
    runtime::start(
        compiler::compile(source).unwrap_or_else(|e| panic!("{e:?}\n{source}")),
        "m2".into(),
        inputs,
    )
    .unwrap()
}
fn event(state: &RunState, result: Fulfillment) -> Event {
    Event::Fulfill(Receipt {
        effect_id: state.pending().unwrap().effect_id.clone(),
        result,
    })
}
fn answer(state: &RunState, result: Fulfillment) -> runtime::Transition {
    runtime::transition(state, event(state, result)).unwrap()
}
fn value(expression: &str) -> Value {
    let source = format!(":language 1\n:output result\n= result {expression}\n-> end");
    start(&source, BTreeMap::new()).state.outputs()["result"].clone()
}
fn invalid(source: &str, contains: &str) {
    let errors = compiler::compile(source).unwrap_err();
    assert!(
        errors.iter().any(|e| e.message.contains(contains)),
        "expected {contains}: {errors:?}"
    );
    for e in errors {
        assert!(source.get(e.primary).is_some());
    }
}

#[test]
fn validation_phases_preserve_first_error_precedence() {
    for (source, expected) in [
        (
            ":output x\n:output x\ndangling:\n",
            "Missing ':language 1' declaration",
        ),
        (
            ":language 1\n:output x\n:output x\ndangling:\n",
            "Label has no following statement",
        ),
        (
            ":language 1\n:output x\n:output x\n",
            "Pattern requires an explicit completion path",
        ),
        (
            ":language 1\n:output x\n:output x\n-> end\n",
            "Duplicate output",
        ),
        (
            ":language 1\n:output x\n-> end\n",
            "Output 'x' is not assigned on every completion path",
        ),
    ] {
        let errors = compiler::compile(source).unwrap_err();
        assert_eq!(errors[0].message, expected, "{source}");
        assert!(source.get(errors[0].primary.clone()).is_some());
    }
}

#[test]
fn ask_rating_and_all_ordered_branch_paths_join_with_outputs() {
    for (rating, expected) in [
        (0., "Make room to rest."),
        (3.99, "Make room to rest."),
        (4., "Choose one small action."),
        (7.99, "Choose one small action."),
        (8., "Try a focused work period."),
        (10., "Try a focused work period."),
    ] {
        let first = start(CHECK_IN, BTreeMap::new());
        assert!(matches!(&first.effects[0].request, Request::Ask { .. }));
        let second = answer(&first.state, Fulfillment::Text("Painting".into()));
        assert!(
            matches!(&second.effects[0].request,Request::Rate{prompt,rating} if prompt.contains("Painting") && rating.min==0. && rating.max==10. && rating.prefer.as_deref()==Some("slider"))
        );
        let completed = answer(&second.state, Fulfillment::Rating(rating));
        assert_eq!(completed.state.status(), &Status::Completed);
        assert_eq!(
            completed.state.outputs()["next_step"],
            Value::Text(expected.into())
        );
        assert_eq!(
            completed.state.outputs()["doubled_energy"],
            Value::Number(rating * 2.)
        );
        assert!(!completed.state.outputs().contains_key("energy"));
        assert_eq!(
            completed
                .traces
                .iter()
                .filter(|t| matches!(t, Trace::BranchSelected { .. }))
                .count(),
            1
        );
    }
}

#[test]
fn invalid_ratings_and_wrong_reply_types_leave_progress_unchanged() {
    let first = start(CHECK_IN, BTreeMap::new());
    assert_eq!(
        runtime::transition(&first.state, event(&first.state, Fulfillment::Rating(5.))),
        Err(runtime::Error::WrongResult)
    );
    let state = answer(&first.state, Fulfillment::Text(String::new())).state;
    let original = serde_json::to_string(&state).unwrap();
    for result in [
        Fulfillment::Rating(-0.1),
        Fulfillment::Rating(10.1),
        Fulfillment::Rating(f64::NAN),
        Fulfillment::Rating(f64::INFINITY),
        Fulfillment::Text("5".into()),
    ] {
        assert!(runtime::transition(&state, event(&state, result)).is_err());
        assert_eq!(serde_json::to_string(&state).unwrap(), original);
    }
    assert_eq!(
        answer(&state, Fulfillment::Rating(4.5)).state.status(),
        &Status::Completed
    );
}

#[test]
fn precedence_literals_comparisons_and_short_circuit_are_typed() {
    for (expr, expected) in [
        ("2 + 3 * 4", 14.),
        ("(2 + 3) * 4", 20.),
        ("10 - 3 - 2", 5.),
        ("-2 * -3", 6.),
        ("1.5e2 + 0.5", 150.5),
    ] {
        assert_eq!(value(expr), Value::Number(expected), "{expr}");
    }
    for expression in [
        "not 2 > 3",
        "true or false and false",
        "(2 <= 2) and (3 >= 3)",
        "\"Über 🌿\" == \"Über 🌿\"",
        "2 != 3",
        "not not true",
        "true or (1e308 * 1e308 > 0)",
        "not (false and (1e308 * 1e308 > 0))",
    ] {
        assert_eq!(value(expression), Value::Boolean(true), "{expression}");
    }
    assert_eq!(value("false or true and false"), Value::Boolean(false));
    assert_eq!(value("\"a\\n\\\"b\""), Value::Text("a\n\"b".into()));
}

#[test]
fn expressions_reject_coercion_functions_and_unbounded_syntax() {
    for expr in [
        "\"a\" + \"b\"",
        "true + 1",
        "not 2",
        "1 and true",
        "\"1\" == 1",
        "count(\"text\")",
        "random()",
        "items[0]",
        "1 / 2",
        "1 < 2 < 3",
        "1e999",
        "true == 1",
    ] {
        assert!(
            compiler::compile(&format!(":language 1\n= result {expr}\n-> end")).is_err(),
            "{expr}"
        );
    }
    invalid(
        ":language 1\n?branch {\n:when 5 -> end\n:else -> end\n}",
        "boolean",
    );
}

#[test]
fn count_typed_lists_and_choices_without_ambient_context() {
    for (ty, list) in [
        (
            "list<text>",
            Value::List {
                element_type: Type::Text,
                items: vec![],
            },
        ),
        (
            "list<number>",
            Value::List {
                element_type: Type::Number,
                items: vec![Value::Number(2.), Value::Number(3.)],
            },
        ),
        (
            "choices",
            Value::Choices(vec![Choice {
                value: "x".into(),
                label: "X".into(),
            }]),
        ),
    ] {
        let expected = match &list {
            Value::List { items, .. } => items.len(),
            Value::Choices(c) => c.len(),
            _ => unreachable!(),
        };
        let source =
            format!(":language 1\n:input items {ty}\n:output size\n= size count(items)\n-> end");
        let state = start(&source, BTreeMap::from([("items".into(), list)])).state;
        assert_eq!(state.outputs()["size"], Value::Number(expected as f64));
    }
    let source = ":language 1\n:input items list<text>\n-> end";
    assert!(runtime::start(
        compiler::compile(source).unwrap(),
        "test".into(),
        BTreeMap::from([(
            "items".into(),
            Value::List {
                element_type: Type::Text,
                items: vec![Value::Boolean(false)]
            }
        )])
    )
    .is_err());
}

#[test]
fn match_uses_choice_identity_not_label_and_covers_else() {
    let source=":language 1\n:input picked choice\n:output result\n?match picked {\n:case a -> alpha\n:case b -> beta\n:else -> other\n}\nalpha:\n= result \"A\"\n-> end\nbeta:\n= result \"B\"\n-> end\nother:\n= result \"Other\"\n-> end";
    for (id, expected) in [("a", "A"), ("b", "B"), ("c", "Other")] {
        let result = start(
            source,
            BTreeMap::from([(
                "picked".into(),
                Value::Choice(Choice {
                    value: id.into(),
                    label: "a".into(),
                }),
            )]),
        );
        assert_eq!(
            result.state.outputs()["result"],
            Value::Text(expected.into())
        );
    }
}

#[test]
fn match_text_numbers_boolean_and_field_expressions() {
    for (input, ty, cases) in [
        (Value::Text("yes".into()), "text", ":case \"yes\" -> hit"),
        (Value::Number(-2.5), "number", ":case -2.5 -> hit"),
        (Value::Boolean(false), "boolean", ":case false -> hit"),
    ] {
        let source=format!(":language 1\n:input input {ty}\n:output result\n?match input {{\n{cases}\n:else -> miss\n}}\nhit:\n= result true\n-> end\nmiss:\n= result false\n-> end");
        assert_eq!(
            start(&source, BTreeMap::from([("input".into(), input)]))
                .state
                .outputs()["result"],
            Value::Boolean(true)
        );
    }
    let source=":language 1\n:input selected choice\n:output same\n= same selected.value == \"key\" and selected.label != \"key\"\n-> end";
    assert_eq!(
        start(
            source,
            BTreeMap::from([(
                "selected".into(),
                Value::Choice(Choice {
                    value: "key".into(),
                    label: "Label".into()
                })
            )])
        )
        .state
        .outputs()["same"],
        Value::Boolean(true)
    );
}

#[test]
fn branch_and_match_require_else_valid_targets_and_unique_cases() {
    for (body, message) in [
        ("?branch {\n:when true -> end\n}", "require a final :else"),
        ("?branch {\n:else -> end\n:when true -> end\n}", "final arm"),
        (
            "?branch {\n:when true -> missing\n:else -> end\n}",
            "Unknown target",
        ),
        (
            "?match true {\n:case true -> end\n:case true -> end\n:else -> end\n}",
            "Duplicate match case",
        ),
        (
            "?match true {\n:case \"true\" -> end\n:else -> end\n}",
            "Case type",
        ),
        (
            "?match 1 {\n:case 1 + 1 -> end\n:else -> end\n}",
            "must be literals",
        ),
    ] {
        invalid(&format!(":language 1\n{body}"), message);
    }
}

#[test]
fn all_jumps_are_forward_and_labels_do_not_create_scope() {
    for body in [
        "loop:\n-> loop",
        "loop:\n!show {\nText\n}\n-> loop",
        "loop:\n?branch {\n:when true -> loop\n:else -> end\n}",
        "loop:\n?match true {\n:case true -> loop\n:else -> end\n}",
    ] {
        invalid(&format!(":language 1\n{body}"), "Backward");
    }
    invalid(
        ":language 1\nagain:\n-> end\nagain:\n-> end",
        "Duplicate label",
    );
    invalid(":language 1\n-> end\nempty:", "no following statement");
    invalid(":language 1\nend:\n-> end", "reserved");
    invalid(":language 1\n= x 1\nnext:\n= x 2\n-> end", "already exists");
    invalid(":language 1\n!ask answer", "falls off");
}

#[test]
fn branch_joins_require_definite_assignment_and_single_assignment() {
    let base=":language 1\n:input flag boolean\n?branch {\n:when flag -> left\n:else -> right\n}\nleft:\n= x 1\n-> join\nright:\nRIGHT\n-> join\njoin:\nJOIN\n-> end";
    invalid(
        &base
            .replace("RIGHT", "!show {\nNo value\n}")
            .replace("JOIN", "!show {\n{{x}}\n}"),
        "not available",
    );
    invalid(
        &base
            .replace("RIGHT", "!show {\nNo value\n}")
            .replace("JOIN", "= x 2"),
        "may already be assigned",
    );
    invalid(
        &base
            .replace("RIGHT", "= x \"text\"")
            .replace("JOIN", "!show {\n{{x}}\n}"),
        "different types",
    );
    for flag in [true, false] {
        let source = base
            .replace("RIGHT", "= x 2")
            .replace("JOIN", "= y x + 1")
            .replace(":input flag boolean", ":input flag boolean\n:output y");
        assert_eq!(
            start(
                &source,
                BTreeMap::from([("flag".into(), Value::Boolean(flag))])
            )
            .state
            .outputs()["y"],
            Value::Number(if flag { 2. } else { 3. })
        );
    }
}

#[test]
fn every_completion_path_must_supply_outputs() {
    invalid(":language 1\n:output x\n?branch {\n:when true -> early\n:else -> later\n}\nearly:\n-> end\nlater:\n= x 1\n-> end","every completion path");
    invalid(":language 1\n:output x\n?branch {\n:when true -> end\n:else -> later\n}\nlater:\n= x 1\n-> end","missing on a path");
}

#[test]
fn unreachable_code_warns_and_cannot_change_reachable_state() {
    let source =
        ":language 1\n:output x\n-> live\n= x \"dead\"\n-> end\nlive:\n= x \"live\"\n-> end";
    let compiled = compiler::compile(source).unwrap();
    assert_eq!(compiled.diagnostics().len(), 2);
    assert!(compiled
        .diagnostics()
        .iter()
        .all(|d| d.severity == Severity::Warning && d.code == "S_UNREACHABLE"));
    assert_eq!(
        start(source, BTreeMap::new()).state.outputs()["x"],
        Value::Text("live".into())
    );
}

#[test]
fn source_shorthand_and_escaped_markdown_remain_data() {
    let source=":language 1\n:output response\n!ask response\n\nHow are you?\n\n!show {\n\\!ask literal\n\\:option raw\n\\-> end\n\\}\nLiteral \\{{not_bound}} and {{response}}\n\\\\path\n}\n-> end";
    let first = start(source, BTreeMap::new());
    assert!(matches!(&first.effects[0].request,Request::Ask{prompt} if prompt=="How are you?"));
    let completed = answer(&first.state, Fulfillment::Text("{{unsafe}}".into()));
    assert!(
        matches!(&completed.effects[0].request,Request::Show { markdown, .. } if markdown=="!ask literal\n:option raw\n-> end\n}\nLiteral {{not_bound}} and {{unsafe}}\n\\path")
    );
    let empty = start(":language 1\n!ask response\n-> end", BTreeMap::new());
    assert!(matches!(&empty.effects[0].request,Request::Ask{prompt} if prompt.is_empty()));
}

#[test]
fn snapshots_restore_on_each_branch_and_duplicate_replies_do_not_advance() {
    for rating in [1., 5., 9.] {
        let asked = start(CHECK_IN, BTreeMap::new()).state;
        let restored: RunState =
            serde_json::from_value(serde_json::to_value(&asked).unwrap()).unwrap();
        assert_eq!(asked, restored);
        let rated = answer(&restored, Fulfillment::Text("Learning".into())).state;
        let restored: RunState =
            serde_json::from_value(serde_json::to_value(&rated).unwrap()).unwrap();
        assert_eq!(rated, restored);
        let event = event(&restored, Fulfillment::Rating(rating));
        let end = runtime::transition(&restored, event.clone()).unwrap();
        let again = runtime::transition(&end.state, event).unwrap();
        assert_eq!(again.state, end.state);
        assert!(again.effects.is_empty());
        let recovered: RunState =
            serde_json::from_value(serde_json::to_value(&end.state).unwrap()).unwrap();
        assert_eq!(end.state, recovered);
    }
}

#[test]
fn arithmetic_failure_rolls_back_entire_transition() {
    let source = ":language 1\n!rate number 0..1e308 {\nNumber\n}\n= result number * 1e308\n-> end";
    let state = start(source, BTreeMap::new()).state;
    let before = serde_json::to_string(&state).unwrap();
    assert!(matches!(
        runtime::transition(&state, event(&state, Fulfillment::Rating(1e308))),
        Err(runtime::Error::Expression(_))
    ));
    assert_eq!(serde_json::to_string(&state).unwrap(), before);
    assert_eq!(
        answer(&state, Fulfillment::Rating(1.)).state.status(),
        &Status::Completed
    );
}

#[test]
fn check_in_fixture_uses_production_transition_path() {
    let fixture: Fixture = serde_json::from_str(include_str!(
        "../../../docs/pattern-markdown/examples/check-in.fixture.json"
    ))
    .unwrap();
    let simulation = host::simulate(
        compiler::compile(CHECK_IN).unwrap(),
        "fixture".into(),
        fixture,
    )
    .unwrap();
    assert_eq!(
        simulation.state.outputs()["next_step"],
        Value::Text("Choose one small action.".into())
    );
}

#[test]
fn expression_limits_and_partial_sources_return_diagnostics_without_panics() {
    assert_eq!(
        value(&format!("{}1{}", "(".repeat(16), ")".repeat(16))),
        Value::Number(1.)
    );
    for expr in [
        format!("{}1{}", "(".repeat(17), ")".repeat(17)),
        "not ".repeat(129) + "true",
        "1 + ".repeat(129) + "1",
    ] {
        invalid(
            &format!(":language 1\n= x {expr}\n-> end"),
            "complexity limit",
        );
    }
    // Literal content does not consume the operator budget.
    assert_eq!(
        value(&serde_json::to_string(&"not ( + ".repeat(140)).unwrap()),
        Value::Text("not ( + ".repeat(140))
    );
    let source = CHECK_IN.replace("How much energy", "Über 🌿: How much energy");
    for end in source.char_indices().map(|(i, _)| i) {
        if let Err(errors) = compiler::compile(&source[..end]) {
            for e in errors {
                assert!(source[..end].get(e.primary.clone()).is_some(), "{:?}", e);
            }
        }
    }
}

#[test]
fn unreachable_paths_are_checked_separately_from_live_paths() {
    let source = ":language 1\n-> live\n= dead 1\n!show {\n{{dead}}\n}\n-> end\nlive:\n-> end";
    assert_eq!(compiler::compile(source).unwrap().diagnostics().len(), 3);
    invalid(
        &source.replace("live:\n-> end", "live:\n!show {\n{{dead}}\n}\n-> end"),
        "not available",
    );
}

#[test]
fn rating_headers_are_validated_and_negative_decimal_limits_work() {
    for range in [
        "10..0",
        "NaN..10",
        "0..inf",
        "0..10..20",
        "0..",
        "zero..ten",
    ] {
        assert!(compiler::compile(&format!(
            ":language 1\n!rate n {range} {{\nRate\n}}\n-> end"
        ))
        .is_err());
    }
    let source = ":language 1\n:output rating\n!rate rating -2.5..2.5\n-> end";
    let run = start(source, BTreeMap::new());
    assert_eq!(
        answer(&run.state, Fulfillment::Rating(-2.5))
            .state
            .outputs()["rating"],
        Value::Number(-2.5)
    );
}

#[test]
fn boolean_and_choice_matches_can_complete_directly_at_end() {
    for b in [true, false] {
        let run = start(
            ":language 1\n:input b boolean\n?match b {\n:case true -> end\n:else -> end\n}",
            BTreeMap::from([("b".into(), Value::Boolean(b))]),
        );
        assert_eq!(run.state.status(), &Status::Completed);
        assert!(run.effects.is_empty());
    }
    let source=":language 1\n:input selected choice\n?match selected {\n:case \"has spaces\" -> end\n:else -> end\n}";
    assert_eq!(
        start(
            source,
            BTreeMap::from([(
                "selected".into(),
                Value::Choice(Choice {
                    value: "has spaces".into(),
                    label: "Something else".into()
                })
            )])
        )
        .state
        .status(),
        &Status::Completed
    );
}

#[test]
fn all_same_typed_values_can_be_compared_without_choice_label_identity() {
    let source=":language 1\n:input left choice\n:input right choice\n:output same\n= same left == right\n-> end";
    let inputs = BTreeMap::from([
        (
            "left".into(),
            Value::Choice(Choice {
                value: "id".into(),
                label: "Old label".into(),
            }),
        ),
        (
            "right".into(),
            Value::Choice(Choice {
                value: "id".into(),
                label: "New label".into(),
            }),
        ),
    ]);
    assert_eq!(
        start(source, inputs).state.outputs()["same"],
        Value::Boolean(true)
    );
}
