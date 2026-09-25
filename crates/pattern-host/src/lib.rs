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

pub mod wire;

const MAX_SAVED_BYTES: usize = 8 * 1024 * 1024;
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
        id: "cbt.moment",
        title: "Map one moment",
        modality: "cbt",
        needs_ai: false,
    },
    Technique {
        id: "cbt.activation",
        title: "One manageable action",
        modality: "cbt",
        needs_ai: false,
    },
    Technique {
        id: "cbt.worry-chain",
        title: "Follow a worry chain",
        modality: "cbt",
        needs_ai: true,
    },
    Technique {
        id: "act.defusion",
        title: "Notice a thought",
        modality: "act",
        needs_ai: false,
    },
    Technique {
        id: "act.values",
        title: "A values-led step",
        modality: "act",
        needs_ai: false,
    },
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
        let source = source(id).ok_or(HostError::UnknownTechnique)?;
        let snapshot = ExecutableSnapshot::build(SourceBundle {
            root: id.into(),
            patterns: BTreeMap::from([
                (id.into(), source.into()),
                ("therapy.ready".into(), READY.into()),
            ]),
        })
        .map_err(|_| HostError::InvalidSource)?;
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
        if source(&run.technique_id).is_none() {
            return Err(HostError::UnknownTechnique);
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

    /// Reject a UI command based on a superseded projection. The storage adapter must
    /// still compare-and-swap this revision when publishing the returned checkpoint.
    pub fn apply_at(&self, expected_revision: u64, command: Command) -> Result<Self, HostError> {
        if expected_revision != self.revision {
            return Err(HostError::StaleRevision);
        }
        self.apply(command)
    }
}

/// Embed exact audited therapy sources; no name-based filesystem or network lookup occurs.
fn source(id: &str) -> Option<&'static str> {
    Some(match id {
        "cbt.moment" => {
            include_str!("../../../packages/therapy-patterns/patterns/cbt.moment.pattern.md")
        }
        "cbt.activation" => {
            include_str!("../../../packages/therapy-patterns/patterns/cbt.activation.pattern.md")
        }
        "cbt.worry-chain" => {
            include_str!("../../../packages/therapy-patterns/patterns/cbt.worry-chain.pattern.md")
        }
        "act.defusion" => {
            include_str!("../../../packages/therapy-patterns/patterns/act.defusion.pattern.md")
        }
        "act.values" => {
            include_str!("../../../packages/therapy-patterns/patterns/act.values.pattern.md")
        }
        "dbt.pause" => {
            include_str!("../../../packages/therapy-patterns/patterns/dbt.pause.pattern.md")
        }
        "dbt.interpersonal" => {
            include_str!("../../../packages/therapy-patterns/patterns/dbt.interpersonal.pattern.md")
        }
        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use pattern_core::runtime::{Event, Fulfillment, Receipt, Request};
    use pattern_core::scenario::{Scenario, Step};

    /// The host exposes only exercises for the chosen modality.
    #[test]
    fn catalog_filters_by_modality() {
        assert_eq!(techniques("cbt").len(), 3);
        assert_eq!(techniques("act").len(), 2);
        assert_eq!(techniques("dbt").len(), 2);
        assert!(techniques("narm").is_empty());
        assert!(techniques("coherence").is_empty());
        assert!(techniques("fop").is_empty());
    }

    /// Save/restore keeps one exact pending interaction and never emits a historical one.
    #[test]
    fn start_reply_and_restore_keep_exact_progress() {
        let run = SavedRun::start("cbt.moment", "root-1", BTreeMap::new()).unwrap();
        let first = run.view().unwrap();
        let pending = first.pending.unwrap();
        assert!(matches!(pending.request, Request::Choose { .. }));
        let next = run
            .apply(Command {
                run_id: pending.run_id.clone(),
                event: Event::Fulfill(Receipt {
                    effect_id: pending.effect_id.clone(),
                    result: Fulfillment::Selected("begin".into()),
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
                && item.result == Some(Fulfillment::Selected("begin".into()))));
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
            SavedRun::start("act.values", "", BTreeMap::new()).unwrap_err(),
            HostError::InvalidInput
        );
        assert_eq!(
            SavedRun::start(
                "act.values",
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
    fn all_six_non_ai_exercises_finish_after_each_step_is_restored() {
        for id in [
            "cbt.moment",
            "cbt.activation",
            "act.defusion",
            "act.values",
            "dbt.pause",
            "dbt.interpersonal",
        ] {
            let path = format!(
                "{}/../../packages/therapy-patterns/scenarios/{id}.json",
                env!("CARGO_MANIFEST_DIR")
            );
            let fixture: Scenario = serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
            let mut run = SavedRun::start(id, &format!("root-{id}"), fixture.inputs).unwrap();
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
}
