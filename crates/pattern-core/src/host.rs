//! Fixture adapter over the real runtime, not a separate simulation interpreter.
use crate::{
    compiler::CompiledPattern,
    runtime::{self, Effect, Event, Fulfillment, Receipt, RunState, Trace},
    value::Value,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Fixture {
    pub inputs: BTreeMap<String, Value>,
    pub replies: Vec<Reply>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Reply {
    pub expected_kind: String,
    pub result: Fulfillment,
}
#[derive(Clone, Debug, Serialize)]
pub struct Simulation {
    pub state: RunState,
    pub effects: Vec<Effect>,
    pub traces: Vec<Trace>,
}

/// Run a compiled pattern against ordered fixture replies, collecting effects and traces.
/// This fixture adapter performs no model calls or external I/O.
///
/// # Errors
/// Returns runtime errors, mismatched fixture replies, or an incomplete final run.
pub fn simulate(
    pattern: CompiledPattern,
    run_id: String,
    fixture: Fixture,
) -> Result<Simulation, String> {
    let mut turn = runtime::start(pattern, run_id, fixture.inputs).map_err(|e| e.to_string())?;
    let mut effects = turn.effects;
    let mut traces = turn.traces;
    for (i, reply) in fixture.replies.into_iter().enumerate() {
        let pending = turn
            .state
            .pending()
            .ok_or_else(|| format!("Fixture reply {} has no pending effect", i + 1))?;
        if pending.request.kind() != reply.expected_kind {
            return Err(format!(
                "Fixture reply {} expected {}, received {}",
                i + 1,
                reply.expected_kind,
                pending.request.kind()
            ));
        }
        turn = runtime::transition(
            &turn.state,
            Event::Fulfill(Receipt {
                effect_id: pending.effect_id.clone(),
                result: reply.result,
            }),
        )
        .map_err(|e| format!("Fixture reply {}: {e}", i + 1))?;
        effects.extend(turn.effects);
        traces.extend(turn.traces);
    }
    if turn.state.status() != &runtime::Status::Completed {
        return Err("Fixture ended before the Run completed".into());
    }
    Ok(Simulation {
        state: turn.state,
        effects,
        traces,
    })
}

#[derive(Clone, Debug, Serialize)]
pub struct ManagedSimulation {
    pub state: crate::manager::RunManager,
    pub effects: Vec<Effect>,
    pub traces: Vec<crate::manager::RunTrace>,
}
/// Simulate a pinned run tree, routing each fixture reply to the pending leaf run.
/// Uses default manager limits and performs no external I/O.
///
/// # Errors
/// Returns manager errors, mismatched fixture replies, or an incomplete root run.
pub fn simulate_snapshot(
    snapshot: crate::snapshot::ExecutableSnapshot,
    run_id: String,
    fixture: Fixture,
) -> Result<ManagedSimulation, String> {
    use crate::manager::{self, Command, ManagerLimits};
    let mut turn = manager::start(snapshot, run_id, fixture.inputs, ManagerLimits::default())
        .map_err(|e| e.to_string())?;
    let mut effects = turn.effects;
    let mut traces = turn.traces;
    for (i, reply) in fixture.replies.into_iter().enumerate() {
        let pending = turn
            .state
            .pending()
            .ok_or_else(|| format!("Fixture reply {} has no pending effect", i + 1))?;
        if pending.request.kind() != reply.expected_kind {
            return Err(format!(
                "Fixture reply {} expected {}, received {}",
                i + 1,
                reply.expected_kind,
                pending.request.kind()
            ));
        }
        turn = manager::transition(
            &turn.state,
            Command {
                run_id: pending.run_id.clone(),
                event: Event::Fulfill(Receipt {
                    effect_id: pending.effect_id.clone(),
                    result: reply.result,
                }),
            },
        )
        .map_err(|e| format!("Fixture reply {}: {e}", i + 1))?;
        effects.extend(turn.effects);
        traces.extend(turn.traces);
    }
    if turn.state.root().status() != &runtime::Status::Completed {
        return Err("Fixture ended before the Run tree completed".into());
    }
    Ok(ManagedSimulation {
        state: turn.state,
        effects,
        traces,
    })
}
