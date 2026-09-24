//! Version-two pure core and effectful traversal use the ordinary durable runtime.
use pattern_core::{
    compiler,
    runtime::{self, Event, Fulfillment, Receipt, Request, RunState, Status},
    value::{Type, Value},
};
use std::collections::BTreeMap;

fn start(source: &str) -> RunState {
    runtime::start(
        compiler::compile(source).unwrap_or_else(|e| panic!("{e:?}\n{source}")),
        "v2".into(),
        BTreeMap::new(),
    )
    .unwrap()
    .state
}
fn restore(state: &RunState) -> RunState {
    let restored = serde_json::from_slice(&serde_json::to_vec(state).unwrap()).unwrap();
    assert_eq!(state, &restored);
    restored
}
fn reply(state: &RunState, result: Fulfillment) -> RunState {
    runtime::transition(
        &restore(state),
        Event::Fulfill(Receipt {
            effect_id: state.pending().unwrap().effect_id.clone(),
            result,
        }),
    )
    .unwrap()
    .state
}
fn invalid(source: &str) {
    let errors = compiler::compile(source).unwrap_err();
    assert!(!errors.is_empty());
    for e in errors {
        assert!(
            source.get(e.primary.clone()).is_some(),
            "Invalid diagnostic: {e:?}"
        );
    }
}
fn numbers(items: &[f64]) -> Value {
    Value::List {
        element_type: Type::Number,
        items: items.iter().copied().map(Value::Number).collect(),
    }
}

#[test]
fn universal_bindings_and_nested_literals_keep_precise_types() {
    let source = ":language 2\n:output result\nanswer = !ask {\nWhat happened?\n}\nresult = {\n text: answer |> trim,\n scores: [1, 2 + 3],\n flags: { reviewed: false },\n empty: []:text,\n}\n-> end";
    let state = reply(
        &start(source),
        Fulfillment::Text("  A difficult day  ".into()),
    );
    assert_eq!(state.status(), &Status::Completed);
    let Value::Record(fields) = &state.outputs()["result"] else {
        panic!()
    };
    assert_eq!(fields["text"], Value::Text("A difficult day".into()));
    assert_eq!(fields["scores"], numbers(&[1., 5.]));
    assert_eq!(
        fields["empty"],
        Value::List {
            element_type: Type::Text,
            items: vec![]
        }
    );
    restore(&state);
}

#[test]
fn named_helpers_pipeline_map_filter_flatten_fold_are_pure_and_ordered() {
    let source = r#":language 2
:output result
fn twice(n: number) -> number => n * 2
fn capped(n: number) -> number => twice(n) |> clamp(0, 8)
fn big(n: number) -> boolean => n > 3
fn add(total: number, n: number) -> number => total + n
fn clean(s: text) -> text => s |> normalize_whitespace |> lowercase
items = [[1, 2], [3, 9]] |> flatten |> map(capped) |> filter(big)
total = items |> fold(0, add)
result = {items: items, total: total, label: clean("  HELLO   World ")}
-> end"#;
    let state = start(source);
    let Value::Record(result) = &state.outputs()["result"] else {
        panic!()
    };
    assert_eq!(result["items"], numbers(&[4., 6., 8.]));
    assert_eq!(result["total"], Value::Number(18.));
    assert_eq!(result["label"], Value::Text("hello world".into()));
    restore(&state);
}

#[test]
fn each_asks_in_order_restores_and_only_exports_yielded_values() {
    let source = r#":language 2
:output entries
fn clean(s: text) -> text => trim(s)
items = ["first", "second"]
entries = each item in items {
  temporary = !ask {
    Reflect on {{item}}.
  }
  normalized = clean(temporary)
  -> yield {item: item, answer: normalized}
}
-> end"#;
    let first = start(source);
    let id = first.pending().unwrap().effect_id.clone();
    assert!(
        matches!(&first.pending().unwrap().request, Request::Ask{prompt} if prompt.trim() == "Reflect on first.")
    );
    let paused = runtime::transition(&first, Event::Pause).unwrap().state;
    let resumed = runtime::transition(&restore(&paused), Event::Resume)
        .unwrap()
        .state;
    assert_eq!(resumed.pending().unwrap().effect_id, id);
    let second = reply(&resumed, Fulfillment::Text("  one  ".into()));
    assert!(
        matches!(&second.pending().unwrap().request, Request::Ask{prompt} if prompt.trim() == "Reflect on second.")
    );
    assert_ne!(second.pending().unwrap().effect_id, id);
    let done = reply(&second, Fulfillment::Text("  two  ".into()));
    let Value::List { items, .. } = &done.outputs()["entries"] else {
        panic!()
    };
    assert_eq!(items.len(), 2);
    for (item, answer) in items.iter().zip(["one", "two"]) {
        let Value::Record(fields) = item else {
            panic!()
        };
        assert_eq!(fields.len(), 2);
        assert_eq!(fields["answer"], Value::Text(answer.into()));
        assert!(!fields.contains_key("temporary"));
    }
    restore(&done);
}

#[test]
fn each_yields_scalars_and_typed_empty_lists_without_running_body() {
    for input in ["[1, 2]", "[]:number"] {
        let state = start(&format!(":language 2\n:output result\nitems = {input}\nresult = each item in items {{\n -> yield item * 2\n}}\n-> end"));
        assert_eq!(
            state.outputs()["result"],
            numbers(if input.starts_with("[]") {
                &[]
            } else {
                &[2., 4.]
            })
        );
        restore(&state);
    }
}

#[test]
fn open_collections_require_explicit_outputs_in_v2() {
    let source = ":language 2\n:output entries\nentries = !collect {\n:max 2\ntext = !ask {\nEntry?\n}\ninternal = 42\n-> yield text |> trim\n}\n-> end";
    let state = reply(&start(source), Fulfillment::Text(" one ".into()));
    let done = reply(&state, Fulfillment::Selected("finish".into()));
    assert_eq!(
        done.outputs()["entries"],
        Value::List {
            element_type: Type::Text,
            items: vec![Value::Text("one".into())]
        }
    );
    restore(&done);
}

#[test]
fn canonical_effects_keep_existing_interaction_contracts() {
    let source = ":language 2\n:output score\nscore = !rate 0..10 {\nHow strong?\n}\nselected = !choose [multi, min=1, max=2] {\n- a: \"A\"\n- b: \"B\"\n}\nordered = !rank [from=selected] {\nArrange\n}\n-> end";
    let state = reply(&start(source), Fulfillment::Rating(4.));
    assert_eq!(
        state.pending().unwrap().request.kind(),
        "interaction.select"
    );
    restore(&state);
}

#[test]
fn helpers_cannot_capture_recurse_forward_call_or_perform_effects() {
    for helper in [
        "fn leak(n: number) -> number => ambient + n",
        "fn recurse(n: number) -> number => recurse(n)",
        "fn first(n: number) -> number => later(n)\nfn later(n: number) -> number => n",
        "fn ask(n: number) -> text => !ask { n }",
        "fn wrong(n: number) -> text => n",
        "fn trim(n: number) -> number => n",
        "fn duplicate(n: number, n: number) -> number => n",
    ] {
        invalid(&format!(
            ":language 2\n:input ambient number\n{helper}\n-> end"
        ));
    }
}

#[test]
fn types_and_scope_reject_ambiguous_or_effectful_expressions() {
    for expr in [
        "[]",
        "[1, true]",
        "{a: 1, a: 2}",
        "map([1], missing)",
        "[1] |> filter(twice)",
        "fold([1], false, add)",
        "[!ask {}]",
        "1 |> trim",
        "flatten([1])",
        "{a:1} + {a:2}",
    ] {
        invalid(&format!(":language 2\nfn twice(n: number) -> number => n * 2\nfn add(a: number, b: number) -> number => a + b\nresult = {expr}\n-> end"));
    }
    for body in [
        "value = 1",
        "-> yield item\nvalue = 1",
        "-> yield item\n-> yield item",
        "item = 2\n-> yield item",
    ] {
        invalid(&format!(
            ":language 2\nitems = [1]\nresult = each item in items {{\n{body}\n}}\n-> end"
        ));
    }
    invalid(":language 2\nitems = [1]\nresult = each item in items {\nlocal = item\n-> yield local\n}\nleak = local\n-> end");
    invalid(":language 2\n-> yield 1\n-> end");
}

#[test]
fn language_one_now_accepts_functional_additions_without_breaking_old_spelling() {
    for line in [
        "result = 1",
        "= result [1,2]",
        "= result {a: 1}",
        "= result \"a\" |> trim",
        "fn f(n: number) -> number => n",
    ] {
        start(&format!(":language 1\n{line}\n-> end"));
    }
    let legacy = start(":language 1\n:output n\n= n 2 + 3\n-> end");
    assert_eq!(legacy.outputs()["n"], Value::Number(5.));
    restore(&legacy);
    invalid(":language 1\n-> yield 1\n-> end");
}

#[test]
fn partial_unicode_sources_never_panic_or_return_invalid_spans() {
    let source = ":language 2\nfn clean(s: text) -> text => trim(s)\nitems = [\"é 🫶\"]\nanswers = each item in items {\ntext = !ask {\n{{item}}?\n}\n-> yield {answer: clean(text)}\n}\n-> end";
    for end in source.char_indices().map(|(i, _)| i).chain([source.len()]) {
        let partial = &source[..end];
        if let Err(errors) = compiler::compile(partial) {
            for e in errors {
                assert!(partial.get(e.primary.clone()).is_some(), "{end}: {e:?}");
            }
        }
    }
}

#[test]
fn normalized_headers_report_real_utf8_spans_even_in_compact_partial_source() {
    for header in [
        "x=!use 🫶",
        "x=!rate é",
        "x=!choose[from=é]",
        "x=!refine[rounds=1] \"🫶\" {",
        "x=!use missing{",
        "x=!rate 0..10{",
    ] {
        let source = format!(":language 2\n{header}\n}}\n-> end");
        for end in source.char_indices().map(|(i, _)| i).chain([source.len()]) {
            let partial = &source[..end];
            if let Err(errors) = compiler::compile(partial) {
                for e in errors {
                    assert!(
                        partial.get(e.primary.clone()).is_some(),
                        "{partial:?}: {e:?}"
                    );
                }
            }
        }
    }
}

#[test]
fn example_runs_and_inspector_exposes_each_and_its_explicit_yield() {
    let source =
        include_str!("../../../docs/pattern-markdown/examples/functional-reflection.pattern.md");
    let view = compiler::compile(source).unwrap().inspect().unwrap();
    let each = view.steps.iter().find(|s| s.kind == "each").unwrap();
    assert_eq!(each.children.last().unwrap().kind, "yield");
    assert!(each.children.last().unwrap().edges.is_empty());
    assert!(each.children.last().unwrap().text.contains("normalized"));
    let mut state = start(source);
    for (answer, rating) in [("  A busy   day ", 3.), (" A walk ", 4.)] {
        state = reply(&state, Fulfillment::Text(answer.into()));
        state = reply(&state, Fulfillment::Rating(rating));
    }
    assert_eq!(state.status(), &Status::Completed);
    assert_eq!(state.outputs()["total"], Value::Number(7.));
    restore(&state);
}

#[test]
fn structured_helper_contracts_empty_transforms_and_multiline_pipelines_work() {
    let source = r#":language 2
:output result
fn score(entry: {text: text, score: number}) -> number => entry.score
fn keep(n: number) -> boolean => n > 0
fn add(total: number, n: number) -> number => total + n
entries = []:{text: text, score: number}
result =
  entries
  |> map(score)
  |> filter(keep)
  |> fold(9, add)
-> end"#;
    assert_eq!(start(source).outputs()["result"], Value::Number(9.));
    let source=":language 2\nfn item(s: text) -> {text: text, scores: list<number>} => {text: trim(s), scores: [1]}\n:output result\nresult = item(\" yes \")\n-> end";
    restore(&start(source));
    invalid(":language 2\nfn score(entry: {text: text, score: number}) -> number => entry.score\nresult = score({text: \"hello\"})\n-> end");
}

#[test]
fn canonical_refinement_retains_explicit_participant_control() {
    let source=":language 2\n:output wording\nwording = !refine[rounds=1] \"Initial 🫶\" {\n:as current\nnext = !ask {\nChange {{current}}?\n}\n-> propose next |> trim\n}\n-> end";
    let state = start(source);
    assert_eq!(
        state.pending().unwrap().request.kind(),
        "interaction.refine"
    );
    restore(&state);
}

#[test]
fn v2_each_can_call_a_pinned_v1_child_across_restarts() {
    use pattern_core::{
        manager::{self, Command, ManagerLimits, RunManager},
        snapshot::{ExecutableSnapshot, SourceBundle},
    };
    let root=":language 2\n:output answers\nitems = [\"one\", \"two\"]\nanswers = each item in items {\nresult = !use child {\n:with topic = item\n}\n-> yield result.answer |> trim\n}\n-> end";
    let child =
        ":language 1\n:input topic text\n:output answer\n!ask answer {\n{{topic}}?\n}\n-> end";
    let snapshot = ExecutableSnapshot::build(SourceBundle {
        root: "root".into(),
        patterns: BTreeMap::from([("root".into(), root.into()), ("child".into(), child.into())]),
    })
    .unwrap();
    let mut state = manager::start(
        snapshot,
        "managed-v2".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap()
    .state;
    for answer in [" A ", " B "] {
        let restored: RunManager =
            serde_json::from_slice(&serde_json::to_vec(&state).unwrap()).unwrap();
        assert_eq!(state, restored);
        let effect = restored.pending().unwrap();
        let command = Command {
            run_id: effect.run_id.clone(),
            event: Event::Fulfill(Receipt {
                effect_id: effect.effect_id.clone(),
                result: Fulfillment::Text(answer.into()),
            }),
        };
        state = manager::transition(&restored, command).unwrap().state;
    }
    assert_eq!(
        state.root().outputs()["answers"],
        Value::List {
            element_type: Type::Text,
            items: vec![Value::Text("A".into()), Value::Text("B".into())]
        }
    );
}

#[test]
fn failed_pure_call_rolls_back_the_reply_and_cannot_consume_it_twice() {
    let state = start(":language 2\nanswer = !ask {\nNumber?\n}\nresult = clamp(3, 10, 0)\n-> end");
    let before = serde_json::to_vec(&state).unwrap();
    let receipt = Receipt {
        effect_id: state.pending().unwrap().effect_id.clone(),
        result: Fulfillment::Text("3".into()),
    };
    assert!(runtime::transition(&state, Event::Fulfill(receipt)).is_err());
    assert_eq!(serde_json::to_vec(&state).unwrap(), before);
    let state=start(":language 2\nresult = each item in [1,2] {\nanswer = !ask {\n{{item}}?\n}\n-> yield answer\n}\n-> end");
    let receipt = Receipt {
        effect_id: state.pending().unwrap().effect_id.clone(),
        result: Fulfillment::Text("first".into()),
    };
    let next = runtime::transition(&state, Event::Fulfill(receipt.clone()))
        .unwrap()
        .state;
    let duplicate = runtime::transition(&restore(&next), Event::Fulfill(receipt))
        .unwrap()
        .state;
    assert_eq!(next, duplicate);
    let cancelled = runtime::transition(&next, Event::Cancel).unwrap().state;
    assert!(cancelled.outputs().is_empty());
    restore(&cancelled);
}

#[test]
fn complexity_value_limits_and_legacy_large_values_are_explicit() {
    let nested = format!(
        ":language 2\nresult = []:{}number{}\n-> end",
        "list<".repeat(1000),
        ">".repeat(1000)
    );
    invalid(&nested);
    let mut functions = "fn f0(n: number) -> number => n + n\n".to_string();
    for i in 1..16 {
        functions.push_str(&format!(
            "fn f{i}(n: number) -> number => f{}(n) + f{}(n)\n",
            i - 1,
            i - 1
        ));
    }
    invalid(&format!(":language 2\n{functions}-> end"));
    let huge = Value::Text("x".repeat(1_048_577));
    let legacy =
        compiler::compile(":language 1\n:input value text\n:output result\n= result value\n-> end")
            .unwrap();
    assert!(runtime::start(
        legacy,
        "large-v1".into(),
        BTreeMap::from([("value".into(), huge.clone())])
    )
    .is_ok());
    let v2 =
        compiler::compile(":language 2\n:input value text\nresult = trim(value)\n-> end").unwrap();
    assert!(runtime::start(
        v2,
        "large-v2".into(),
        BTreeMap::from([("value".into(), huge)])
    )
    .is_err());
}

#[test]
fn helper_depth_is_bounded_before_it_can_make_a_checkpoint_unreadable() {
    let mut declarations =
        ":language 2\n:output result\nfn f0(n: number) -> number => n\n".to_string();
    for i in 1..23 {
        declarations.push_str(&format!("fn f{i}(n: number) -> number => f{}(n)\n", i - 1));
    }
    let state = start(&format!(
        "{declarations}result = f22(4)\nanswer = !ask {{\nContinue?\n}}\n-> end"
    ));
    restore(&state);
    for i in 23..28 {
        declarations.push_str(&format!("fn f{i}(n: number) -> number => f{}(n)\n", i - 1));
    }
    invalid(&format!("{declarations}result = f27(4)\n-> end"));
}
