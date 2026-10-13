//! Pure orchestration of one root and its isolated descendant Runs.
//! A Host can keep independent managers for unrelated roots; no ambient state is shared.
use crate::{
    runtime::{self, ChildResult, Effect, Event, Limits, ManagerAction, RunState, Status, Trace},
    snapshot::ExecutableSnapshot,
    value::Value,
};
use serde::{Deserialize, Deserializer, Serialize};
use std::collections::{BTreeMap, VecDeque};
mod events;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ManagerLimits {
    pub runtime: Limits,
    /// Includes completed children and the root.
    pub max_runs: usize,
    /// Root has depth 1.
    pub max_depth: usize,
}
impl Default for ManagerLimits {
    /// Bound a run tree to 1,000 runs and depth 32, using default per-run limits.
    fn default() -> Self {
        Self {
            runtime: Limits::default(),
            max_runs: 1000,
            max_depth: 32,
        }
    }
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ParentLink {
    pub run_id: String,
    pub call_id: String,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ManagedRun {
    parent: Option<ParentLink>,
    state: RunState,
}
impl ManagedRun {
    /// Borrow the parent run identity, or `None` for the root.
    pub fn parent(&self) -> Option<&ParentLink> {
        self.parent.as_ref()
    }
    /// Borrow this run's deterministic runtime state.
    pub fn state(&self) -> &RunState {
        &self.state
    }
}
/// Only external events: child completion is derived internally, never supplied by a Host.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Command {
    pub run_id: String,
    pub event: Event,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
struct SavedManager {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    interruption: Option<events::Interruption>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    delivered_messages: BTreeMap<String, runtime::Receipt>,
    version: u32,
    snapshot: ExecutableSnapshot,
    root_id: String,
    inputs: BTreeMap<String, Value>,
    limits: ManagerLimits,
    runs: BTreeMap<String, ManagedRun>,
    /// Accepted external results and lifecycle commands only; no retry/debug trace journal.
    accepted: Vec<Command>,
}
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(transparent)]
pub struct RunManager {
    inner: SavedManager,
}
impl<'de> Deserialize<'de> for RunManager {
    /// Replay saved commands and reject any mismatch with the serialized run tree.
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let saved = SavedManager::deserialize(deserializer)?;
        let rebuilt = reconstruct(&saved).map_err(serde::de::Error::custom)?.state;
        if rebuilt.inner != saved {
            return Err(serde::de::Error::custom(
                "Run tree does not match accepted results and pinned snapshot",
            ));
        }
        Ok(rebuilt)
    }
}
impl RunManager {
    /// Borrow the external command journal; rejected and state-neutral retries are excluded.
    pub(crate) fn accepted_commands(&self) -> &[Command] {
        &self.inner.accepted
    }
    /// Accepted external results in execution order, separate from debug traces.
    pub fn ledger(&self) -> impl Iterator<Item = (&str, &runtime::Receipt)> {
        self.inner
            .accepted
            .iter()
            .filter_map(|command| match &command.event {
                Event::Fulfill(receipt) => Some((command.run_id.as_str(), receipt)),
                Event::Message { message_id, .. } => self
                    .inner
                    .delivered_messages
                    .get(message_id)
                    .map(|receipt| (command.run_id.as_str(), receipt)),
                _ => None,
            })
    }
    /// Borrow the root state, whose presence is guaranteed by construction and restore.
    pub fn root(&self) -> &RunState {
        &self.inner.runs[&self.inner.root_id].state
    }
    /// Borrow all root and child runs, including terminal runs.
    pub fn runs(&self) -> &BTreeMap<String, ManagedRun> {
        &self.inner.runs
    }
    /// Borrow the immutable executable closure pinned to this run tree.
    pub fn snapshot(&self) -> &ExecutableSnapshot {
        &self.inner.snapshot
    }
    /// At most one leaf effect in this sequential execution tree. Paused effects remain visible.
    pub fn pending(&self) -> Option<&Effect> {
        self.inner
            .runs
            .iter()
            .filter(|(id, _)| {
                self.inner
                    .interruption
                    .as_ref()
                    .is_none_or(|frame| is_descendant(self, id, &frame.handler_run))
            })
            .find_map(|(_, run)| run.state.pending())
    }
    /// Whether the next text answer should pass through the active pattern's message handler.
    pub fn handles_messages(&self) -> bool {
        self.inner.interruption.is_none()
            && self.pending().is_some_and(|e| {
                matches!(e.request, runtime::Request::Ask { .. })
                    && events::handler(self, &e.run_id).is_some()
            })
    }
    /// Whether a side-question handler currently owns the deliverable effect.
    pub fn handling_message(&self) -> bool {
        self.inner.interruption.is_some()
    }
    /// Preserve explicit loop controls while a side-question handler is active.
    pub fn loop_effect(&self) -> Option<&Effect> {
        self.inner
            .interruption
            .as_ref()
            .and_then(|frame| self.inner.runs[&frame.target_run].state.pending())
            .filter(|e| e.loop_context.is_some())
            .or_else(|| self.pending())
    }
}

/// Historical reconstruction only. `recorded_effects` must never be dispatched.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct Replay {
    pub state: RunManager,
    pub recorded_effects: Vec<Effect>,
    pub traces: Vec<RunTrace>,
}
/// Recreate a tree and its historical transitions from the saved command journal.
///
/// # Errors
/// Returns start or transition errors for an invalid journal. Returned effects are replay
/// history, not authorization to dispatch external work again.
fn reconstruct(saved: &SavedManager) -> Result<Replay, Error> {
    let mut turn = start(
        saved.snapshot.clone(),
        saved.root_id.clone(),
        saved.inputs.clone(),
        saved.limits.clone(),
    )?;
    let mut recorded_effects = turn.effects;
    let mut traces = turn.traces;
    for command in &saved.accepted {
        turn = transition(&turn.state, command.clone())?;
        recorded_effects.extend(turn.effects);
        traces.extend(turn.traces);
    }
    Ok(Replay {
        state: turn.state,
        recorded_effects,
        traces,
    })
}
/// Replay the command journal and require an exact match with saved state.
///
/// # Errors
/// Returns runtime, tree-validation, or state-mismatch errors. Historical effects must
/// not be dispatched as new work.
pub fn replay(state: &RunManager) -> Result<Replay, Error> {
    let rebuilt = reconstruct(&state.inner)?;
    if rebuilt.state != *state {
        return Err(Error::InvalidTree);
    }
    Ok(rebuilt)
}
/// Reopen an accepted participant effect using the original snapshot and journal prefix.
/// Later answers and derived effects are invalidated; historical effects are never dispatched.
///
/// # Errors
/// Rejects invalid state, missing targets, and targets that are not participant interactions.
pub fn rewind(state: &RunManager, run_id: &str, effect_id: &str) -> Result<RunManager, Error> {
    replay(state)?;
    let saved = &state.inner;
    let mut current = start(
        saved.snapshot.clone(),
        saved.root_id.clone(),
        saved.inputs.clone(),
        saved.limits.clone(),
    )?
    .state;
    for command in &saved.accepted {
        if command.run_id == run_id
            && matches!(&command.event, Event::Fulfill(receipt) if receipt.effect_id == effect_id)
        {
            let effect = current.pending().ok_or(Error::InvalidTree)?;
            if effect.effect_id != effect_id
                || effect.run_id != run_id
                || !effect.request.kind().starts_with("interaction.")
            {
                return Err(Error::InvalidTree);
            }
            // A paused prefix must become editable without replaying future lifecycle commands.
            if current.root().status() == &Status::Paused {
                current = transition(
                    &current,
                    Command {
                        run_id: current.root().run_id().into(),
                        event: Event::Resume,
                    },
                )?
                .state;
            }
            return Ok(current);
        }
        current = transition(&current, command.clone())?.state;
    }
    Err(Error::InvalidTree)
}

#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct RunTrace {
    pub run_id: String,
    pub event: Trace,
}
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct Transition {
    pub state: RunManager,
    pub effects: Vec<Effect>,
    pub traces: Vec<RunTrace>,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Error {
    Runtime(runtime::Error),
    UnknownRun,
    InvalidTree,
    RunLimit,
}
impl From<runtime::Error> for Error {
    /// Preserve the underlying runtime failure in the manager's typed error boundary.
    fn from(value: runtime::Error) -> Self {
        Self::Runtime(value)
    }
}
impl std::fmt::Display for Error {
    /// Format the typed manager failure without adding run contents.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{self:?}")
    }
}
impl std::error::Error for Error {}

/// Start a root run, settling internal child actions until external work is pending.
///
/// # Errors
/// Rejects zero manager limits, invalid inputs, invalid executable state, or run-tree limits.
pub fn start(
    snapshot: ExecutableSnapshot,
    root_id: String,
    inputs: BTreeMap<String, Value>,
    limits: ManagerLimits,
) -> Result<Transition, Error> {
    if limits.max_depth == 0 || limits.max_runs == 0 {
        return Err(Error::RunLimit);
    }
    // Each Run validates its own collection bounds when started. Failed manager
    // transitions return no effects or state, including a failed child launch.
    let turn = runtime::start_with_limits(
        snapshot.root().clone(),
        root_id.clone(),
        inputs.clone(),
        limits.runtime.clone(),
    )?;
    let state = RunManager {
        inner: SavedManager {
            interruption: None,
            delivered_messages: BTreeMap::new(),
            version: 1,
            snapshot,
            root_id: root_id.clone(),
            inputs,
            limits,
            runs: BTreeMap::from([(
                root_id.clone(),
                ManagedRun {
                    parent: None,
                    state: turn.state.clone(),
                },
            )]),
            accepted: vec![],
        },
    };
    let mut result = Transition {
        state,
        effects: vec![],
        traces: vec![],
    };
    settle(&mut result, root_id, turn)?;
    Ok(result)
}

/// Count ancestors including the selected run, rejecting missing nodes or parent cycles.
fn depth(state: &RunManager, id: &str) -> Result<usize, Error> {
    let mut depth = 1;
    let mut next = state.inner.runs.get(id).ok_or(Error::UnknownRun)?;
    while let Some(parent) = &next.parent {
        depth += 1;
        if depth > state.inner.runs.len() {
            return Err(Error::InvalidTree);
        }
        next = state
            .inner
            .runs
            .get(&parent.run_id)
            .ok_or(Error::InvalidTree)?;
    }
    Ok(depth)
}
/// Apply internal transitions and child completions to a staged tree.
/// Enforces pinned revisions and tree limits before returning externally visible effects.
fn settle(result: &mut Transition, id: String, turn: runtime::Transition) -> Result<(), Error> {
    let mut queue = VecDeque::from([(id, turn)]);
    while let Some((id, turn)) = queue.pop_front() {
        result.effects.extend(turn.effects);
        result
            .traces
            .extend(turn.traces.into_iter().map(|event| RunTrace {
                run_id: id.clone(),
                event,
            }));
        result
            .state
            .inner
            .runs
            .get_mut(&id)
            .ok_or(Error::UnknownRun)?
            .state = turn.state;
        for action in turn.actions {
            let ManagerAction::StartChild(call) = action;
            if call.parent_run_id != id
                || result.state.inner.runs[&id].state.pending_child() != Some(&call)
            {
                return Err(Error::InvalidTree);
            }
            let child_id = call.call_id.clone();
            if result.state.inner.runs.contains_key(&child_id) {
                return Err(Error::InvalidTree);
            }
            if result.state.inner.runs.len() >= result.state.inner.limits.max_runs
                || depth(&result.state, &id)? >= result.state.inner.limits.max_depth
            {
                return Err(Error::RunLimit);
            }
            let compiled = result
                .state
                .inner
                .snapshot
                .get(&call.dependency)
                .ok_or(Error::InvalidTree)?
                .clone();
            let child = runtime::start_with_limits(
                compiled,
                child_id.clone(),
                call.inputs,
                result.state.inner.limits.runtime.clone(),
            )?;
            result.state.inner.runs.insert(
                child_id.clone(),
                ManagedRun {
                    parent: Some(ParentLink {
                        run_id: id.clone(),
                        call_id: call.call_id,
                    }),
                    state: child.state.clone(),
                },
            );
            queue.push_back((child_id, child));
        }
        let run = &result.state.inner.runs[&id];
        if run.state.status() == &Status::Completed {
            if let Some(link) = &run.parent {
                let parent = &result.state.inner.runs[&link.run_id].state;
                // Historical duplicate delivery cannot complete an unrelated later child.
                if parent
                    .pending_child()
                    .is_some_and(|call| call.call_id == link.call_id)
                {
                    let turn = runtime::complete_child(
                        parent,
                        ChildResult {
                            call_id: link.call_id.clone(),
                            outputs: run.state.outputs().clone(),
                        },
                    )?;
                    queue.push_back((link.run_id.clone(), turn));
                }
            }
        }
    }
    Ok(())
}

/// Test whether a run is the ancestor itself or is linked below it.
fn is_descendant(state: &RunManager, candidate: &str, ancestor: &str) -> bool {
    let mut id = candidate;
    loop {
        if id == ancestor {
            return true;
        }
        let Some(parent) = state.inner.runs.get(id).and_then(|r| r.parent.as_ref()) else {
            return false;
        };
        id = &parent.run_id;
    }
}
/// Identify lifecycle states that can still be paused, resumed, cancelled, or failed.
fn active(status: &Status) -> bool {
    matches!(status, Status::Waiting | Status::Paused)
}

/// Resume only a stopped loop's paused ancestor chain so its normal continuation can settle.
/// Ancestors wait for this child, so resuming them cannot dispatch unrelated effects.
fn resume_loop_ancestors(result: &mut Transition, child: &str) -> Result<(), Error> {
    let mut ancestors = vec![];
    let mut id = child;
    while let Some(parent) = &result.state.inner.runs[id].parent {
        ancestors.push(parent.run_id.clone());
        id = &parent.run_id;
    }
    for id in ancestors.into_iter().rev() {
        let state = &result.state.inner.runs[&id].state;
        if state.status() == &Status::Paused {
            let turn = runtime::transition(state, Event::Resume)?;
            settle(result, id, turn)?;
        }
    }
    Ok(())
}

/// Apply one external command to a cloned tree and journal accepted state changes.
/// Cancellation and failure affect the active tree; pause/resume affect the selected subtree.
///
/// # Errors
/// Rejects invalid targets, lifecycle operations, replies, or tree limits. The caller's
/// state is unchanged on error; this function performs no external I/O.
pub fn transition(state: &RunManager, command: Command) -> Result<Transition, Error> {
    if matches!(command.event, Event::Message { .. }) {
        return events::message(state, command);
    }
    let target = state
        .inner
        .runs
        .get(&command.run_id)
        .ok_or(Error::UnknownRun)?;
    let mut result = Transition {
        state: state.clone(),
        effects: vec![],
        traces: vec![],
    };
    if matches!(
        command.event,
        Event::Pause | Event::Resume | Event::Cancel | Event::Fail
    ) {
        if !active(target.state.status()) {
            // Preserve the single-Run idempotency and terminal-event rules.
            runtime::transition(&target.state, command.event.clone())?;
            return Ok(result);
        }
        if matches!(command.event, Event::Resume) {
            let mut parent = target.parent.as_ref();
            while let Some(link) = parent {
                let ancestor = &state.inner.runs[&link.run_id];
                if ancestor.state.status() == &Status::Paused {
                    return Err(runtime::Error::Paused.into());
                }
                parent = ancestor.parent.as_ref();
            }
        }
        // Cancellation/failure propagate up to the root and down all active descendants.
        // Pause/resume affect only the target subtree; a parent may wait for a paused child.
        let anchor = if matches!(command.event, Event::Cancel | Event::Fail) {
            &state.inner.root_id
        } else {
            &command.run_id
        };
        let mut ids: Vec<_> = state
            .inner
            .runs
            .iter()
            .filter(|(id, run)| active(run.state.status()) && is_descendant(state, id, anchor))
            .map(|(id, _)| id.clone())
            .collect();
        ids.sort_by_key(|id| depth(state, id).unwrap_or(usize::MAX));
        for id in ids {
            let turn =
                runtime::transition(&result.state.inner.runs[&id].state, command.event.clone())?;
            settle(&mut result, id, turn)?;
        }
        if matches!(command.event, Event::Cancel | Event::Fail) {
            result.state.inner.interruption = None;
        }
    } else {
        if let Some(frame) = &state.inner.interruption {
            if !is_descendant(state, &command.run_id, &frame.handler_run) {
                if matches!(command.event, Event::StopLoop { .. })
                    && command.run_id == frame.target_run
                {
                    events::stop_handler(&mut result)?;
                } else {
                    return Err(runtime::Error::WrongEffect.into());
                }
            }
        }
        let turn = runtime::transition(&target.state, command.event.clone())?;
        if matches!(command.event, Event::StopLoop { .. }) && turn.state != target.state {
            resume_loop_ancestors(&mut result, &command.run_id)?;
        }
        settle(&mut result, command.run_id.clone(), turn)?;
    }
    events::finish(&mut result)?;
    if let Some(frame) = &result.state.inner.interruption {
        result
            .effects
            .retain(|e| is_descendant(&result.state, &e.run_id, &frame.handler_run));
    }
    if result.state.inner.runs != state.inner.runs {
        result.state.inner.accepted.push(command);
    }
    Ok(result)
}
