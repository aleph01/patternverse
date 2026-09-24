use pattern_core::{
    compiler::{self, SelectionMode},
    runtime::{self, Error, Event, Fulfillment, Receipt, Request, RunState, Status},
    value::{Choice, Type, Value},
};
use std::collections::BTreeMap;

const OPTIONS: &str = "\nWhich fits?\n- a: \"Alpha\"\n- b: \"Bêta\"\n- c: \"Gamma\"\n";

fn source(header: &str) -> String {
    format!(":language 1\n:output answer\n{header} {{{OPTIONS}}}\n-> end")
}
fn start(source: &str) -> RunState {
    runtime::start(
        compiler::compile(source).unwrap_or_else(|errors| panic!("{errors:?}")),
        "selection".into(),
        BTreeMap::new(),
    )
    .unwrap()
    .state
}
fn receipt(state: &RunState, result: Fulfillment) -> Receipt {
    Receipt {
        effect_id: state.pending().unwrap().effect_id.clone(),
        result,
    }
}
fn answer(state: &RunState, result: Fulfillment) -> RunState {
    runtime::transition(state, Event::Fulfill(receipt(state, result)))
        .unwrap()
        .state
}
fn restore(state: &RunState) -> RunState {
    let restored = serde_json::from_str(&serde_json::to_string(state).unwrap()).unwrap();
    assert_eq!(state, &restored);
    restored
}
fn keys(values: &[&str]) -> Vec<String> {
    values.iter().map(|value| (*value).into()).collect()
}
fn chosen(key: &str, label: &str) -> Value {
    Value::Choice(Choice {
        value: key.into(),
        label: label.into(),
    })
}
fn list(items: Vec<Value>) -> Value {
    Value::List {
        element_type: Type::Choice,
        items,
    }
}

#[test]
fn bullet_single_choice_preserves_the_legacy_scalar_contract() {
    let state = start(&source("!choose answer"));
    assert!(
        matches!(&state.pending().unwrap().request, Request::Choose { prompt, options, .. } if prompt == "Which fits?" && options.len() == 3)
    );
    let done = answer(&restore(&state), Fulfillment::Selected("b".into()));
    assert_eq!(done.outputs()["answer"], chosen("b", "Bêta"));
    assert_eq!(restore(&done).status(), &Status::Completed);
}

#[test]
fn multi_selection_is_a_canonical_subset_and_duplicate_receipts_are_idempotent() {
    let state = start(&source(
        "!choose answer [multi, min=0, max=2, prefer=checklist]",
    ));
    let original = restore(&state);
    for bad in [
        Fulfillment::Selected("a".into()),
        Fulfillment::SelectedMany(keys(&["a", "a"])),
        Fulfillment::SelectedMany(keys(&["a", "b", "c"])),
        Fulfillment::SelectedMany(keys(&["bogus"])),
    ] {
        assert!(runtime::transition(&state, Event::Fulfill(receipt(&state, bad))).is_err());
        assert_eq!(state, original);
    }
    let mut reply = receipt(&state, Fulfillment::SelectedMany(keys(&["c", "a"])));
    let done = runtime::transition(&state, Event::Fulfill(reply.clone()))
        .unwrap()
        .state;
    assert_eq!(
        done.outputs()["answer"],
        list(vec![chosen("a", "Alpha"), chosen("c", "Gamma")])
    );
    reply.result = Fulfillment::SelectedMany(keys(&["a", "c"]));
    assert_eq!(
        runtime::transition(&restore(&done), Event::Fulfill(reply.clone()))
            .unwrap()
            .state,
        done
    );
    reply.result = Fulfillment::SelectedMany(keys(&["b"]));
    assert_eq!(
        runtime::transition(&done, Event::Fulfill(reply)).unwrap_err(),
        Error::ConflictingDuplicate
    );
}

#[test]
fn optional_counts_default_to_one_through_all_and_empty_requires_explicit_min_zero() {
    let state = start(&source("!choose answer[multi]"));
    assert!(matches!(
        state.pending().unwrap().request,
        Request::Select { min: 1, max: 3, .. }
    ));
    assert!(runtime::transition(
        &state,
        Event::Fulfill(receipt(&state, Fulfillment::SelectedMany(vec![])))
    )
    .is_err());
    let state = start(&source("!choose answer [multi, min=0]"));
    assert_eq!(
        answer(&state, Fulfillment::SelectedMany(vec![])).outputs()["answer"],
        list(vec![])
    );
}

#[test]
fn rank_requires_an_exact_permutation_and_preserves_chosen_order() {
    let state = start(&source("!rank answer"));
    assert!(matches!(
        state.pending().unwrap().request,
        Request::Select {
            mode: SelectionMode::Rank,
            min: 3,
            max: 3,
            ..
        }
    ));
    for bad in [
        Fulfillment::Ranked(keys(&["b", "a"])),
        Fulfillment::Ranked(keys(&["a", "a", "b"])),
        Fulfillment::Ranked(keys(&["a", "b", "alien"])),
        Fulfillment::SelectedMany(keys(&["a", "b", "c"])),
    ] {
        assert!(runtime::transition(&state, Event::Fulfill(receipt(&state, bad))).is_err());
    }
    let done = answer(
        &restore(&state),
        Fulfillment::Ranked(keys(&["c", "b", "a"])),
    );
    assert_eq!(
        done.outputs()["answer"],
        list(vec![
            chosen("c", "Gamma"),
            chosen("b", "Bêta"),
            chosen("a", "Alpha")
        ])
    );
    assert_eq!(restore(&done).status(), &Status::Completed);
}

#[test]
fn earlier_selections_can_be_ranked_or_selected_again_including_empty_lists() {
    let source = format!(":language 1\n:output ordered\n!choose picked [multi, min=0] {{{OPTIONS}}}\n!rank ordered [from=picked] {{\nArrange these\n}}\n-> end");
    let state = start(&source);
    let rank = answer(&state, Fulfillment::SelectedMany(keys(&["c", "a"])));
    let done = answer(&restore(&rank), Fulfillment::Ranked(keys(&["c", "a"])));
    assert_eq!(
        done.outputs()["ordered"],
        list(vec![chosen("c", "Gamma"), chosen("a", "Alpha")])
    );
    let empty = answer(&state, Fulfillment::SelectedMany(vec![]));
    assert!(
        matches!(&empty.pending().unwrap().request, Request::Select { options, min: 0, max: 0, .. } if options.is_empty())
    );
    assert_eq!(
        answer(&empty, Fulfillment::Ranked(vec![])).outputs()["ordered"],
        list(vec![])
    );
    let single = source.replace(
        "!rank ordered [from=picked]",
        "!choose ordered [from=picked, prefer=radio]",
    );
    let state = answer(&start(&single), Fulfillment::SelectedMany(keys(&["b"])));
    assert_eq!(
        answer(&state, Fulfillment::Selected("b".into())).outputs()["ordered"],
        chosen("b", "Bêta")
    );
    let colon = single.replace(
        "!choose ordered [from=picked, prefer=radio] {",
        "!choose ordered {\n:from picked",
    );
    let state = answer(&start(&colon), Fulfillment::SelectedMany(keys(&["b"])));
    assert_eq!(
        answer(&state, Fulfillment::Selected("b".into())).outputs()["ordered"],
        chosen("b", "Bêta")
    );
}

#[test]
fn collected_records_keep_all_fields_when_ranked_even_with_identical_labels() {
    let source = ":language 1\n:output ordered\n!collect entries {\n:max 2\n!ask task {\nTask?\n}\n!rate importance 0..10 {\nImportance?\n}\n}\n!rank ordered [from=entries, label=task] {\nPut in your preferred order\n}\n-> end";
    let mut state = start(source);
    for reply in [
        Fulfillment::Text("Same label".into()),
        Fulfillment::Rating(3.0),
        Fulfillment::Selected("add".into()),
        Fulfillment::Text("Same label".into()),
        Fulfillment::Rating(8.0),
    ] {
        state = answer(&state, reply);
    }
    assert!(
        matches!(&state.pending().unwrap().request, Request::Select { options, .. } if options[0].value == "row_0" && options[1].value == "row_1")
    );
    let done = answer(
        &restore(&state),
        Fulfillment::Ranked(keys(&["row_1", "row_0"])),
    );
    let Value::List { items, .. } = &done.outputs()["ordered"] else {
        panic!()
    };
    assert!(
        matches!(&items[0], Value::Record(fields) if fields["importance"] == Value::Number(8.0))
    );
    assert!(
        matches!(&items[1], Value::Record(fields) if fields["importance"] == Value::Number(3.0))
    );
    restore(&done);
}

#[test]
fn invalid_headers_catalogues_and_hints_fail_with_valid_source_spans() {
    for header in [
        "!choose answer [multi, multi]",
        "!choose answer [multi=true]",
        "!choose answer [multi, min=3, max=2]",
        "!choose answer [multi, min=-1]",
        "!choose answer [multi, max=1001]",
        "!choose answer [multi, max=4]",
        "!choose answer [multi, min=]",
        "!choose answer [unknown]",
        "!choose answer [prefer=checklist]",
        "!choose answer [min=0]",
        "!rank answer [multi]",
        "!rank answer [min=1]",
        "!rank answer [prefer=radio]",
        "!rank answer [label=missing]",
        "!choose answer [from=missing]",
        "!choose answer [multi",
        "!choose answer [multi, prefer=chips, prefer=chips]",
    ] {
        let source = source(header);
        let errors = compiler::compile(&source).expect_err(header);
        for error in errors {
            assert!(source.get(error.primary).is_some(), "{header}");
        }
    }
    for bad in [
        OPTIONS.replace("- b:", "- a:"),
        OPTIONS.replace("\"Alpha\"", "Alpha"),
        OPTIONS.replace("\"Alpha\"", "\"\""),
    ] {
        assert!(compiler::compile(&source("!rank answer").replace(OPTIONS, &bad)).is_err());
    }
}

#[test]
fn pause_retry_cancel_and_restoration_keep_the_same_selection_boundary() {
    let state = start(&source("!choose answer [multi]"));
    let reply = receipt(&state, Fulfillment::SelectedMany(keys(&["b"])));
    let paused = runtime::transition(&state, Event::Pause).unwrap().state;
    assert_eq!(
        runtime::transition(&paused, Event::Fulfill(reply.clone())).unwrap_err(),
        Error::Paused
    );
    let resumed = runtime::transition(&restore(&paused), Event::Resume)
        .unwrap()
        .state;
    assert_eq!(resumed.pending(), state.pending());
    let retry = runtime::transition(
        &resumed,
        Event::Retry {
            effect_id: reply.effect_id.clone(),
        },
    )
    .unwrap();
    assert_eq!(retry.effects[0], *state.pending().unwrap());
    let cancelled = runtime::transition(&resumed, Event::Cancel).unwrap().state;
    assert_eq!(
        runtime::transition(&restore(&cancelled), Event::Fulfill(reply)).unwrap_err(),
        Error::Terminal
    );
}

#[test]
fn legacy_colon_syntax_and_new_colon_flags_remain_supported() {
    let source = ":language 1\n:output answer\n!choose answer {\n:option a \"Alpha\"\n:option b \"Bêta\"\nQuestion?\n}\n-> end";
    let state = start(source);
    let json = serde_json::to_value(&state).unwrap();
    assert!(json["pattern"]["nodes"][0]["instruction"]
        .get("Choose")
        .is_some());
    assert_eq!(
        answer(&restore(&state), Fulfillment::Selected("a".into())).outputs()["answer"],
        chosen("a", "Alpha")
    );
    let multi = source.replace(":option a", ":multi\n:min 0\n:option a");
    assert_eq!(
        answer(&start(&multi), Fulfillment::SelectedMany(vec![])).outputs()["answer"],
        list(vec![])
    );
}

#[test]
fn new_interactions_have_readable_inspection_and_no_option_text_in_the_prompt() {
    let pattern = compiler::compile(&source("!rank answer")).unwrap();
    let inspection = pattern.inspect().unwrap();
    assert_eq!(inspection.steps[0].kind, "rank");
    assert_eq!(inspection.steps[0].text, "Which fits?");
}

#[test]
fn legacy_markdown_bullets_are_not_reinterpreted_as_options() {
    let source = ":language 1\n!choose answer {\n:option a \"Alpha\"\nExamples:\n- literal: \"Ordinary Markdown\"\n}\n-> end";
    let state = start(source);
    assert!(
        matches!(&state.pending().unwrap().request, Request::Choose { prompt, options, .. } if options.len() == 1 && prompt.contains("- literal:"))
    );
    restore(&state);
    let state = start(&self::source("!choose answer []"));
    assert!(matches!(
        state.pending().unwrap().request,
        Request::Select {
            mode: SelectionMode::Single,
            ..
        }
    ));
}

#[test]
fn dynamic_catalogues_reject_duplicate_ids_and_oversized_offers() {
    let source = ":language 1\n:input options list<choice>\n!rank answer [from=options] {\nOrder?\n}\n-> end";
    let pattern = compiler::compile(source).unwrap();
    for items in [
        vec![chosen("a", "One"), chosen("a", "Another label")],
        (0..1001)
            .map(|index| chosen(&format!("item_{index}"), "Item"))
            .collect(),
    ] {
        let inputs = BTreeMap::from([("options".into(), list(items))]);
        assert!(runtime::start(pattern.clone(), "invalid".into(), inputs).is_err());
    }
}

#[test]
fn selection_then_ranking_round_trips_through_durable_checkpoint_encoding() {
    use pattern_core::{
        manager::{Command, ManagerLimits},
        persistence::{self, MemoryStore},
        snapshot::{ExecutableSnapshot, SourceBundle},
    };
    let source = include_str!("../../../docs/pattern-markdown/examples/values-ranking.pattern.md");
    let snapshot = ExecutableSnapshot::build(SourceBundle {
        root: "example".into(),
        patterns: BTreeMap::from([("example".into(), source.into())]),
    })
    .unwrap();
    let mut store = MemoryStore::default();
    let mut checkpoint = persistence::create(
        &mut store,
        snapshot,
        "checkpoint-selection".into(),
        BTreeMap::new(),
        ManagerLimits::default(),
    )
    .unwrap();
    for result in [
        Fulfillment::SelectedMany(keys(&["care", "learning"])),
        Fulfillment::Ranked(keys(&["care", "learning"])),
    ] {
        let pending = checkpoint.state().pending().unwrap();
        let command = Command {
            run_id: pending.run_id.clone(),
            event: Event::Fulfill(Receipt {
                effect_id: pending.effect_id.clone(),
                result,
            }),
        };
        checkpoint = persistence::apply(&mut store, &checkpoint, command).unwrap();
        let recovered = persistence::load(&mut store, "checkpoint-selection")
            .unwrap()
            .unwrap();
        assert_eq!(checkpoint, recovered);
        checkpoint = recovered;
    }
    assert_eq!(checkpoint.state().root().status(), &Status::Completed);
    assert_eq!(
        checkpoint.state().root().outputs()["ordered_values"],
        list(vec![chosen("care", "Care"), chosen("learning", "Learning")])
    );
}

#[test]
fn runnable_examples_complete_without_a_model_or_inferred_answers() {
    use pattern_core::host::{self, Fixture, Reply};
    let cases = [
        (
            include_str!(
                "../../../docs/pattern-markdown/examples/thought-diary-multi-select.pattern.md"
            ),
            vec![
                Fulfillment::Selected("begin".into()),
                Fulfillment::Text("A short meeting".into()),
                Fulfillment::Text("They disliked my idea".into()),
                Fulfillment::Text("I went quiet".into()),
                Fulfillment::SelectedMany(vec![]),
            ],
        ),
        (
            include_str!("../../../docs/pattern-markdown/examples/values-ranking.pattern.md"),
            vec![
                Fulfillment::SelectedMany(keys(&["care", "learning"])),
                Fulfillment::Ranked(keys(&["care", "learning"])),
            ],
        ),
        (
            include_str!(
                "../../../docs/pattern-markdown/examples/collected-steps-ranking.pattern.md"
            ),
            vec![
                Fulfillment::Text("Write a sentence".into()),
                Fulfillment::Rating(2.0),
                Fulfillment::Selected("finish".into()),
                Fulfillment::Ranked(keys(&["row_0"])),
            ],
        ),
    ];
    for (source, replies) in cases {
        let replies = replies
            .into_iter()
            .map(|result| Reply {
                expected_kind: match &result {
                    Fulfillment::Selected(_) => "interaction.choose",
                    Fulfillment::Text(_) => "interaction.ask",
                    Fulfillment::Rating(_) => "interaction.rate",
                    _ => "interaction.select",
                }
                .into(),
                result,
            })
            .collect();
        let simulation = host::simulate(
            compiler::compile(source).unwrap(),
            "example".into(),
            Fixture {
                inputs: BTreeMap::new(),
                replies,
            },
        )
        .unwrap();
        assert_eq!(restore(&simulation.state).status(), &Status::Completed);
    }
}
