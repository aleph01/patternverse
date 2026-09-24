//! Scripted fixture actions outside the language, using the real persistence/Manager path.
use crate::{
    manager::{self, Command, ManagerLimits, RunTrace},
    persistence::{self, Checkpoint, MemoryStore},
    runtime::{Event, Fulfillment, Receipt, Status},
    snapshot::ExecutableSnapshot,
    value::Value,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Scenario {
    pub inputs: BTreeMap<String, Value>,
    pub steps: Vec<Step>,
}
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Target {
    #[default]
    Root,
    Pending,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum Step {
    Reply {
        expected_kind: String,
        result: Fulfillment,
    },
    RejectReply {
        result: Fulfillment,
    },
    RepeatLast,
    Retry,
    StopLoop,
    Pause {
        #[serde(default)]
        target: Target,
    },
    Resume {
        #[serde(default)]
        target: Target,
    },
    Cancel {
        #[serde(default)]
        target: Target,
    },
    Fail {
        #[serde(default)]
        target: Target,
    },
    Restart,
    AcknowledgeContent,
    Expect {
        status: Status,
        pending_kind: Option<String>,
        ledger_len: usize,
    },
}
#[derive(Clone, Debug, Serialize)]
pub struct Report {
    pub checkpoint: Checkpoint,
    pub traces: Vec<RunTrace>,
    pub steps: usize,
}
/// Resolve a scenario target to the root or current pending leaf; reject a missing leaf.
fn target(checkpoint: &Checkpoint, target: Target) -> Result<String, String> {
    match target {
        Target::Root => Ok(checkpoint.key().into()),
        Target::Pending => checkpoint
            .state()
            .pending()
            .map(|p| p.run_id.clone())
            .ok_or_else(|| "No pending leaf".into()),
    }
}
/// Execute a scripted scenario through the real manager and persistence contracts.
/// Uses an in-memory fixture store and never dispatches network or model work.
///
/// # Errors
/// Returns setup errors or a step-numbered error for rejected actions and failed assertions.
pub fn run(
    snapshot: ExecutableSnapshot,
    run_id: String,
    scenario: Scenario,
) -> Result<Report, String> {
    let mut store = MemoryStore::default();
    let mut checkpoint = persistence::create(
        &mut store,
        snapshot,
        run_id.clone(),
        scenario.inputs,
        ManagerLimits::default(),
    )
    .map_err(|e| e.to_string())?;
    let mut last = None;
    let steps = scenario.steps.len();
    for (index, step) in scenario.steps.into_iter().enumerate() {
        let result = (|| -> Result<(), String> {
            let command = match step {
                Step::Reply {
                    expected_kind,
                    result,
                } => {
                    let pending = checkpoint.state().pending().ok_or("No pending effect")?;
                    if pending.request.kind() != expected_kind {
                        return Err(format!(
                            "Expected {expected_kind}, got {}",
                            pending.request.kind()
                        ));
                    }
                    let command = Command {
                        run_id: pending.run_id.clone(),
                        event: Event::Fulfill(Receipt {
                            effect_id: pending.effect_id.clone(),
                            result,
                        }),
                    };
                    last = Some(command.clone());
                    Some(command)
                }
                Step::RejectReply { result } => {
                    let pending = checkpoint.state().pending().ok_or("No pending effect")?;
                    let command = Command {
                        run_id: pending.run_id.clone(),
                        event: Event::Fulfill(Receipt {
                            effect_id: pending.effect_id.clone(),
                            result,
                        }),
                    };
                    if persistence::apply(&mut store, &checkpoint, command).is_ok() {
                        return Err("Expected invalid reply to be rejected".into());
                    }
                    let loaded = persistence::load(&mut store, &run_id)
                        .map_err(|e| e.to_string())?
                        .ok_or("Missing checkpoint")?;
                    if loaded != checkpoint {
                        return Err("Rejected reply changed saved state".into());
                    }
                    None
                }
                Step::RepeatLast => Some(last.clone().ok_or("No previous reply")?),
                Step::Retry => {
                    let pending = checkpoint.state().pending().ok_or("No pending effect")?;
                    Some(Command {
                        run_id: pending.run_id.clone(),
                        event: Event::Retry {
                            effect_id: pending.effect_id.clone(),
                        },
                    })
                }
                Step::StopLoop => {
                    let pending = checkpoint.state().pending().ok_or("No pending effect")?;
                    Some(Command {
                        run_id: pending.run_id.clone(),
                        event: Event::StopLoop {
                            effect_id: pending.effect_id.clone(),
                        },
                    })
                }
                Step::Pause { target: t } => Some(Command {
                    run_id: target(&checkpoint, t)?,
                    event: Event::Pause,
                }),
                Step::Resume { target: t } => Some(Command {
                    run_id: target(&checkpoint, t)?,
                    event: Event::Resume,
                }),
                Step::Cancel { target: t } => Some(Command {
                    run_id: target(&checkpoint, t)?,
                    event: Event::Cancel,
                }),
                Step::Fail { target: t } => Some(Command {
                    run_id: target(&checkpoint, t)?,
                    event: Event::Fail,
                }),
                Step::Restart => {
                    checkpoint = persistence::load(&mut store, &run_id)
                        .map_err(|e| e.to_string())?
                        .ok_or("Missing checkpoint")?;
                    None
                }
                Step::AcknowledgeContent => {
                    let ids: Vec<_> = checkpoint
                        .deliverable()
                        .iter()
                        .filter(|e| e.request.kind() == "content.show")
                        .map(|e| e.effect_id.clone())
                        .collect();
                    for id in ids {
                        checkpoint = persistence::acknowledge_content(&mut store, &checkpoint, &id)
                            .map_err(|e| e.to_string())?;
                    }
                    None
                }
                Step::Expect {
                    status,
                    pending_kind,
                    ledger_len,
                } => {
                    if checkpoint.state().root().status() != &status
                        || checkpoint.state().pending().map(|e| e.request.kind())
                            != pending_kind.as_deref()
                        || checkpoint.state().ledger().count() != ledger_len
                    {
                        return Err("State expectation did not match".into());
                    }
                    None
                }
            };
            if let Some(command) = command {
                checkpoint = persistence::apply(&mut store, &checkpoint, command)
                    .map_err(|e| e.to_string())?;
            }
            Ok(())
        })();
        result.map_err(|e| format!("Scenario step {}: {e}", index + 1))?;
    }
    let traces = manager::replay(checkpoint.state())
        .map_err(|e| e.to_string())?
        .traces;
    Ok(Report {
        checkpoint,
        traces,
        steps,
    })
}
