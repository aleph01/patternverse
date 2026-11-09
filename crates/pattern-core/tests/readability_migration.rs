//! Compare migrated definitions against frozen sources using the real composed runtime.
use pattern_core::{
    compiler::{FormBlock, SelectionMode},
    manager::{self, Command, ManagerLimits},
    runtime::{Event, Fulfillment, Receipt, Request, Status, TimerResult},
    semantic::{Suggestion, SuggestionMode, SuggestionOutcome},
    snapshot::{ExecutableSnapshot, SourceBundle},
    value::{Choice, Type, Value},
};
use std::{collections::BTreeMap, path::Path};

fn canonical(statements: &[pattern_core::syntax::Statement], source: &str) {
    use pattern_core::syntax::Statement;
    for statement in statements {
        match statement {
            Statement::Label(_) => panic!("Migrate authored labels to local arms"),
            Statement::Derive { span, .. } => assert!(!source[span.clone()].starts_with("= ")),
            Statement::Block(block) => {
                if block.binding.is_some() && block.kind != "?loop" {
                    assert!(
                        !source[block.span.clone()].starts_with('!'),
                        "{}",
                        &source[block.span.clone()]
                    );
                }
                if matches!(block.kind.as_str(), "?match" | "?branch") {
                    assert!(!block.statements.is_empty(), "Use local decision arms");
                    assert!(block.attributes.is_empty());
                }
                canonical(&block.statements, source);
            }
            _ => {}
        }
    }
}

fn value(ty: &Type, seed: usize) -> Value {
    match ty {
        Type::Text => Value::Text("A manageable example.".into()),
        Type::Number => Value::Number((seed % 11) as f64),
        Type::Boolean => Value::Boolean(seed % 2 == 0),
        Type::Choice => Value::Choice(Choice {
            value: "first".into(),
            label: "First possibility".into(),
        }),
        Type::Choices => Value::Choices(choices(3)),
        Type::List(element) => Value::List {
            element_type: *element.clone(),
            items: vec![value(element, seed), value(element, seed + 1)],
        },
        Type::Optional(element) => Value::Optional {
            element_type: *element.clone(),
            value: (seed % 2 == 0).then(|| Box::new(value(element, seed))),
        },
        Type::Record(fields) => Value::Record(
            fields
                .iter()
                .map(|(name, ty)| (name.clone(), value(ty, seed)))
                .collect(),
        ),
        Type::Enum(schema) => schema.value(schema.variants[seed % schema.variants.len()].clone()),
        Type::Reference(schema) => Value::Reference {
            schema: schema.clone(),
            id: schema.ids[seed % schema.ids.len()].clone(),
        },
        Type::Catalog(_) => panic!("Catalogue fixtures must supply their validated records"),
    }
}

fn choices(count: usize) -> Vec<Choice> {
    (0..count)
        .map(|n| Choice {
            value: format!("option_{n}"),
            label: format!("Possibility {n}"),
        })
        .collect()
}

fn reply(request: &Request, seed: usize, index: usize) -> Fulfillment {
    match request {
        Request::Ask { .. } => Fulfillment::Text("A manageable example.".into()),
        Request::Form(form) => Fulfillment::Form(
            form.blocks
                .iter()
                .filter_map(|block| match block {
                    FormBlock::Ask { id, required, .. } => Some((
                        id.clone(),
                        Value::Text(if !required && seed % 2 == 0 {
                            String::new()
                        } else {
                            "A manageable example.".into()
                        }),
                    )),
                    FormBlock::Timer { id, timer, .. } => Some((
                        id.clone(),
                        Value::Record(BTreeMap::from([
                            (
                                "duration_seconds".into(),
                                Value::Number(timer.duration_seconds.into()),
                            ),
                            (
                                "elapsed_seconds".into(),
                                Value::Number(timer.duration_seconds.into()),
                            ),
                            ("completed".into(), Value::Boolean(true)),
                        ])),
                    )),
                    _ => None,
                })
                .collect(),
        ),
        Request::Rate { rating, .. } => {
            Fulfillment::Rating(rating.min + (rating.max - rating.min) * (seed % 11) as f64 / 10.)
        }
        Request::Choose { options, .. } => {
            Fulfillment::Selected(options[(seed + index) % options.len()].value.clone())
        }
        Request::Select {
            mode,
            options,
            min,
            max,
            ..
        } => match mode {
            SelectionMode::Single => {
                Fulfillment::Selected(options[(seed + index) % options.len()].value.clone())
            }
            SelectionMode::Multi => Fulfillment::SelectedMany(
                options
                    .iter()
                    .take(min + seed % (max - min + 1))
                    .map(|c| c.value.clone())
                    .collect(),
            ),
            SelectionMode::Rank => {
                Fulfillment::Ranked(options.iter().rev().map(|c| c.value.clone()).collect())
            }
        },
        Request::Generate { contract, .. } => {
            Fulfillment::Generated(if contract.returns == Type::Choices {
                Value::Choices(choices(contract.min.unwrap_or(3).max(1)))
            } else {
                value(&contract.returns, seed)
            })
        }
        Request::Turn { .. } => Fulfillment::Turn("A short reflection.".into()),
        Request::Realize { .. } => Fulfillment::Realized("What do you notice?".into()),
        Request::Classify { definition, .. } => Fulfillment::Classified(
            definition.output.variants[(seed + index) % definition.output.variants.len()].clone(),
        ),
        Request::Suggest {
            mode, candidates, ..
        } => {
            let uncertain =
                seed % 2 == 0 || (candidates.is_empty() && *mode == SuggestionMode::Select);
            Fulfillment::Suggested(Suggestion {
                outcome: if uncertain {
                    SuggestionOutcome::Uncertain
                } else {
                    SuggestionOutcome::Decided
                },
                ids: if uncertain {
                    vec![]
                } else {
                    candidates
                        .iter()
                        .take(if *mode == SuggestionMode::Select {
                            1
                        } else {
                            candidates.len()
                        })
                        .map(|c| c.id.clone())
                        .collect()
                },
            })
        }
        Request::Refine { .. } => Fulfillment::Reviewed(pattern_core::refine::Decision::Accept),
        Request::Timer { timer, .. } => Fulfillment::Timer(TimerResult {
            duration_seconds: timer.duration_seconds,
            elapsed_seconds: timer.duration_seconds,
            completed: true,
        }),
        other => panic!("Unexpected pending content: {other:?}"),
    }
}

fn normalized(request: &Request) -> serde_json::Value {
    let mut json = serde_json::to_value(request).unwrap();
    if let Some(object) = json
        .pointer_mut("/payload/collection_continuation")
        .and_then(|v| v.as_object_mut())
    {
        object.remove("collection_node_id");
    }
    if let Some(object) = json
        .pointer_mut("/payload/review")
        .and_then(|v| v.as_object_mut())
    {
        object.remove("effect_id");
    }
    json
}

#[test]
fn migrated_catalogues_and_examples_preserve_effects_and_results() {
    let baseline: BTreeMap<String, String> =
        serde_json::from_str(include_str!("fixtures/readability-baseline.json")).unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let mut old_sources = BTreeMap::new();
    let mut new_sources = BTreeMap::new();
    for (path, source) in &baseline {
        let name = Path::new(path)
            .file_name()
            .unwrap()
            .to_str()
            .unwrap()
            .trim_end_matches(".pattern.md")
            .to_owned();
        old_sources.insert(name.clone(), source.clone());
        // Later editorial changes are checked by the host suite. Keep this
        // syntax-migration comparison paired with its exact migrated source.
        let migrated_path = match path.as_str() {
            "packages/therapy-patterns/patterns/dbt.pause.pattern.md" =>
                "packages/therapy-patterns/legacy/opening-choices/patterns/dbt.pause.pattern.md",
            "packages/therapy-patterns/patterns/dbt.interpersonal.pattern.md" =>
                "packages/therapy-patterns/legacy/opening-choices/patterns/dbt.interpersonal.pattern.md",
            _ => path.as_str(),
        };
        new_sources.insert(
            name,
            std::fs::read_to_string(root.join(migrated_path)).unwrap(),
        );
    }
    old_sources.insert("project.step".into(), old_sources["project-step"].clone());
    new_sources.insert("project.step".into(), new_sources["project-step"].clone());
    for source in new_sources.values() {
        let parsed = pattern_core::syntax::parse(source).unwrap();
        canonical(&parsed.statements, source);
        for flow in parsed.flows {
            canonical(&flow.statements, source);
        }
    }
    let mut public_definitions = 0;
    for directory in ["content/patterns", "content/practices"] {
        for file in std::fs::read_dir(root.join(directory)).unwrap() {
            let path = file.unwrap().path();
            if path.extension().is_none_or(|extension| extension != "md") {
                continue;
            }
            let markdown = std::fs::read_to_string(path).unwrap();
            for fence in markdown.split("```").skip(1).step_by(2) {
                let Some((kind, source)) = fence.split_once('\n') else {
                    continue;
                };
                if !matches!(kind, "patternverse-language" | "pattern" | "text")
                    || !source.trim_start().starts_with(":language ")
                {
                    continue;
                }
                let mut sources = new_sources.clone();
                sources.insert("public.practice".into(), source.into());
                ExecutableSnapshot::build_with_data(
                    SourceBundle {
                        root: "public.practice".into(),
                        patterns: sources,
                    },
                    BTreeMap::from([
                        (
                            "commons:limiting-beliefs".into(),
                            serde_json::from_str(include_str!(
                                "../../../content/assets/libraries/limiting-beliefs.json"
                            ))
                            .unwrap(),
                        ),
                        (
                            "commons:self-acceptability".into(),
                            serde_json::from_str(include_str!(
                                "../../../content/assets/libraries/self-acceptability.json"
                            ))
                            .unwrap(),
                        ),
                    ]),
                )
                .unwrap();
                canonical(
                    &pattern_core::syntax::parse(source).unwrap().statements,
                    source,
                );
                public_definitions += 1;
            }
        }
    }
    assert!(
        public_definitions >= 60,
        "Only checked {public_definitions} public definitions"
    );
    for name in baseline.keys().map(|p| {
        Path::new(p)
            .file_name()
            .unwrap()
            .to_str()
            .unwrap()
            .trim_end_matches(".pattern.md")
    }) {
        let old = ExecutableSnapshot::build(SourceBundle {
            root: name.into(),
            patterns: old_sources.clone(),
        })
        .unwrap();
        let new = ExecutableSnapshot::build(SourceBundle {
            root: name.into(),
            patterns: new_sources.clone(),
        })
        .unwrap();
        assert_eq!(old.root().input_types(), new.root().input_types());
        assert_eq!(
            old.root().inspect().unwrap().outputs,
            new.root().inspect().unwrap().outputs
        );
        for seed in 0..12 {
            let inputs = old
                .root()
                .input_types()
                .iter()
                .map(|(name, ty)| (name.clone(), value(ty, seed)))
                .collect::<BTreeMap<_, _>>();
            let mut before = manager::start(
                old.clone(),
                "migration".into(),
                inputs.clone(),
                ManagerLimits::default(),
            )
            .unwrap();
            let mut after = manager::start(
                new.clone(),
                "migration".into(),
                inputs,
                ManagerLimits::default(),
            )
            .unwrap();
            for index in 0..200 {
                assert_eq!(
                    before
                        .effects
                        .iter()
                        .map(|e| normalized(&e.request))
                        .collect::<Vec<_>>(),
                    after
                        .effects
                        .iter()
                        .map(|e| normalized(&e.request))
                        .collect::<Vec<_>>(),
                    "{name}, seed {seed}, step {index}"
                );
                assert_eq!(before.state.root().status(), after.state.root().status());
                if before.state.root().status() == &Status::Completed {
                    break;
                }
                assert!(index < 199, "Unbounded migration fixture: {name}");
                let first = before.state.pending().unwrap();
                let second = after.state.pending().unwrap();
                let result = reply(&first.request, seed, index);
                let command = |effect: &pattern_core::runtime::Effect| Command {
                    run_id: effect.run_id.clone(),
                    event: Event::Fulfill(Receipt {
                        effect_id: effect.effect_id.clone(),
                        result: result.clone(),
                    }),
                };
                let next_before = manager::transition(&before.state, command(first));
                let next_after = manager::transition(&after.state, command(second));
                assert!(next_before.is_ok(), "{name}: {next_before:?}");
                before = next_before.unwrap();
                after = next_after.unwrap();
            }
            assert_eq!(
                before.state.root().outputs(),
                after.state.root().outputs(),
                "{name}, seed {seed}"
            );
        }
    }
}
