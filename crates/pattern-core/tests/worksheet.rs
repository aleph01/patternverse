use pattern_core::snapshot::{ExecutableSnapshot, SourceBundle};
use std::collections::BTreeMap;

fn snapshot(source: &str) -> ExecutableSnapshot {
    ExecutableSnapshot::build(SourceBundle {
        root: "test".into(),
        patterns: BTreeMap::from([("test".into(), source.into())]),
    })
    .unwrap()
}
fn export(source: &str) -> pattern_core::compiler::worksheet::Worksheet {
    snapshot(source).worksheet().unwrap()
}

#[test]
fn forms_preserve_fields_without_inventing_inputs_or_running_a_session() {
    let result = export(":language 1\n:title \"Blank reflection\"\nstep = !form {\n:title \"Consider\"\n!show {\nInstructions.\n}\n!ask answer {\n:required false\n:placeholder \"One example\"\nWhat happened?\n}\n}\n-> end");
    assert_eq!(result.fidelity, "complete");
    assert!(result.markdown.contains("## 1. Consider"));
    assert!(result.markdown.contains("Your answer — optional"));
    assert!(!result.markdown.contains("step.answer"));
    assert!(result.markdown.contains("Hint: One example"));
    assert_eq!(result.markdown.matches("[Write here.]").count(), 1);
    assert_eq!(
        result.markdown.matches("Finish this workbook here").count(),
        1
    );
}

#[test]
fn choices_ratings_and_unanswered_references_preserve_contracts() {
    let result = export(":language 1\nthought = !ask {\nYour thought?\n}\nselected = !choose [multi, min=0, max=2] {\nChoose styles.\n- first: \"First\"\n- second: \"Second\"\n}\nbelief = !rate 0..100 {\n:low \"Not at all\"\n:high \"Completely\"\nHow believable?\n}\n!show {\nReview {{thought}}.\n}\n-> end");
    assert_eq!(result.fidelity, "complete");
    assert!(result.markdown.contains("Choosing none is allowed"));
    assert!(result.markdown.contains("- [ ] Second"));
    assert!(!result.markdown.contains("option:"));
    assert!(result.markdown.contains("0 to 100"));
    assert!(result.markdown.contains("100: Completely"));
    assert!(result.markdown.contains("[Your earlier answer: “thought”]"));
}

#[test]
fn timer_and_collection_are_adapted_not_silently_executed_or_expanded() {
    let result = export(":language 1\nentries = !collect {\n:min 0\n:max 3\n!ask item {\nOne item?\n}\n}\npause = !timer {\n:duration 60\n:adjustable true\n:min 10\n:max 120\n:blocking true\nPause.\n}\n-> end");
    assert_eq!(result.fidelity, "adapted");
    assert!(result.markdown.contains("between 0 and 3"));
    assert_eq!(result.markdown.matches("One item?").count(), 1);
    assert!(result.markdown.contains("10 to 120 seconds"));
    assert!(result.markdown.contains("Wait until it finishes"));
    assert!(result
        .markdown
        .contains("Workbook with manual instructions"));
}

#[test]
fn alternatives_have_readable_headings_and_share_their_follow_up_once() {
    let result = export(":language 1\n!rate energy 0..10 {\nEnergy?\n}\n?branch {\n:when energy >= 5 -> high\n:else -> low\n}\nhigh:\n!show {\nHigh.\n}\n-> review\nlow:\n!show {\nLow.\n}\nreview:\n!show {\nReview.\n}\n-> end");
    assert_eq!(result.fidelity, "adapted");
    assert!(result.markdown.contains("#### If “energy” is at least 5"));
    assert!(result.markdown.contains("#### Otherwise"));
    assert!(result.markdown.contains("High."));
    assert!(result.markdown.contains("Low."));
    assert_eq!(result.markdown.matches("Review.").count(), 1);
    assert!(!result.markdown.contains("Route "));
    assert!(result.markdown.contains("Finish this workbook here"));
}

#[test]
fn constants_use_the_existing_evaluator_but_answer_dependent_math_is_flagged() {
    let result = export(":language 1\n= fixed 2 + 3\n!show {\nFixed: {{fixed}}\n}\n!rate score 0..10 {\nScore?\n}\n= doubled score * 2\n!show {\n{{doubled}}\n}\n-> end");
    assert!(result.markdown.contains("Fixed: 5"));
    assert_eq!(result.fidelity, "partial");
    assert!(result.markdown.contains("“score” multiplied by 2"));
    assert!(result.markdown.contains("[Your earlier answer: “doubled”]"));
}

#[test]
fn manual_calculations_preserve_expression_grouping_and_decimal_thresholds() {
    let result = export(":language 1\n!rate score 0..10 {\nScore?\n}\n= total (score + 2) * 3\n?branch {\n:when score >= 3.5 -> higher\n:else -> lower\n}\nhigher:\n!show {\nAt or above threshold.\n}\n-> end\nlower:\n!show {\nBelow threshold.\n}\n-> end");
    assert!(result.markdown.contains("(“score” plus 2) multiplied by 3"));
    assert!(result.markdown.contains("If “score” is at least 3.5"));
    assert!(!result.markdown.contains("3–4"));
}

#[test]
fn choice_identity_comparisons_use_visible_labels_on_either_side() {
    for condition in [
        "direction.value == \"begin\"",
        "\"begin\" == direction.value",
    ] {
        let result = export(&format!(":language 1\n!choose direction {{\n- begin: \"Start gently\"\n- stop: \"Not now\"\n}}\n?branch {{\n:when {condition} -> begin\n:else -> end\n}}\nbegin:\n!show {{\nBegin reflection.\n}}\n-> end"));
        assert!(result.markdown.contains("Start gently"));
        assert!(!result.markdown.contains("“begin”"));
        assert!(!result.markdown.contains("direction value"));
    }
    let result = export(":language 1\n!choose direction {\n- begin: \"Start gently\"\n- stop: \"Not now\"\n}\n?match direction.value {\n:case \"begin\" -> begin\n:else -> end\n}\nbegin:\n!show {\nBegin reflection.\n}\n-> end");
    assert!(result
        .markdown
        .contains("#### If “direction” is “Start gently”"));
    assert!(!result.markdown.contains("is “begin”"));
}

#[test]
fn ai_wording_is_ineligible_instead_of_a_partial_workbook() {
    let errors = snapshot(":language 1\n!ask answer {\n~ Ask what matters today.\n}\n-> end")
        .worksheet()
        .unwrap_err();
    assert!(errors[0].message.contains("AI-dependent"));
}

#[test]
fn pinned_children_use_readable_section_names_and_return_instructions() {
    let result = ExecutableSnapshot::build(SourceBundle {
        root: "parent".into(),
        patterns: BTreeMap::from([
            (
                "parent".into(),
                ":language 1\n!use child as entry {\n}\n!show {\n{{entry.answer}}\n}\n-> end"
                    .into(),
            ),
            (
                "child".into(),
                ":language 1\n:output answer\n!ask answer {\nChild question?\n}\n-> end".into(),
            ),
        ]),
    })
    .unwrap()
    .worksheet()
    .unwrap();
    assert!(result.markdown.contains("Child question?"));
    assert!(result
        .markdown
        .contains("This section is complete. Continue below."));
    assert!(result
        .markdown
        .contains("[Your earlier answer: “child — answer”]"));
    assert!(!result.markdown.contains("entry.answer"));
}

#[test]
fn recommendations_survive_branch_joins_in_a_readable_decision_table() {
    let result = export(include_str!(
        "../../../docs/pattern-markdown/examples/check-in.pattern.md"
    ));
    assert!(result.markdown.contains("| When | next step |"));
    assert!(result.markdown.contains("If “energy” is at least 8"));
    assert!(result
        .markdown
        .contains("Otherwise, if “energy” is at least 4"));
    for text in [
        "Try a focused work period.",
        "Choose one small action.",
        "Make room to rest.",
    ] {
        assert_eq!(result.markdown.matches(text).count(), 1);
    }
    assert!(!result.markdown.contains("Route "));
    assert!(result.markdown.contains("“energy” multiplied by 2"));
}

#[test]
fn decision_tables_never_drop_answer_dependent_calculations() {
    let result = export(":language 1\n!rate score 0..10 {\nScore?\n}\n?branch {\n:when score >= 5 -> higher\n:else -> lower\n}\nhigher:\n= recommendation \"Focus.\"\n= doubled score * 2\n-> review\nlower:\n= recommendation \"Rest.\"\n= doubled score * 2\nreview:\n!show {\n{{recommendation}} and {{doubled}}.\n}\n-> end");
    assert_eq!(result.fidelity, "partial");
    assert!(!result.markdown.contains("| When |"));
    assert_eq!(
        result.markdown.matches("“score” multiplied by 2").count(),
        2
    );
    assert!(result.markdown.contains("Focus."));
    assert!(result.markdown.contains("Rest."));
}

#[test]
fn nested_choices_keep_terminal_skips_different_from_empty_checklists() {
    let single = export(include_str!(
        "../../../docs/pattern-markdown/examples/thought-diary-single-select.pattern.md"
    ));
    assert!(single.markdown.contains("Look at possible thinking styles"));
    assert!(single.markdown.contains("We can leave the labels aside."));
    assert_eq!(
        single.markdown.matches("Your tentative selection:").count(),
        1
    );
    assert_eq!(
        single.markdown.matches("Finish this workbook here").count(),
        3
    );
    let multi = export(include_str!(
        "../../../docs/pattern-markdown/examples/thought-diary-multi-select.pattern.md"
    ));
    assert!(multi
        .markdown
        .contains("the number of entries in “thinking styles” is 0"));
    assert_eq!(
        multi.markdown.matches("Your tentative selections:").count(),
        1
    );
    assert_eq!(
        multi.markdown.matches("Finish this workbook here").count(),
        2
    );
    assert!(!single.markdown.contains("Route "));
    assert!(!multi.markdown.contains("Route "));
}

#[test]
fn independent_conditions_and_compound_logic_are_not_turned_into_one_choice() {
    let result = export(":language 1\n:input urgent boolean\n:input ready boolean\n?branch {\n:when urgent -> note\n:else -> next\n}\nnote:\n!show {\nUrgent note.\n}\nnext:\n?branch {\n:when urgent and not ready -> pause\n:else -> review\n}\npause:\n!show {\nPause note.\n}\nreview:\n!show {\nCommon review.\n}\n-> end");
    assert!(result.markdown.contains("AND (not (“ready”))"));
    assert_eq!(result.markdown.matches("Urgent note.").count(), 1);
    assert_eq!(result.markdown.matches("Pause note.").count(), 1);
    assert_eq!(result.markdown.matches("Common review.").count(), 1);
}

#[test]
fn ai_in_unselected_branches_and_nested_repeatable_blocks_is_rejected() {
    for source in [
        ":language 1\n?branch {\n:when false -> ai\n:else -> end\n}\nai:\n!agent result {\n:returns text\nSuggest something.\n}\n-> end",
        ":language 1\n!collect entries {\n:max 1\n!agent result {\n:returns text\nSuggest something.\n}\n}\n-> end",
        ":language 1\n?loop[0] current = \"Start\" {\n!ask next {\n~ Ask about {{current}}.\n}\n-> repeat next\n}\n-> end",
        include_str!("../../../docs/pattern-markdown/examples/semantic-review.pattern.md"),
    ] {
        assert!(snapshot(source).worksheet().unwrap_err()[0].message.contains("AI-dependent"));
    }
}

#[test]
fn ai_in_a_pinned_child_blocks_the_whole_workbook() {
    let bundle = SourceBundle { root: "parent".into(), patterns: BTreeMap::from([
        ("parent".into(), ":language 1\n!use child as result {\n}\n-> end".into()),
        ("child".into(), ":language 1\n!agent suggestion {\n:returns text\nSuggest a next action.\n}\n-> end".into()),
    ]) };
    let errors = ExecutableSnapshot::build(bundle)
        .unwrap()
        .worksheet()
        .unwrap_err();
    assert!(errors[0].message.contains("AI-dependent"));
}

#[test]
fn ambiguous_labels_and_crossing_alternatives_fail_closed() {
    let source = ":language 1\n!choose direction {\n- a: \"Next\"\n- b: \"Next\"\n}\n-> end";
    assert!(snapshot(source).worksheet().unwrap_err()[0]
        .message
        .contains("ambiguous"));
    let crossing = ":language 1\n:input left boolean\n:input merge boolean\n?branch {\n:when left -> first\n:else -> second\n}\nfirst:\n?branch {\n:when merge -> second\n:else -> review\n}\nsecond:\n!show {\nSecond path.\n}\nreview:\n!show {\nReview.\n}\n-> end";
    assert!(snapshot(crossing).worksheet().unwrap_err()[0]
        .message
        .contains("crossing"));
    // A subset of alternatives sharing a non-join body would duplicate it. Do not
    // combine nonadjacent predicates and change the runtime's first-match priority.
    let shared = ":language 1\n:input first boolean\n:input second boolean\n?branch {\n:when first -> shared\n:when second -> shared\n:else -> end\n}\nshared:\n!show {\nShared body.\n}\n-> end";
    assert!(snapshot(shared).worksheet().unwrap_err()[0]
        .message
        .contains("crossing"));
}

#[test]
fn zero_and_one_round_limits_and_latest_answer_are_preserved_without_ai() {
    for max in [0, 1, 3] {
        let result = export(&format!(":language 1\n!ask initial {{\nStarting thought?\n}}\n?loop[{max}] current = initial {{\n!ask next {{\nWhat follows from {{{{current}}}}?\n}}\n-> repeat next\n}}\n!show {{\nClosing.\n}}\n-> end"));
        assert!(result.markdown.contains(&format!("at most {max} rounds")));
        assert_eq!(result.markdown.contains("What follows"), max != 0);
        if max > 0 {
            assert!(result.markdown.contains("your latest answer"));
        }
        assert_eq!(result.markdown.matches("Closing.").count(), 1);
    }
}

#[test]
fn unneeded_supplied_ai_patterns_do_not_block_an_independent_root() {
    let snapshot = ExecutableSnapshot::build(SourceBundle {
        root: "root".into(),
        patterns: BTreeMap::from([
            (
                "root".into(),
                ":language 1\n!ask answer {\nQuestion?\n}\n-> end".into(),
            ),
            (
                "unused".into(),
                ":language 1\n!agent answer {\n:returns text\nAI.\n}\n-> end".into(),
            ),
        ]),
    })
    .unwrap();
    assert_eq!(snapshot.worksheet().unwrap().fidelity, "complete");
}
