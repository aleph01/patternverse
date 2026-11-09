//! Explicit mapping pipes share typed transforms, pure evaluation, and durable replay.
use pattern_core::{
    compiler,
    runtime::{self, Event, Fulfillment, Receipt, RunState},
    value::{Type, Value},
};
use std::collections::BTreeMap;

fn start(body: &str) -> RunState {
    let source = format!(":language 1\n:output result\n{body}\n-> end");
    let pattern =
        compiler::compile(&source).unwrap_or_else(|errors| panic!("{errors:?}\n{source}"));
    runtime::start(pattern, "mapping-pipe-test".into(), BTreeMap::new())
        .unwrap()
        .state
}

fn output(body: &str) -> Value {
    let state = start(body);
    let restored: RunState = serde_json::from_slice(&serde_json::to_vec(&state).unwrap()).unwrap();
    assert_eq!(state, restored);
    restored.outputs()["result"].clone()
}

fn numbers(values: &[f64]) -> Value {
    Value::List {
        element_type: Type::Number,
        items: values.iter().copied().map(Value::Number).collect(),
    }
}

#[test]
fn named_helpers_builtins_and_mixed_pipes_preserve_order() {
    for body in [
        "fn clean(value: text) -> text => value |> trim |> normalize_whitespace\nnotes = [\"  Take a pause  \", \"Ask   for help\"]\nresult = notes |>> clean |> join(\"; \")",
        "notes = [\"  Take a pause  \", \"Ask   for help\"]\nresult = notes |>> trim |>> normalize_whitespace |> join(\"; \")",
        "result = [\"  Take a pause  \", \"Ask   for help\"]\n  |>> trim\n  |>> normalize_whitespace\n  |> join(\"; \")",
        "result = [\"  Take a pause  \", \"Ask   for help\"] |>>\n  trim |>>\n  normalize_whitespace |>\n  join(\"; \")",
    ] {
        assert_eq!(output(body), Value::Text("Take a pause; Ask for help".into()));
    }
    assert_eq!(
        output("result = [12, -2, 4] |>> clamp(0, 10)"),
        numbers(&[10., 0., 4.])
    );
    assert_eq!(
        output("result = [[12], [-2, 4]] |> flatten |>> clamp(0, 10) |> sum"),
        Value::Number(14.)
    );
}

#[test]
fn mapping_is_one_level_and_additional_lists_are_whole_arguments() {
    assert_eq!(
        output("result = [[1, 2], [3]] |>> count"),
        numbers(&[2., 1.])
    );
    assert_eq!(
        output("result = [[1], [2]] |>> concat([9, 8])"),
        Value::List {
            element_type: Type::List(Box::new(Type::Number)),
            items: vec![numbers(&[1., 9., 8.]), numbers(&[2., 9., 8.])],
        }
    );
    assert_eq!(
        output("result = [\"a,b\", \"c\"] |>> split(\",\") |>> count"),
        numbers(&[2., 1.])
    );
    assert_eq!(
        output("result = []:text |>> split(\",\")"),
        Value::List {
            element_type: Type::List(Box::new(Type::Text)),
            items: vec![],
        }
    );
    assert_eq!(
        output("result = [[1], [2, 3]] |>> map(_ * 2)"),
        Value::List {
            element_type: Type::List(Box::new(Type::Number)),
            items: vec![numbers(&[2.]), numbers(&[4., 6.])],
        }
    );
}

#[test]
fn helpers_captures_enums_and_nested_callbacks_keep_their_scope() {
    assert_eq!(output("fn bound(values: list[number], low: number) -> list[number] => values |>> clamp(low, 10)\nresult = bound([1, 9], 3)"), numbers(&[3., 9.]));
    assert_eq!(
        output("low = 3\nresult = [1, 9] |>> clamp(low, 10)"),
        numbers(&[3., 9.])
    );
    assert_eq!(
        output("result = map([[1], [2, 3]], _ |>> clamp(2, 10))"),
        Value::List {
            element_type: Type::List(Box::new(Type::Number)),
            items: vec![numbers(&[2.]), numbers(&[2., 3.])],
        }
    );
    assert_eq!(
        output("result = map([1, 3], n => [0, 9] |>> clamp(n, 10))"),
        Value::List {
            element_type: Type::List(Box::new(Type::Number)),
            items: vec![numbers(&[1., 9.]), numbers(&[3., 9.])],
        }
    );
    assert_eq!(output("type Intent = answer | other\nresult = [[Intent.answer], [Intent.other]] |>> contains(Intent.answer)"), Value::List {
        element_type: Type::Boolean,
        items: vec![Value::Boolean(true), Value::Boolean(false)],
    });
}

#[test]
fn stage_helpers_keep_precedence_over_newer_builtin_names() {
    assert_eq!(
        output("fn sum(n: number) -> number => n + 10\nresult = [1, 2] |>> sum"),
        numbers(&[11., 12.])
    );
}

#[test]
fn both_pipes_have_the_same_left_associative_low_precedence() {
    assert_eq!(
        output("result = [8, 12] |>> clamp(0 + 1, 5 * 2) |> sum"),
        Value::Number(18.)
    );
    assert_eq!(
        output("result = ([8, 12] |>> clamp(0, 10) |> sum) + 1"),
        Value::Number(19.)
    );
    assert_eq!(
        output("result = [[1], [2, 3]] |>> count |>> clamp(0, 1)"),
        numbers(&[1., 1.])
    );
}

#[test]
fn invalid_stages_and_implicit_mapping_remain_type_errors_even_for_empty_lists() {
    for body in [
        "result = 1 |>> clamp(0, 10)",
        "result = [\"a\"] |>> clamp(0, 10)",
        "result = [[\"a\"]] |>> trim",
        "result = []:text |>> missing",
        "result = []:text |>> clamp(0, 10)",
        "result = []:number |>> clamp(0)",
        "result = [\"a\"] |> trim",
        "result = [1] |>> (n => n * 2)",
        "result = [1] |>> !ask {Question}",
        "result = [[1]] |>> shuffle",
    ] {
        let source = format!(":language 1\n{body}\n-> end");
        let errors = compiler::compile(&source).expect_err(&source);
        assert!(!errors.is_empty());
        for error in errors {
            assert!(source.get(error.primary).is_some());
        }
    }
}

#[test]
fn mapping_captured_answers_survives_pause_restore_and_replay() {
    let state = start("low = !rate 0..10 {\nMinimum?\n}\nresult = [1, 9] |>> clamp(low, 10)");
    let paused = runtime::transition(&state, Event::Pause).unwrap().state;
    let restored: RunState = serde_json::from_slice(&serde_json::to_vec(&paused).unwrap()).unwrap();
    let resumed = runtime::transition(&restored, Event::Resume).unwrap().state;
    let done = runtime::transition(
        &resumed,
        Event::Fulfill(Receipt {
            effect_id: resumed.pending().unwrap().effect_id.clone(),
            result: Fulfillment::Rating(3.),
        }),
    )
    .unwrap()
    .state;
    assert_eq!(done.outputs()["result"], numbers(&[3., 9.]));
    let replayed: RunState = serde_json::from_slice(&serde_json::to_vec(&done).unwrap()).unwrap();
    assert_eq!(done, replayed);
}

#[test]
fn mapping_failure_rolls_back_the_response_and_unicode_diagnostics_are_valid() {
    let state = start("answer = !ask {\nContinue?\n}\nresult = [1] |>> clamp(10, 0)");
    let saved = serde_json::to_vec(&state).unwrap();
    assert!(runtime::transition(
        &state,
        Event::Fulfill(Receipt {
            effect_id: state.pending().unwrap().effect_id.clone(),
            result: Fulfillment::Text("yes".into()),
        })
    )
    .is_err());
    assert_eq!(saved, serde_json::to_vec(&state).unwrap());
    let source = ":language 1\nresult = [\"é 🫶\"] |>> trim |>> concat(\"!\")\n-> end";
    for end in source
        .char_indices()
        .map(|(index, _)| index)
        .chain([source.len()])
    {
        if let Err(errors) = compiler::compile(&source[..end]) {
            for error in errors {
                assert!(source[..end].get(error.primary).is_some());
            }
        }
    }
}
