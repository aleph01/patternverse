//! Exercise current authored openings through the real compiler and runtime.
use pattern_core::{
    compiler,
    runtime::{self, Event, Fulfillment, Receipt, Request, RunState},
};
use std::collections::BTreeMap;

fn start(markdown: &str) -> RunState {
    let source = markdown
        .split("```patternverse-language\n")
        .nth(1)
        .unwrap()
        .split("```")
        .next()
        .unwrap();
    runtime::start(
        compiler::compile(source).unwrap(),
        "opening".into(),
        BTreeMap::new(),
    )
    .unwrap()
    .state
}

fn answer(state: &RunState, result: Fulfillment) -> RunState {
    runtime::transition(
        state,
        Event::Fulfill(Receipt {
            effect_id: state.pending().unwrap().effect_id.clone(),
            result,
        }),
    )
    .unwrap()
    .state
}

#[test]
fn the_work_keeps_both_substantive_openings_and_rejects_the_removed_exit() {
    let state = start(include_str!("../../../content/patterns/the-work.md"));
    let Request::Choose { options, .. } = &state.pending().unwrap().request else {
        panic!("Expected the two opening routes");
    };
    assert_eq!(
        options
            .iter()
            .map(|option| option.value.as_str())
            .collect::<Vec<_>>(),
        ["single", "worksheet"]
    );
    assert!(runtime::transition(
        &state,
        Event::Fulfill(Receipt {
            effect_id: state.pending().unwrap().effect_id.clone(),
            result: Fulfillment::Selected("leave".into()),
        })
    )
    .is_err());
    for opening in ["single", "worksheet"] {
        let next = answer(&state, Fulfillment::Selected(opening.into()));
        assert!(matches!(next.pending().unwrap().request, Request::Form(_)));
    }
}

#[test]
fn shades_of_grey_starts_with_the_actual_judgment_form() {
    let state = start(include_str!(
        "../../../content/practices/find-the-shades-of-grey.md"
    ));
    let Request::Form(form) = &state.pending().unwrap().request else {
        panic!("Expected a direct start at the judgment form");
    };
    assert_eq!(form.title.as_deref(), Some("Name one judgment"));
}

#[test]
fn meta_model_keeps_all_four_exploration_routes_after_the_opening_questions() {
    let state = start(include_str!("../../../content/patterns/meta-model.md"));
    let state = answer(&state, Fulfillment::Text("They never listen.".into()));
    let state = answer(&state, Fulfillment::Text("My idea was passed over.".into()));
    let Request::Choose { options, .. } = &state.pending().unwrap().request else {
        panic!("Expected a choice of exploration routes");
    };
    assert_eq!(
        options
            .iter()
            .map(|option| option.value.as_str())
            .collect::<Vec<_>>(),
        ["deletion", "generalization", "distortion", "unsure"]
    );
}
