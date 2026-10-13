//! Portable, pure boundary for executing bundled Patternverse therapy techniques.
//! Storage, encryption, inference, and presentation belong to platform adapters.

use pattern_core::{
    manager::{self, Command, ManagerLimits, RunManager},
    runtime::{Effect, Fulfillment, Status},
    snapshot::{ExecutableSnapshot, SourceBundle},
    value::Value,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

mod core_library;
pub mod editor;
mod legacy_library;
mod readiness_library;
mod reframing_library;
pub mod wire;

const MAX_SAVED_BYTES: usize = 8 * 1024 * 1024;
#[cfg(test)]
const READY: &str =
    include_str!("../../../packages/therapy-patterns/patterns/therapy.ready.pattern.md");

/// Public, nonclinical catalog metadata. Only these exact bundled sources may start here.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub struct Technique {
    pub id: &'static str,
    pub title: &'static str,
    pub modality: &'static str,
    pub needs_ai: bool,
}

const TECHNIQUES: &[Technique] = &[
    Technique {
        id: "dbt.pause",
        title: "Pause and observe",
        modality: "dbt",
        needs_ai: false,
    },
    Technique {
        id: "dbt.interpersonal",
        title: "Clarify a request or boundary",
        modality: "dbt",
        needs_ai: false,
    },
];

/// Return exactly the guided exercises available for a modality; unsupported modalities are empty.
pub fn techniques(modality: &str) -> Vec<Technique> {
    TECHNIQUES
        .iter()
        .chain(core_library::TECHNIQUES.iter())
        .chain(reframing_library::TECHNIQUES.iter())
        .copied()
        .filter(|entry| entry.modality == modality)
        .collect()
}

/// A saved run pins its exact source and accepted command journal through the Rust core.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SavedRun {
    technique_id: String,
    revision: u64,
    manager: RunManager,
}

/// One replay-safe transcript item; historical effects are for display, never redispatch.
#[derive(Clone, Debug, Serialize)]
pub struct Item {
    pub effect: Effect,
    pub result: Option<Fulfillment>,
}

/// Projection for a UI; only `pending` may be acted upon or dispatched now.
#[derive(Clone, Debug, Serialize)]
pub struct View {
    pub technique_id: String,
    pub root_id: String,
    pub revision: u64,
    pub status: Status,
    pub pending: Option<Effect>,
    pub items: Vec<Item>,
    pub outputs: BTreeMap<String, Value>,
}

/// Content-free boundary errors; adapters should not display raw saved source or inputs.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum HostError {
    UnknownTechnique,
    InvalidSource,
    InvalidInput,
    InvalidRun,
    InvalidCommand,
    StaleRevision,
    UnsupportedVersion,
    SavedRunTooLarge,
}

impl std::fmt::Display for HostError {
    /// Report a stable code without leaking participant content.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}",
            match self {
                Self::UnknownTechnique => "PATTERN_UNKNOWN_TECHNIQUE",
                Self::InvalidSource => "PATTERN_SOURCE_INVALID",
                Self::InvalidInput => "PATTERN_INPUT_INVALID",
                Self::InvalidRun => "PATTERN_DATA_INVALID",
                Self::InvalidCommand => "PATTERN_COMMAND_REJECTED",
                Self::StaleRevision => "PATTERN_CONFLICT",
                Self::UnsupportedVersion => "PATTERN_VERSION_UNSUPPORTED",
                Self::SavedRunTooLarge => "PATTERN_DATA_TOO_LARGE",
            }
        )
    }
}

impl std::error::Error for HostError {}

impl SavedRun {
    /// Start a bundled technique with explicit inputs and a caller-provided unpredictable ID.
    /// No model or filesystem work occurs in this function.
    pub fn start(
        id: &str,
        root_id: &str,
        inputs: BTreeMap<String, Value>,
    ) -> Result<Self, HostError> {
        if root_id.trim().is_empty() {
            return Err(HostError::InvalidInput);
        }
        let snapshot = catalog_snapshot(id)?;
        let turn = manager::start(snapshot, root_id.into(), inputs, ManagerLimits::default())
            .map_err(|_| HostError::InvalidInput)?;
        Ok(Self {
            technique_id: id.into(),
            revision: 0,
            manager: turn.state,
        })
    }

    /// Restore a bounded, replay-validated run. No historical effect is dispatched.
    pub fn restore(bytes: &[u8]) -> Result<Self, HostError> {
        if bytes.len() > MAX_SAVED_BYTES {
            return Err(HostError::SavedRunTooLarge);
        }
        let run: Self = serde_json::from_slice(bytes).map_err(|_| HostError::InvalidRun)?;
        let current = source(&run.technique_id);
        let legacy = legacy_library::source(&run.technique_id);
        if current.is_none() && legacy.is_none() {
            return Err(HostError::UnknownTechnique);
        }
        let pinned = run
            .manager
            .snapshot()
            .sources()
            .get(&run.technique_id)
            .map(String::as_str);
        // A catalog revision must not rewrite or strand a participant's existing run.
        // Retired sources are accepted only for exact, replay-validated checkpoints.
        let previous = pinned
            .is_some_and(|source| readiness_library::accepts(&run.technique_id, source));
        if pinned.is_none() || (pinned != current && pinned != legacy && !previous) {
            return Err(HostError::InvalidRun);
        }
        manager::replay(&run.manager).map_err(|_| HostError::InvalidRun)?;
        Ok(run)
    }

    /// Serialize a checkpoint for an adapter to encrypt and commit atomically.
    pub fn save(&self) -> Result<Vec<u8>, HostError> {
        let bytes = serde_json::to_vec(self).map_err(|_| HostError::InvalidRun)?;
        if bytes.len() > MAX_SAVED_BYTES {
            return Err(HostError::SavedRunTooLarge);
        }
        Ok(bytes)
    }

    /// Return the current display projection without reissuing accepted effects.
    pub fn view(&self) -> Result<View, HostError> {
        let replay = manager::replay(&self.manager).map_err(|_| HostError::InvalidRun)?;
        let receipts: BTreeMap<_, _> = self
            .manager
            .ledger()
            .map(|(run, receipt)| {
                (
                    (run.to_owned(), receipt.effect_id.clone()),
                    receipt.result.clone(),
                )
            })
            .collect();
        let mut seen = BTreeSet::new();
        let items = replay
            .recorded_effects
            .into_iter()
            .filter(|effect| seen.insert((effect.run_id.clone(), effect.effect_id.clone())))
            .map(|effect| {
                let result = receipts
                    .get(&(effect.run_id.clone(), effect.effect_id.clone()))
                    .cloned();
                Item { effect, result }
            })
            .collect();
        Ok(View {
            technique_id: self.technique_id.clone(),
            root_id: self.manager.root().run_id().into(),
            revision: self.revision,
            status: self.manager.root().status().clone(),
            pending: self.manager.pending().cloned(),
            items,
            outputs: self.manager.root().outputs().clone(),
        })
    }

    /// Apply one explicit command; invalid or stale commands leave this value unchanged.
    /// A caller must atomically persist the returned value before publishing its view.
    pub fn apply(&self, command: Command) -> Result<Self, HostError> {
        let turn =
            manager::transition(&self.manager, command).map_err(|_| HostError::InvalidCommand)?;
        let before = serde_json::to_vec(&self.manager).map_err(|_| HostError::InvalidRun)?;
        let after = serde_json::to_vec(&turn.state).map_err(|_| HostError::InvalidRun)?;
        Ok(Self {
            technique_id: self.technique_id.clone(),
            revision: if before == after {
                self.revision
            } else {
                self.revision
                    .checked_add(1)
                    .ok_or(HostError::InvalidCommand)?
            },
            manager: turn.state,
        })
    }

    /// Reopen a completed interaction, keeping the storage revision monotonic.
    pub fn rewind_at(
        &self,
        expected_revision: u64,
        run_id: &str,
        effect_id: &str,
    ) -> Result<Self, HostError> {
        if expected_revision != self.revision {
            return Err(HostError::StaleRevision);
        }
        Ok(Self {
            technique_id: self.technique_id.clone(),
            revision: self
                .revision
                .checked_add(1)
                .ok_or(HostError::InvalidCommand)?,
            manager: manager::rewind(&self.manager, run_id, effect_id)
                .map_err(|_| HostError::InvalidCommand)?,
        })
    }

    /// Reject a UI command based on a superseded projection. The storage adapter must
    /// still compare-and-swap this revision when publishing the returned checkpoint.
    pub fn apply_at(&self, expected_revision: u64, command: Command) -> Result<Self, HostError> {
        if expected_revision != self.revision {
            return Err(HostError::StaleRevision);
        }
        self.apply(command)
    }
}

/// Resolve the same audited source closure for execution and blank worksheet projection.
pub(crate) fn catalog_snapshot(id: &str) -> Result<ExecutableSnapshot, HostError> {
    let source = source(id).ok_or(HostError::UnknownTechnique)?;
    let mut patterns = BTreeMap::from([(id.into(), source.into())]);
    if id.starts_with("reframing.") { patterns.extend(reframing_library::sources()); }
    ExecutableSnapshot::build(SourceBundle { root: id.into(), patterns }).map_err(|_| HostError::InvalidSource)
}

/// Embed exact audited therapy sources; no name-based filesystem or network lookup occurs.
fn source(id: &str) -> Option<&'static str> {
    Some(match id {
        "dbt.pause" => {
            include_str!("../../../packages/therapy-patterns/patterns/dbt.pause.pattern.md")
        }
        "dbt.interpersonal" => {
            include_str!("../../../packages/therapy-patterns/patterns/dbt.interpersonal.pattern.md")
        }
        _ => return core_library::source(id).or_else(|| reframing_library::source(id)),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use pattern_core::runtime::{Event, Fulfillment, Receipt, Request};
    use pattern_core::scenario::{Scenario, Step};

    /// Each reframing root resolves its pinned child closure without syntax or type errors.
    #[test]
    fn reframing_sources_compile_as_independent_roots() {
        for pattern in reframing_library::TECHNIQUES {
            let mut inputs = BTreeMap::new();
            if pattern.id == "reframing.frame-problem" {
                inputs.insert(
                    "problem".into(),
                    Value::Text("A project feels stuck".into()),
                );
            } else if pattern.id != "reframing.rapid-reframe" {
                inputs.insert("frame".into(), Value::Text("A project feels stuck".into()));
                if pattern.id == "reframing.generate-real-options" {
                    inputs.insert(
                        "observations".into(),
                        Value::Text("The goal may be unclear".into()),
                    );
                }
            }
            SavedRun::start(pattern.id, "reframing-test", inputs).unwrap_or_else(|error| {
                let source_error = ExecutableSnapshot::build(SourceBundle {
                    root: pattern.id.into(),
                    patterns: reframing_library::sources().collect(),
                })
                .err();
                panic!("{}: {error:?}; source: {source_error:?}", pattern.id);
            });
        }
    }

    /// Deterministic model fixtures exercise the authored route, child calls and return-to-action.
    #[test]
    fn reframing_scenarios_route_to_distinct_operators() {
        use pattern_core::value::{Choice, Type};

        struct Case {
            pattern: &'static str,
            frame: &'static str,
            route: &'static str,
            specialist_phrase: &'static str,
        }
        let cases = [
            Case {
                pattern: "reframing.review-frame",
                frame: "We need to build a mobile app for this.",
                route: "solution",
                specialist_phrase: "proposed intervention",
            },
            Case {
                pattern: "reframing.identify-problem-form",
                frame: "We need to build a mobile app for this.",
                route: "solution",
                specialist_phrase: "proposed intervention",
            },
            Case {
                pattern: "reframing.identify-problem-form",
                frame: "I feel stuck in my career.",
                route: "pain",
                specialist_phrase: "Restate the concern",
            },
            Case {
                pattern: "reframing.break-tradeoff",
                frame: "Either it is simple or advanced users can customize it.",
                route: "",
                specialist_phrase: "benefits behind each side",
            },
            Case {
                pattern: "reframing.look-outside-frame",
                frame: "Our onboarding problem needs better analytics.",
                route: "hammer",
                specialist_phrase: "favored tool",
            },
            Case {
                pattern: "reframing.rethink-goal",
                frame: "I need a promotion.",
                route: "",
                specialist_phrase: "higher-level goal",
            },
            Case {
                pattern: "reframing.review-frame",
                frame: "My colleague is lazy and does not care.",
                route: "emotion",
                specialist_phrase: "emotionally loaded judgment",
            },
            Case {
                pattern: "reframing.look-outside-frame",
                frame: "Candidates seem to dislike our interview process.",
                route: "influence",
                specialist_phrase: "omitted systemic",
            },
            Case {
                pattern: "reframing.look-outside-frame",
                frame: "My daughter suddenly exploded at her teacher today.",
                route: "time",
                specialist_phrase: "before and after",
            },
            Case {
                pattern: "reframing.validate-frame",
                frame:
                    "Perhaps customers do not see the value rather than finding pricing confusing.",
                route: "",
                specialist_phrase: "small, reversible real-world learning step",
            },
        ];
        for case in cases {
            let mut run = SavedRun::start(
                case.pattern,
                "scenario",
                BTreeMap::from([("frame".into(), Value::Text(case.frame.into()))]),
            )
            .unwrap();
            let mut prompts = Vec::new();
            for _ in 0..16 {
                run = SavedRun::restore(&run.save().unwrap()).unwrap();
                let view = run.view().unwrap();
                if view.status == Status::Completed {
                    break;
                }
                let pending = view
                    .pending
                    .expect("unfinished run must have a pending effect");
                let result = match pending.request {
                    Request::Classify { definition, .. } => {
                        assert!(definition.output.variants.contains(&case.route.to_owned()));
                        Fulfillment::Classified(case.route.into())
                    }
                    Request::Generate { prompt, contract } => {
                        prompts.push(prompt);
                        match contract.returns {
                            Type::Text => Fulfillment::Generated(Value::Text(
                                "Maybe another framing is worth testing.".into(),
                            )),
                            Type::Choices => Fulfillment::Generated(Value::Choices(vec![
                                Choice {
                                    value: "first".into(),
                                    label: "One provisional frame".into(),
                                },
                                Choice {
                                    value: "second".into(),
                                    label: "A different provisional frame".into(),
                                },
                                Choice {
                                    value: "third".into(),
                                    label: "A third provisional frame".into(),
                                },
                            ])),
                            other => panic!("Unexpected model contract: {other:?}"),
                        }
                    }
                    Request::Ask { .. } => {
                        Fulfillment::Text("I would check this with one small observation.".into())
                    }
                    Request::Choose { options, .. } => {
                        let selected = if options.iter().any(|item| item.value == "paths") {
                            "paths"
                        } else {
                            &options.first().expect("at least one option").value
                        };
                        Fulfillment::Selected(selected.into())
                    }
                    other => panic!("Unexpected request in {}: {other:?}", case.pattern),
                };
                run = run
                    .apply(Command {
                        run_id: pending.run_id,
                        event: Event::Fulfill(Receipt {
                            effect_id: pending.effect_id,
                            result,
                        }),
                    })
                    .unwrap();
            }
            assert_eq!(
                run.view().unwrap().status,
                Status::Completed,
                "{}",
                case.pattern
            );
            assert!(
                prompts
                    .iter()
                    .any(|prompt| prompt.contains(case.specialist_phrase)),
                "{} did not invoke the expected operator; prompts: {prompts:?}",
                case.pattern
            );
        }
    }

    /// The entry pattern asks for a frame, selects a narrow route, then returns to a test.
    #[test]
    fn rapid_reframe_completes_a_selective_cycle() {
        use pattern_core::value::{Choice, Type};

        let mut run =
            SavedRun::start("reframing.rapid-reframe", "rapid-cycle", BTreeMap::new()).unwrap();
        let mut classifier_names = Vec::new();
        let mut model_prompts = Vec::new();
        let mut ask_count = 0;
        for _ in 0..24 {
            run = SavedRun::restore(&run.save().unwrap()).unwrap();
            let view = run.view().unwrap();
            if view.status == Status::Completed {
                break;
            }
            let pending = view.pending.expect("unfinished cycle has a pending effect");
            let result = match pending.request {
                Request::Ask { .. } => {
                    ask_count += 1;
                    Fulfillment::Text(
                        match ask_count {
                            1 => "I work constantly but keep falling behind.",
                            2 => "I'm working constantly but still falling behind.",
                            _ => "I will compare incoming work with completed work this week.",
                        }
                        .into(),
                    )
                }
                Request::Classify { definition, .. } => {
                    classifier_names.push(definition.name.clone());
                    let variant = match definition.name.as_str() {
                        "frame_signal" => "constraint",
                        "strategy" => "outside",
                        "outside_lens" => "influence",
                        other => panic!("Unexpected classifier {other}"),
                    };
                    Fulfillment::Classified(variant.into())
                }
                Request::Generate { prompt, contract } => {
                    model_prompts.push(prompt);
                    match contract.returns {
                        Type::Text => Fulfillment::Generated(Value::Text(
                            "Maybe the incoming work exceeds the team's capacity.".into(),
                        )),
                        Type::Choices => Fulfillment::Generated(Value::Choices(vec![
                            Choice {
                                value: "arrival".into(),
                                label: "Work arrives faster than it can be completed".into(),
                            },
                            Choice {
                                value: "goal".into(),
                                label: "Caught up may be an unreachable target".into(),
                            },
                            Choice {
                                value: "handoff".into(),
                                label: "An external handoff controls throughput".into(),
                            },
                        ])),
                        other => panic!("Unexpected contract: {other:?}"),
                    }
                }
                Request::Choose { options, .. } => {
                    assert!(options.iter().any(|option| option.value == "arrival"));
                    Fulfillment::Selected("arrival".into())
                }
                other => panic!("Unexpected rapid request: {other:?}"),
            };
            run = run
                .apply(Command {
                    run_id: pending.run_id,
                    event: Event::Fulfill(Receipt {
                        effect_id: pending.effect_id,
                        result,
                    }),
                })
                .unwrap();
        }
        assert_eq!(run.view().unwrap().status, Status::Completed);
        assert_eq!(
            classifier_names,
            ["frame_signal", "strategy", "outside_lens"]
        );
        assert!(model_prompts
            .iter()
            .any(|prompt| prompt.contains("restriction implied by the wording")));
        assert!(model_prompts
            .iter()
            .any(|prompt| prompt.contains("omitted systemic")));
        assert!(model_prompts
            .iter()
            .any(|prompt| prompt.contains("differ in causal theory")));
        assert!(model_prompts
            .iter()
            .any(|prompt| prompt.contains("real-world learning step")));
        assert_eq!(ask_count, 3);
    }

    /// New CBT runs start at their first exercise step and restore at each wait.
    #[test]
    fn core_library_sources_start_directly_complete_and_restore() {
        for technique in core_library::TECHNIQUES {
            let mut run = SavedRun::start(technique.id, "library-test", BTreeMap::new())
                .unwrap_or_else(|e| panic!("{}: {e:?}", technique.id));
            if technique.id == "cbt.worry-time" {
                let Request::Timer { timer, .. } = run.view().unwrap().pending.unwrap().request
                else {
                    panic!("Worry time must start at its timer");
                };
                assert_eq!(timer.duration_seconds, 600);
                assert!(timer.adjustable);
                assert!(!timer.blocking);
            } else {
                assert!(matches!(
                    run.view().unwrap().pending.unwrap().request,
                    Request::Ask { .. }
                ));
            }
            for _ in 0..10 {
                run = SavedRun::restore(&run.save().unwrap()).unwrap();
                let Some(pending) = run.view().unwrap().pending else {
                    break;
                };
                let result = match pending.request {
                    Request::Timer { .. } => {
                        Fulfillment::Timer(pattern_core::runtime::TimerResult {
                            duration_seconds: 300,
                            elapsed_seconds: 0,
                            completed: false,
                        })
                    }
                    Request::Ask { .. } => {
                        Fulfillment::Text("A synthetic everyday reflection.".into())
                    }
                    Request::Select {
                        mode: pattern_core::compiler::SelectionMode::Multi,
                        options,
                        ..
                    } => Fulfillment::SelectedMany(
                        options
                            .iter()
                            .take(2)
                            .map(|option| option.value.clone())
                            .collect(),
                    ),
                    Request::Select {
                        mode: pattern_core::compiler::SelectionMode::Rank,
                        options,
                        ..
                    } => Fulfillment::Ranked(
                        options
                            .iter()
                            .rev()
                            .map(|option| option.value.clone())
                            .collect(),
                    ),
                    _ => panic!("Unexpected request in {}", technique.id),
                };
                run = run
                    .apply(Command {
                        run_id: pending.run_id,
                        event: Event::Fulfill(Receipt {
                            effect_id: pending.effect_id,
                            result,
                        }),
                    })
                    .unwrap();
            }
            assert_eq!(
                run.view().unwrap().status,
                Status::Completed,
                "{}",
                technique.id
            );
        }
    }

    /// Removing a readiness screen never changes or strands an existing checkpoint.
    #[test]
    fn readiness_revision_checkpoints_restore_before_and_after_beginning() {
        for technique in core_library::TECHNIQUES.iter().chain(TECHNIQUES) {
            let previous = readiness_library::source(technique.id).unwrap();
            let mut run = legacy_run(
                technique.id,
                previous,
                "existing-readiness-run",
                BTreeMap::new(),
            );
            for _ in 0..2 {
                let restored = SavedRun::restore(&run.save().unwrap()).unwrap();
                assert_eq!(restored.save().unwrap(), run.save().unwrap());
                assert_eq!(
                    restored.manager.snapshot().sources()[technique.id],
                    previous
                );
                let pending = restored.view().unwrap().pending.unwrap();
                let result = match pending.request {
                    Request::Ask { .. } => Fulfillment::Text("A manageable situation.".into()),
                    Request::Choose { options, .. } => {
                        Fulfillment::Selected(options[0].value.clone())
                    }
                    other => panic!("Unexpected previous interaction: {other:?}"),
                };
                run = restored
                    .apply(Command {
                        run_id: pending.run_id,
                        event: Event::Fulfill(Receipt {
                            effect_id: pending.effect_id,
                            result,
                        }),
                    })
                    .unwrap();
            }
        }
    }

    /// Existing untimed worry sessions keep their exact source and progress.
    #[test]
    fn untimed_worry_session_restores_without_inserting_a_timer() {
        let source = include_str!(
            "../../../packages/therapy-patterns/legacy/worry-time/cbt.worry-time-2.1.0.pattern.md"
        );
        let mut run = legacy_run("cbt.worry-time", source, "untimed-worry", BTreeMap::new());
        for _ in 0..5 {
            run = SavedRun::restore(&run.save().unwrap()).unwrap();
            let pending = run.view().unwrap().pending.unwrap();
            assert!(matches!(pending.request, Request::Ask { .. }));
            run = run
                .apply(Command {
                    run_id: pending.run_id,
                    event: Event::Fulfill(Receipt {
                        effect_id: pending.effect_id,
                        result: Fulfillment::Text("An existing note.".into()),
                    }),
                })
                .unwrap();
        }
        assert_eq!(
            SavedRun::restore(&run.save().unwrap())
                .unwrap()
                .view()
                .unwrap()
                .status,
            Status::Completed
        );
    }

    /// Participants can cancel at the first question without supplying an answer.
    #[test]
    fn direct_start_runs_can_stop_without_disclosure() {
        for technique in core_library::TECHNIQUES.iter().chain(TECHNIQUES) {
            let run = SavedRun::start(technique.id, "direct-stop", BTreeMap::new()).unwrap();
            let cancelled = run
                .apply(Command {
                    run_id: "direct-stop".into(),
                    event: Event::Cancel,
                })
                .unwrap();
            let restored = SavedRun::restore(&cancelled.save().unwrap()).unwrap();
            assert_eq!(restored.view().unwrap().status, Status::Cancelled);
            assert!(restored.view().unwrap().outputs.is_empty());
        }
    }

    /// The host exposes only exercises for the chosen modality.
    #[test]
    fn catalog_filters_by_modality() {
        assert_eq!(techniques("cbt").len(), 10);
        assert!(techniques("act").is_empty());
        assert_eq!(techniques("dbt").len(), 2);
        assert!(techniques("narm").is_empty());
        assert!(techniques("coherence").is_empty());
        assert!(techniques("fop").is_empty());
    }

    /// Save/restore keeps one exact pending interaction and never emits a historical one.
    #[test]
    fn start_reply_and_restore_keep_exact_progress() {
        let run = SavedRun::start("cbt.thought-record", "root-1", BTreeMap::new()).unwrap();
        let first = run.view().unwrap();
        let pending = first.pending.unwrap();
        assert!(matches!(pending.request, Request::Ask { .. }));
        let next = run
            .apply(Command {
                run_id: pending.run_id.clone(),
                event: Event::Fulfill(Receipt {
                    effect_id: pending.effect_id.clone(),
                    result: Fulfillment::Text("A recent conversation.".into()),
                }),
            })
            .unwrap();
        assert_eq!(
            run.view().unwrap().pending.unwrap().effect_id,
            pending.effect_id
        );
        let before = next.view().unwrap();
        let after = SavedRun::restore(&next.save().unwrap())
            .unwrap()
            .view()
            .unwrap();
        assert_eq!(after.root_id, "root-1");
        assert_eq!(after.revision, 1);
        assert_eq!(
            after.pending.as_ref().map(|e| &e.effect_id),
            before.pending.as_ref().map(|e| &e.effect_id)
        );
        assert_eq!(after.items.len(), before.items.len());
        assert!(after
            .items
            .iter()
            .any(|item| item.effect.effect_id == pending.effect_id
                && item.result == Some(Fulfillment::Text("A recent conversation.".into()))));
    }

    /// Invalid participant replies do not mutate the existing run.
    #[test]
    fn invalid_reply_and_corrupt_restore_fail_closed() {
        let run = SavedRun::start("dbt.pause", "root-2", BTreeMap::new()).unwrap();
        let pending = run.view().unwrap().pending.unwrap();
        assert_eq!(
            run.apply(Command {
                run_id: pending.run_id,
                event: Event::Fulfill(Receipt {
                    effect_id: pending.effect_id.clone(),
                    result: Fulfillment::Selected("not-an-option".into()),
                }),
            })
            .unwrap_err(),
            HostError::InvalidCommand
        );
        assert_eq!(
            run.view().unwrap().pending.unwrap().effect_id,
            pending.effect_id
        );
        let mut bytes = run.save().unwrap();
        bytes[0] = b'!';
        assert_eq!(
            SavedRun::restore(&bytes).unwrap_err(),
            HostError::InvalidRun
        );
        let mut mismatched: serde_json::Value =
            serde_json::from_slice(&run.save().unwrap()).unwrap();
        mismatched["technique_id"] = serde_json::json!("act.values");
        assert_eq!(
            SavedRun::restore(&serde_json::to_vec(&mismatched).unwrap()).unwrap_err(),
            HostError::InvalidRun
        );
        assert_eq!(
            SavedRun::restore(&vec![b' '; MAX_SAVED_BYTES + 1]).unwrap_err(),
            HostError::SavedRunTooLarge
        );
    }

    /// Unknown IDs and undeclared inputs cannot start a run.
    #[test]
    fn starts_only_bundled_sources_with_declared_inputs() {
        assert_eq!(
            SavedRun::start("unknown", "root", BTreeMap::new()).unwrap_err(),
            HostError::UnknownTechnique
        );
        assert_eq!(
            SavedRun::start("cbt.thought-record", "", BTreeMap::new()).unwrap_err(),
            HostError::InvalidInput
        );
        assert_eq!(
            SavedRun::start(
                "cbt.thought-record",
                "root",
                BTreeMap::from([("history".into(), Value::Text("private".into()))])
            )
            .unwrap_err(),
            HostError::InvalidInput
        );
    }

    /// The real host reaches every documented exercise outcome across a checkpoint
    /// restoration at each participant boundary, not just through the core's harness.
    #[test]
    fn existing_non_ai_exercises_finish_from_their_original_checkpoints() {
        for id in [
            "cbt.moment",
            "cbt.activation",
            "act.defusion",
            "act.values",
            "dbt.pause",
            "dbt.interpersonal",
        ] {
            let path = format!(
                "{}/../../packages/therapy-patterns/{}scenarios/{id}.json",
                env!("CARGO_MANIFEST_DIR"),
                if legacy_library::source(id).is_some() {
                    "legacy/"
                } else {
                    ""
                },
            );
            let fixture: Scenario = serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
            let mut run = if let Some(old_source) = legacy_library::source(id) {
                legacy_run(id, old_source, &format!("root-{id}"), fixture.inputs)
            } else {
                SavedRun::start(id, &format!("root-{id}"), fixture.inputs).unwrap()
            };
            for step in fixture.steps {
                let Step::Reply {
                    expected_kind,
                    result,
                } = step
                else {
                    panic!("{id} fixture must contain only explicit participant replies");
                };
                run = SavedRun::restore(&run.save().unwrap()).unwrap();
                let pending = run.view().unwrap().pending.unwrap();
                assert_eq!(pending.request.kind(), expected_kind, "{id}");
                run = run
                    .apply(Command {
                        run_id: pending.run_id,
                        event: Event::Fulfill(Receipt {
                            effect_id: pending.effect_id,
                            result,
                        }),
                    })
                    .unwrap();
            }
            let final_view = SavedRun::restore(&run.save().unwrap())
                .unwrap()
                .view()
                .unwrap();
            assert_eq!(final_view.status, Status::Completed, "{id}");
            assert!(final_view.pending.is_none(), "{id}");
            assert!(final_view.outputs.contains_key("outcome"), "{id}");
        }
    }

    /// Simulate a real pre-catalog-revision checkpoint, never a production new-run path.
    fn legacy_run(
        id: &str,
        old_source: &str,
        root_id: &str,
        inputs: BTreeMap<String, Value>,
    ) -> SavedRun {
        let snapshot = ExecutableSnapshot::build(SourceBundle {
            root: id.into(),
            patterns: BTreeMap::from([
                (id.into(), old_source.into()),
                ("therapy.ready".into(), READY.into()),
            ]),
        })
        .unwrap();
        let turn =
            manager::start(snapshot, root_id.into(), inputs, ManagerLimits::default()).unwrap();
        SavedRun {
            technique_id: id.into(),
            revision: 0,
            manager: turn.state,
        }
    }

    #[test]
    fn retired_sources_cannot_start_but_exact_old_checkpoints_still_restore() {
        for id in [
            "act.values",
            "act.defusion",
            "act.present",
            "cbt.moment",
            "cbt.abc",
            "cbt.worry-chain",
        ] {
            assert_eq!(
                SavedRun::start(id, "new-run", BTreeMap::new()).unwrap_err(),
                HostError::UnknownTechnique
            );
            let old_source = legacy_library::source(id).unwrap();
            let run = legacy_run(id, old_source, "existing-run", BTreeMap::new());
            let restored = SavedRun::restore(&run.save().unwrap()).unwrap();
            assert_eq!(restored.view().unwrap().root_id, "existing-run");
            assert_eq!(restored.view().unwrap().revision, 0);
        }
        let old_source = legacy_library::source("cbt.thought-record").unwrap();
        let old = legacy_run(
            "cbt.thought-record",
            old_source,
            "old-record",
            BTreeMap::new(),
        );
        assert!(SavedRun::restore(&old.save().unwrap()).is_ok());
        assert_ne!(source("cbt.thought-record"), Some(old_source));
    }
}
