//! Single-Run pure transitions. Hosts fulfill effects; they cannot select nodes.
use crate::{
    compiler::{
        BindingId, Collection, CollectionMode, CompiledPattern, Field, Instruction, Node, NodeId,
        Options, Part, Rating, Selection, SelectionMode, Timer,
    },
    expression::{self, Expr},
    syntax::Span,
    value::{Choice, Contract, Type, Value},
};
use serde::{Deserialize, Deserializer, Serialize};
use std::collections::BTreeMap;
mod collection;
mod form;
mod looping;
mod realization;
mod refinement;
mod selection;
mod semantic;
mod timer;
use collection::CollectionFrame;
use looping::LoopFrame;
pub use timer::TimerResult;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Limits {
    pub max_collection_records: usize,
}
impl Default for Limits {
    /// Limit each collection to at most 1,000 records unless the Host supplies a stricter policy.
    fn default() -> Self {
        Self {
            max_collection_records: 1000,
        }
    }
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct CollectionProvenance {
    pub collection_node_id: NodeId,
    pub record_index: Option<usize>,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct CollectionContinuation {
    pub collection_node_id: NodeId,
    pub completed: usize,
    pub min: usize,
    pub max: usize,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", content = "payload")]
pub enum Request {
    #[serde(rename = "interaction.form")]
    Form(crate::compiler::Form<String>),
    #[serde(rename = "interaction.timer")]
    Timer { prompt: String, timer: Timer },
    #[serde(rename = "semantic.classify")]
    Classify {
        definition: crate::semantic::Classifier,
        input: Value,
        context: BTreeMap<String, Value>,
    },
    #[serde(rename = "semantic.suggest")]
    Suggest {
        mode: crate::semantic::SuggestionMode,
        specification: String,
        inputs: BTreeMap<String, Value>,
        candidates: Vec<crate::semantic::Candidate>,
    },
    #[serde(rename = "interaction.refine")]
    Refine { review: crate::refine::Review },
    #[serde(rename = "language.realize")]
    Realize {
        specification: String,
        inputs: BTreeMap<String, Value>,
    },
    #[serde(rename = "interaction.ask")]
    Ask { prompt: String },
    #[serde(rename = "interaction.rate")]
    Rate { prompt: String, rating: Rating },
    #[serde(rename = "agent.generate")]
    Generate { prompt: String, contract: Contract },
    #[serde(rename = "agent.turn")]
    Turn { prompt: String },
    #[serde(rename = "interaction.choose")]
    Choose {
        prompt: String,
        options: Vec<Choice>,
        #[serde(skip_serializing_if = "Option::is_none")]
        collection_continuation: Option<CollectionContinuation>,
    },
    #[serde(rename = "interaction.select")]
    Select {
        prompt: String,
        options: Vec<Choice>,
        mode: SelectionMode,
        min: usize,
        max: usize,
        prefer: Option<String>,
    },
    #[serde(rename = "content.image")]
    Image {
        markdown: String,
        image: crate::compiler::Image,
    },
    #[serde(rename = "content.video")]
    Video {
        markdown: String,
        video: crate::compiler::Video,
    },
    #[serde(rename = "content.show")]
    Show {
        markdown: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        view: Option<crate::show::ShowView>,
    },
}
impl Request {
    /// Return the stable wire discriminator used to match Host handlers and fixture replies.
    pub fn kind(&self) -> &'static str {
        match self {
            Self::Form(_) => "interaction.form",
            Self::Timer { .. } => "interaction.timer",
            Self::Classify { .. } => "semantic.classify",
            Self::Suggest { .. } => "semantic.suggest",
            Self::Refine { .. } => "interaction.refine",
            Self::Realize { .. } => "language.realize",
            Self::Ask { .. } => "interaction.ask",
            Self::Rate { .. } => "interaction.rate",
            Self::Generate { .. } => "agent.generate",
            Self::Turn { .. } => "agent.turn",
            Self::Choose { .. } => "interaction.choose",
            Self::Select { .. } => "interaction.select",
            Self::Show { .. } => "content.show",
            Self::Video { .. } => "content.video",
            Self::Image { .. } => "content.image",
        }
    }
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Effect {
    pub effect_id: String,
    pub run_id: String,
    pub snapshot_id: String,
    pub node_id: NodeId,
    pub span: Span,
    pub request: Request,
    pub collection: Option<CollectionProvenance>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub loop_context: Option<LoopContext>,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct LoopContext {
    pub node_id: NodeId,
    pub iteration: usize,
    pub max: Option<usize>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", content = "value", rename_all = "snake_case")]
pub enum Fulfillment {
    Form(BTreeMap<String, Value>),
    Timer(TimerResult),
    Classified(String),
    Suggested(crate::semantic::Suggestion),
    Reviewed(crate::refine::Decision),
    Edited(String),
    Realized(String),
    Text(String),
    Rating(f64),
    Generated(Value),
    Turn(String),
    Selected(String),
    SelectedMany(Vec<String>),
    Ranked(Vec<String>),
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Receipt {
    pub effect_id: String,
    pub result: Fulfillment,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum Event {
    /// A participant message routed by the run manager, never by the single-run interpreter.
    Message {
        effect_id: String,
        message_id: String,
        text: String,
    },
    StopLoop {
        effect_id: String,
    },
    Pause,
    Resume,
    Cancel,
    Fail,
    Fulfill(Receipt),
    Retry {
        effect_id: String,
    },
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Status {
    Waiting,
    Paused,
    Cancelled,
    Failed,
    Completed,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Trace {
    LoopStarted(NodeId),
    LoopRepeated { node: NodeId, iteration: usize },
    LoopExited(NodeId),
    LoopStopped(NodeId),
    ChildRequested(String),
    ChildCompleted(String),
    CollectionStarted(NodeId),
    RecordStarted { collection: NodeId, index: usize },
    RecordCompleted { collection: NodeId, index: usize },
    CollectionCompleted(NodeId),
    Paused,
    Resumed,
    Cancelled,
    Failed,
    BranchSelected { from: NodeId, to: NodeId },
    RunStarted,
    NodeEntered(NodeId),
    BindingCommitted(BindingId),
    EffectRequested(String),
    EffectFulfilled(String),
    Completed,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Error {
    CollectionLimit,
    Paused,
    Terminal,
    Expression(String),
    InvalidRunId,
    InvalidInputs(String),
    InvalidSnapshot,
    WrongEffect,
    WrongResult,
    ContractViolation,
    UnknownChoice,
    ConflictingDuplicate,
    AlreadyCompleted,
    CounterOverflow,
}
impl std::fmt::Display for Error {
    /// Format a typed runtime failure for callers without serializing the run state.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{self:?}")
    }
}
impl std::error::Error for Error {}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
struct SavedRun {
    version: u32,
    pattern: CompiledPattern,
    run_id: String,
    inputs: BTreeMap<String, Value>,
    status: Status,
    pc: usize,
    bindings: Vec<Option<Value>>,
    pending: Option<Effect>,
    pending_child: Option<ChildCall>,
    history: Vec<Accepted>,
    next_effect_sequence: u64,
    ledger: Vec<Receipt>,
    outputs: BTreeMap<String, Value>,
    limits: Limits,
    collection: Option<CollectionFrame>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    looping: Option<LoopFrame>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    refinement: Option<refinement::Frame>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    realized: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ChildCall {
    pub call_id: String,
    pub parent_run_id: String,
    pub dependency: String,
    pub node_id: NodeId,
    pub inputs: BTreeMap<String, Value>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ManagerAction {
    StartChild(ChildCall),
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub(crate) struct ChildResult {
    pub call_id: String,
    pub outputs: BTreeMap<String, Value>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
enum Accepted {
    StopLoop(String),
    External(Receipt),
    Child(ChildResult),
}

/// Persist this entire value atomically with accepted results in a future Host store.
/// Deserialization recompiles the pinned source and replays receipts to validate state.
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(transparent)]
pub struct RunState {
    inner: SavedRun,
}
impl<'de> Deserialize<'de> for RunState {
    /// Restore by recompiling and replaying accepted results, rejecting inconsistent saved state.
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let saved = SavedRun::deserialize(deserializer)?;
        restore(saved).map_err(serde::de::Error::custom)
    }
}
impl RunState {
    /// Project assigned root-scope bindings for an explicitly requested simulation inspector.
    /// Unassigned and collection-local slots are omitted; this is not an ambient chat context.
    ///
    /// # Errors
    /// Returns compiler diagnostics if the pinned source cannot be inspected.
    pub fn inspect_bindings(
        &self,
    ) -> Result<BTreeMap<String, Value>, Vec<crate::syntax::Diagnostic>> {
        Ok(self
            .inner
            .pattern
            .inspect()?
            .bindings
            .into_iter()
            .filter_map(|binding| {
                self.inner
                    .bindings
                    .get(binding.slot)
                    .and_then(|value| value.clone())
                    .map(|value| (binding.name, value))
            })
            .collect())
    }
    /// Borrow the outstanding internal child call, which only the manager may fulfill.
    pub fn pending_child(&self) -> Option<&ChildCall> {
        self.inner.pending_child.as_ref()
    }
    /// Borrow the Host-supplied identity of this run.
    pub fn run_id(&self) -> &str {
        &self.inner.run_id
    }
    /// Borrow the current lifecycle status.
    pub fn status(&self) -> &Status {
        &self.inner.status
    }
    /// Borrow the outstanding external effect, including while paused.
    pub fn pending(&self) -> Option<&Effect> {
        self.inner.pending.as_ref()
    }
    /// Borrow exported bindings; outputs are populated only when the run completes.
    pub fn outputs(&self) -> &BTreeMap<String, Value> {
        &self.inner.outputs
    }
    /// Borrow accepted external receipts in execution order.
    pub fn ledger(&self) -> &[Receipt] {
        &self.inner.ledger
    }
    /// Borrow the identity of the executable revision pinned to this run.
    pub fn snapshot_id(&self) -> &str {
        self.inner.pattern.snapshot_id()
    }
}
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct Transition {
    pub state: RunState,
    pub effects: Vec<Effect>,
    pub traces: Vec<Trace>,
    pub actions: Vec<ManagerAction>,
}

/// Rebuild a versioned run from accepted history and compare every saved state field.
/// Rejects executable tampering or unreproducible state; replay performs no Host I/O.
fn restore(saved: SavedRun) -> Result<RunState, Error> {
    if saved.version != 4 {
        return Err(Error::InvalidSnapshot);
    }
    saved.pattern.verify().map_err(|_| Error::InvalidSnapshot)?;
    let compiled = saved.pattern.clone();
    let mut state = start_checked(
        compiled,
        saved.run_id.clone(),
        saved.inputs.clone(),
        saved.limits.clone(),
    )?
    .state;
    for accepted in &saved.history {
        state = match accepted {
            Accepted::StopLoop(effect_id) => {
                transition(
                    &state,
                    Event::StopLoop {
                        effect_id: effect_id.clone(),
                    },
                )?
                .state
            }
            Accepted::External(receipt) => {
                transition(&state, Event::Fulfill(receipt.clone()))?.state
            }
            Accepted::Child(result) => complete_child(&state, result.clone())?.state,
        };
    }
    if let Some(event) = match saved.status {
        Status::Paused => Some(Event::Pause),
        Status::Cancelled => Some(Event::Cancel),
        Status::Failed => Some(Event::Fail),
        _ => None,
    } {
        state = transition(&state, event)?.state;
    }
    if state.inner != saved {
        return Err(Error::InvalidSnapshot);
    }
    Ok(state)
}

/// Start a verified pattern with exact typed inputs and default collection limits.
///
/// # Errors
/// Returns invalid identity, input, executable, collection-limit, or evaluation errors.
pub fn start(
    pattern: CompiledPattern,
    run_id: String,
    inputs: BTreeMap<String, Value>,
) -> Result<Transition, Error> {
    start_with_limits(pattern, run_id, inputs, Limits::default())
}
/// Verify a compiled pattern and drive it to its first external or child boundary.
///
/// # Errors
/// Returns invalid identity, input, executable, configured-limit, or evaluation errors.
pub fn start_with_limits(
    pattern: CompiledPattern,
    run_id: String,
    inputs: BTreeMap<String, Value>,
    limits: Limits,
) -> Result<Transition, Error> {
    pattern.verify().map_err(|_| Error::InvalidSnapshot)?;
    start_checked(pattern, run_id, inputs, limits)
}
/// Initialize bindings and drive an already verified executable.
/// The caller must verify the compiled pattern before entering this internal path.
fn start_checked(
    pattern: CompiledPattern,
    run_id: String,
    inputs: BTreeMap<String, Value>,
    limits: Limits,
) -> Result<Transition, Error> {
    if pattern.nodes.iter().any(|node| match &node.instruction {
        Instruction::Collect(collection) => matches!(
            &collection.mode,
            CollectionMode::Open { max, .. } if *max > limits.max_collection_records
        ),
        _ => false,
    }) {
        return Err(Error::CollectionLimit);
    }
    if run_id.trim().is_empty() {
        return Err(Error::InvalidRunId);
    }
    if inputs.len() != pattern.inputs.len() {
        return Err(Error::InvalidInputs(
            "Supply exactly the declared inputs".into(),
        ));
    }
    let mut bindings = vec![None; pattern.binding_count];
    for input in &pattern.inputs {
        let value = inputs
            .get(&input.name)
            .filter(|v| v.is_valid() && v.value_type() == input.value_type)
            .ok_or_else(|| Error::InvalidInputs(input.name.clone()))?;
        bindings[input.id.0] = Some(value.clone());
    }
    let state = RunState {
        inner: SavedRun {
            version: 4,
            pattern,
            run_id,
            inputs,
            status: Status::Waiting,
            pc: 0,
            bindings,
            pending: None,
            pending_child: None,
            history: vec![],
            next_effect_sequence: 0,
            ledger: vec![],
            outputs: BTreeMap::new(),
            limits,
            collection: None,
            looping: None,
            refinement: None,
            realized: None,
        },
    };
    let mut result = Transition {
        state,
        effects: vec![],
        traces: vec![Trace::RunStarted],
        actions: vec![],
    };
    drive(&mut result)?;
    Ok(result)
}
/// Borrow a binding from the current record scope first, then the enclosing run.
/// An absent binding indicates invalid executable or saved state.
fn read_binding(state: &SavedRun, id: BindingId) -> Result<&Value, Error> {
    state
        .refinement
        .as_ref()
        .and_then(|frame| frame.locals.get(&id.0))
        .or_else(|| {
            state
                .looping
                .as_ref()
                .and_then(|frame| frame.locals.get(&id.0))
        })
        .or_else(|| state.collection.as_ref().and_then(|f| f.locals.get(&id.0)))
        .or_else(|| state.bindings.get(id.0).and_then(Option::as_ref))
        .ok_or(Error::InvalidSnapshot)
}
/// Clone a binding's selected field, rejecting missing bindings or invalid field paths.
fn field_value(state: &SavedRun, id: BindingId, field: &Option<Field>) -> Result<Value, Error> {
    read_binding(state, id)?
        .field_path(field.as_ref().map_or(&[], |f| f.0.as_slice()))
        .ok_or(Error::InvalidSnapshot)
}
/// Interpolate validated references into Markdown using user-facing value labels.
fn render(parts: &[Part], state: &SavedRun) -> Result<String, Error> {
    parts
        .iter()
        .map(|part| match part {
            Part::Realize { .. } => state.realized.clone().ok_or(Error::InvalidSnapshot),
            Part::Literal(s) => Ok(s.clone()),
            Part::Reference(id, field) => field_value(state, *id, field).map(|v| v.display()),
        })
        .collect()
}
/// Evaluate a typed expression against run bindings, preserving runtime error classification.
fn evaluate(expr: &Expr<(BindingId, Option<Field>)>, state: &SavedRun) -> Result<Value, Error> {
    expression::eval(expr, &|(id, field)| {
        field_value(state, *id, field).map_err(|e| e.to_string())
    })
    .map_err(Error::Expression)
}
/// Commit an immutable binding to its permitted scope and emit a binding trace.
/// Rejects duplicate assignments, missing slots, and collection scope leaks.
fn bind(result: &mut Transition, id: BindingId, value: Value) -> Result<(), Error> {
    if result.state.inner.refinement.is_some() {
        if !refinement::definition(&result.state.inner)?
            .locals
            .contains(&id)
        {
            return Err(Error::InvalidSnapshot);
        }
        if result
            .state
            .inner
            .refinement
            .as_mut()
            .unwrap()
            .locals
            .insert(id.0, value)
            .is_some()
        {
            return Err(Error::InvalidSnapshot);
        }
    } else if result.state.inner.looping.is_some() {
        if !looping::definition(&result.state.inner)?
            .locals
            .contains(&id)
        {
            return Err(Error::InvalidSnapshot);
        }
        if result
            .state
            .inner
            .looping
            .as_mut()
            .unwrap()
            .locals
            .insert(id.0, value)
            .is_some()
        {
            return Err(Error::InvalidSnapshot);
        }
    } else if result.state.inner.collection.is_some() {
        if !collection::definition(&result.state.inner)?
            .locals
            .contains(&id)
        {
            return Err(Error::InvalidSnapshot);
        }
        let frame = result.state.inner.collection.as_mut().unwrap();
        if frame.locals.contains_key(&id.0) {
            return Err(Error::InvalidSnapshot);
        }
        frame.locals.insert(id.0, value);
    } else {
        let slot = result
            .state
            .inner
            .bindings
            .get_mut(id.0)
            .ok_or(Error::InvalidSnapshot)?;
        if slot.is_some() {
            return Err(Error::InvalidSnapshot);
        }
        *slot = Some(value);
    }
    result.traces.push(Trace::BindingCommitted(id));
    Ok(())
}
/// Clone the current collection-body or top-level node; reject an invalid program counter.
fn current_node(state: &SavedRun) -> Result<Node, Error> {
    if let Some(frame) = &state.refinement {
        if matches!(
            frame.state.pending(),
            Some(crate::refine::Pending::Body { .. })
        ) {
            return refinement::definition(state)?
                .nodes
                .get(frame.pc)
                .cloned()
                .ok_or(Error::InvalidSnapshot);
        }
    }
    if let Some(frame) = &state.looping {
        return looping::definition(state)?
            .nodes
            .get(frame.pc)
            .cloned()
            .ok_or(Error::InvalidSnapshot);
    }
    if let Some(frame) = &state.collection {
        if let collection::Phase::Body { pc } = frame.phase {
            return collection::definition(state)?
                .nodes
                .get(pc)
                .cloned()
                .ok_or(Error::InvalidSnapshot);
        }
    }
    state
        .pattern
        .nodes
        .get(state.pc)
        .cloned()
        .ok_or(Error::InvalidSnapshot)
}
/// Advance the active instruction cursor; continuation input is not a body instruction.
fn advance_pc(state: &mut SavedRun) -> Result<(), Error> {
    state.realized = None;
    if let Some(frame) = &mut state.refinement {
        frame.pc += 1;
    } else if let Some(frame) = &mut state.looping {
        frame.pc += 1;
    } else if let Some(frame) = &mut state.collection {
        if let collection::Phase::Body { pc } = &mut frame.phase {
            *pc += 1;
        } else {
            return Err(Error::InvalidSnapshot);
        }
    } else {
        state.pc += 1;
    }
    Ok(())
}
/// Allocate an effect identity and append its request and provenance to the staged transition.
/// Rejects sequence overflow; emitting alone does not perform the Host action.
fn emit(result: &mut Transition, node: &Node, request: Request) -> Result<Effect, Error> {
    let state = &mut result.state.inner;
    let sequence = state.next_effect_sequence;
    state.next_effect_sequence = sequence.checked_add(1).ok_or(Error::CounterOverflow)?;
    // Length-prefixed run identity; sequence is not a source line or wall clock.
    let effect = Effect {
        effect_id: format!(
            "{}:{}:{}:{sequence}",
            state.run_id.len(),
            state.run_id,
            state.pattern.snapshot_id
        ),
        run_id: state.run_id.clone(),
        snapshot_id: state.pattern.snapshot_id.clone(),
        node_id: node.id,
        span: node.span.clone(),
        loop_context: state.looping.as_ref().map(|frame| LoopContext {
            node_id: frame.node_id,
            iteration: frame.iteration,
            max: frame.max,
        }),
        request,
        collection: state.collection.as_ref().map(|frame| CollectionProvenance {
            collection_node_id: frame.node_id,
            record_index: match frame.phase {
                collection::Phase::Body { .. } => Some(frame.completed.len()),
                collection::Phase::Continuation => None,
            },
        }),
    };
    result
        .traces
        .push(Trace::EffectRequested(effect.effect_id.clone()));
    result.effects.push(effect.clone());
    Ok(effect)
}
/// Execute pure instructions until a blocking effect, child call, or completion is reached.
/// Mutates only staged transition state and propagates validation or evaluation failures.
fn drive(result: &mut Transition) -> Result<(), Error> {
    loop {
        if refinement::pump(result)? {
            return Ok(());
        }
        looping::pump(result)?;
        if collection::pump(result)? {
            return Ok(());
        }
        let state = &result.state.inner;
        let node = current_node(state)?;
        result.traces.push(Trace::NodeEntered(node.id));
        if realization::request(result, &node)? {
            return Ok(());
        }
        let state = &result.state.inner;
        let request = match &node.instruction {
            Instruction::Realize { prompt, .. } => {
                let (specification, inputs) = semantic::wording(prompt, state)?;
                Request::Realize {
                    specification,
                    inputs,
                }
            }
            Instruction::Classify {
                input,
                definition,
                context,
                ..
            } => Request::Classify {
                definition: definition.clone(),
                input: evaluate(input, state)?,
                context: context
                    .iter()
                    .map(|(key, e)| Ok((key.clone(), evaluate(e, state)?)))
                    .collect::<Result<_, Error>>()?,
            },
            Instruction::Suggest {
                input,
                mode,
                criteria,
                ..
            } => {
                let (specification, inputs) = semantic::wording(criteria, state)?;
                Request::Suggest {
                    mode: mode.clone(),
                    specification,
                    inputs,
                    candidates: semantic::candidates(evaluate(input, state)?)?,
                }
            }
            Instruction::Yield(expression) => {
                let value = evaluate(expression, &result.state.inner)?;
                collection::yield_value(result, value)?;
                continue;
            }
            Instruction::Refine(body) => {
                refinement::begin(result, &node, body)?;
                continue;
            }
            Instruction::Propose(expression) => {
                let value = evaluate(expression, state)?;
                refinement::propose(result, value)?;
                continue;
            }
            Instruction::Loop(body) => {
                looping::begin(result, &node, body)?;
                continue;
            }
            Instruction::Repeat(expression) => {
                let next = evaluate(expression, state)?;
                looping::repeat(result, next)?;
                continue;
            }
            Instruction::Break => {
                looping::exit(result)?;
                continue;
            }
            Instruction::Use {
                dependency, inputs, ..
            } => {
                let inputs = inputs
                    .iter()
                    .map(|(key, expr)| Ok((key.clone(), evaluate(expr, state)?)))
                    .collect::<Result<_, Error>>()?;
                let sequence = result.state.inner.next_effect_sequence;
                let call = ChildCall {
                    call_id: format!(
                        "{}:{}:{}:child:{sequence}",
                        state.run_id.len(),
                        state.run_id,
                        state.pattern.snapshot_id
                    ),
                    parent_run_id: state.run_id.clone(),
                    dependency: dependency.clone(),
                    node_id: node.id,
                    inputs,
                };
                result.state.inner.next_effect_sequence =
                    sequence.checked_add(1).ok_or(Error::CounterOverflow)?;
                result
                    .traces
                    .push(Trace::ChildRequested(call.call_id.clone()));
                result.state.inner.pending_child = Some(call.clone());
                result.actions.push(ManagerAction::StartChild(call));
                return Ok(());
            }
            Instruction::Collect(c) => {
                collection::begin(result, &node, c)?;
                continue;
            }
            Instruction::Form { form, .. } => {
                Request::Form(form.clone().try_map(|parts| render(&parts, state))?)
            }
            Instruction::Ask { prompt, .. } => Request::Ask {
                prompt: render(prompt, state)?,
            },
            Instruction::Timer { prompt, timer, .. } => Request::Timer {
                prompt: render(prompt, state)?,
                timer: timer.clone(),
            },
            Instruction::Rate { prompt, rating, .. } => Request::Rate {
                prompt: render(prompt, state)?,
                rating: rating.clone(),
            },
            Instruction::Derive {
                binding,
                expression,
            } => {
                let value = evaluate(expression, state)?;
                bind(result, *binding, value)?;
                advance_pc(&mut result.state.inner)?;
                continue;
            }
            Instruction::Jump(to) => {
                result.state.inner.pc = to.0;
                continue;
            }
            Instruction::Branch { arms, otherwise } => {
                let mut selected = *otherwise;
                for (condition, to) in arms {
                    match evaluate(condition, state)? {
                        Value::Boolean(true) => {
                            selected = *to;
                            break;
                        }
                        Value::Boolean(false) => {}
                        _ => return Err(Error::InvalidSnapshot),
                    }
                }
                result.traces.push(Trace::BranchSelected {
                    from: node.id,
                    to: selected,
                });
                result.state.inner.pc = selected.0;
                continue;
            }
            Instruction::Match {
                subject,
                cases,
                otherwise,
            } => {
                let value = evaluate(subject, state)?;
                let selected = cases
                    .iter()
                    .find(|(case, _)| case.matches(&value))
                    .map_or(*otherwise, |(_, to)| *to);
                result.traces.push(Trace::BranchSelected {
                    from: node.id,
                    to: selected,
                });
                result.state.inner.pc = selected.0;
                continue;
            }
            Instruction::Generate {
                contract, prompt, ..
            } => Request::Generate {
                prompt: render(prompt, state)?,
                contract: contract.clone(),
            },
            Instruction::Turn { prompt, .. } => Request::Turn {
                prompt: render(prompt, state)?,
            },
            Instruction::Choose {
                options, prompt, ..
            } => Request::Choose {
                prompt: render(prompt, state)?,
                options: match options {
                    Options::Static(c) => c.clone(),
                    Options::Dynamic(source) => match evaluate(source, state)? {
                        Value::Choices(c) => c,
                        Value::List {
                            items,
                            element_type: Type::Choice,
                        } => selection::choice_list(items)?,
                        _ => return Err(Error::InvalidSnapshot),
                    },
                },
                collection_continuation: None,
            },
            Instruction::Select {
                options,
                selection,
                prompt,
                ..
            } => selection::request(options, selection, render(prompt, state)?, state)?,
            Instruction::Image { image, body } => Request::Image {
                markdown: render(body, state)?,
                image: image.clone(),
            },
            Instruction::Video { video, body } => Request::Video {
                markdown: render(body, state)?,
                video: video.clone(),
            },
            Instruction::Show { body } => Request::Show {
                markdown: render(body, state)?,
                view: None,
            },
            Instruction::ShowCollection { source, spec } => {
                let value = evaluate(source, state)?;
                let view = crate::show::resolve(spec, &value, node.span.clone());
                Request::Show {
                    markdown: view.text(),
                    view: Some(view),
                }
            }
            Instruction::End => {
                let state = &mut result.state.inner;
                state.outputs = state
                    .pattern
                    .outputs
                    .iter()
                    .map(|(name, id)| {
                        let value = state
                            .bindings
                            .get(id.0)
                            .and_then(Option::as_ref)
                            .ok_or(Error::InvalidSnapshot)?;
                        Ok((name.clone(), value.clone()))
                    })
                    .collect::<Result<_, Error>>()?;
                state.status = Status::Completed;
                result.traces.push(Trace::Completed);
                return Ok(());
            }
        };
        let blocking = !matches!(
            request,
            Request::Show { .. } | Request::Video { .. } | Request::Image { .. }
        );
        let effect = emit(result, &node, request)?;
        if blocking {
            result.state.inner.pending = Some(effect);
            return Ok(());
        }
        advance_pc(&mut result.state.inner)?;
    }
}

/// Apply an external event to a cloned run, validating result type and effect identity.
/// Identical accepted receipts are idempotent; retries reuse the pending effect identity.
///
/// # Errors
/// Rejects invalid lifecycle operations, stale/conflicting replies, contract violations,
/// and execution failures. The caller's run is unchanged on error.
pub fn transition(state: &RunState, event: Event) -> Result<Transition, Error> {
    if matches!(event, Event::Message { .. }) {
        return Err(Error::WrongEffect);
    }
    let mut result = Transition {
        state: state.clone(),
        effects: vec![],
        traces: vec![],
        actions: vec![],
    };
    if let Event::StopLoop { effect_id } = &event {
        if state
            .inner
            .history
            .iter()
            .any(|item| matches!(item, Accepted::StopLoop(id) if id == effect_id))
        {
            return Ok(result);
        }
        if !matches!(state.status(), Status::Waiting | Status::Paused) {
            return Err(Error::Terminal);
        }
        state
            .pending()
            .filter(|effect| effect.effect_id == *effect_id && effect.loop_context.is_some())
            .ok_or(Error::WrongEffect)?;
        let node = state
            .inner
            .looping
            .as_ref()
            .ok_or(Error::WrongEffect)?
            .node_id;
        result
            .state
            .inner
            .history
            .push(Accepted::StopLoop(effect_id.clone()));
        result.state.inner.pending = None;
        result.state.inner.status = Status::Waiting;
        looping::exit(&mut result)?;
        result.traces.push(Trace::LoopStopped(node));
        drive(&mut result)?;
        return Ok(result);
    }
    if matches!(
        event,
        Event::Pause | Event::Resume | Event::Cancel | Event::Fail
    ) {
        match (&state.inner.status, event) {
            (Status::Waiting, Event::Pause) => {
                result.state.inner.status = Status::Paused;
                result.traces.push(Trace::Paused);
            }
            (Status::Paused, Event::Pause)
            | (Status::Waiting, Event::Resume)
            | (Status::Cancelled, Event::Cancel)
            | (Status::Failed, Event::Fail) => {}
            (Status::Paused, Event::Resume) => {
                result.state.inner.status = Status::Waiting;
                result.traces.push(Trace::Resumed);
                if let Some(pending) = state.pending() {
                    result.effects.push(pending.clone());
                } else if state.pending_child().is_none() {
                    return Err(Error::InvalidSnapshot);
                }
            }
            (Status::Waiting | Status::Paused, Event::Cancel) => {
                result.state.inner.status = Status::Cancelled;
                result.state.inner.pending = None;
                result.state.inner.pending_child = None;
                result.state.inner.collection = None;
                result.state.inner.looping = None;
                result.state.inner.refinement = None;
                result.state.inner.realized = None;
                result.traces.push(Trace::Cancelled);
            }
            (Status::Waiting | Status::Paused, Event::Fail) => {
                result.state.inner.status = Status::Failed;
                result.state.inner.pending = None;
                result.state.inner.pending_child = None;
                result.state.inner.collection = None;
                result.state.inner.looping = None;
                result.state.inner.refinement = None;
                result.state.inner.realized = None;
                result.traces.push(Trace::Failed);
            }
            _ => return Err(Error::Terminal),
        }
        return Ok(result);
    }
    let mut receipt = match event {
        Event::Retry { effect_id } => {
            if state.status() == &Status::Paused {
                return Err(Error::Paused);
            }
            let effect = state
                .pending()
                .filter(|e| e.effect_id == effect_id)
                .ok_or(Error::WrongEffect)?;
            result.effects.push(effect.clone());
            return Ok(result);
        }
        Event::Fulfill(receipt) => receipt,
        _ => unreachable!(),
    };
    // A multi-selection is a set; receipt identity must not depend on click order.
    if let Fulfillment::SelectedMany(keys) = &mut receipt.result {
        keys.sort();
    }
    if let Some(old) = state
        .ledger()
        .iter()
        .find(|r| r.effect_id == receipt.effect_id)
    {
        return if old == &receipt {
            Ok(result)
        } else {
            Err(Error::ConflictingDuplicate)
        };
    }
    if state.status() == &Status::Completed {
        return Err(Error::AlreadyCompleted);
    }
    if state.status() == &Status::Paused {
        return Err(Error::Paused);
    }
    if matches!(state.status(), Status::Cancelled | Status::Failed) {
        return Err(Error::Terminal);
    }
    let pending = state
        .pending()
        .filter(|e| e.effect_id == receipt.effect_id)
        .ok_or(Error::WrongEffect)?;
    let inner = &state.inner;
    let node = current_node(inner)?;
    if matches!(pending.request, Request::Refine { .. }) {
        refinement::answer(&mut result, receipt)?;
        drive(&mut result)?;
        return Ok(result);
    }
    if matches!(pending.request, Request::Realize { .. })
        && !matches!(node.instruction, Instruction::Realize { .. })
    {
        realization::accept(&mut result, receipt)?;
        drive(&mut result)?;
        return Ok(result);
    }
    if inner
        .collection
        .as_ref()
        .is_some_and(|f| f.phase == collection::Phase::Continuation)
    {
        let Fulfillment::Selected(choice) = &receipt.result else {
            return Err(Error::WrongResult);
        };
        if !matches!(choice.as_str(), "add" | "finish") {
            return Err(Error::UnknownChoice);
        }
        let choice = choice.clone();
        result
            .traces
            .push(Trace::EffectFulfilled(receipt.effect_id.clone()));
        result
            .state
            .inner
            .history
            .push(Accepted::External(receipt.clone()));
        result.state.inner.ledger.push(receipt);
        result.state.inner.pending = None;
        collection::answer(&mut result, &choice)?;
        drive(&mut result)?;
        return Ok(result);
    }
    let (binding, value) = match (&node.instruction, &pending.request, &receipt.result) {
        (Instruction::Form { binding, form }, Request::Form(_), Fulfillment::Form(answer)) => {
            (Some(*binding), form::answer(form, answer)?)
        }
        (
            Instruction::Timer { binding, timer, .. },
            Request::Timer { .. },
            Fulfillment::Timer(answer),
        ) => (Some(*binding), timer::answer(timer, answer)?),
        (
            Instruction::Realize { binding, .. },
            Request::Realize { .. },
            Fulfillment::Realized(text),
        ) => {
            if text.trim().is_empty() || text.len() > 32_000 {
                return Err(Error::ContractViolation);
            }
            (Some(*binding), Value::Text(text.clone()))
        }
        (
            Instruction::Classify {
                binding,
                definition,
                ..
            },
            Request::Classify { .. },
            Fulfillment::Classified(variant),
        ) => {
            if !definition.output.variants.contains(variant) {
                return Err(Error::ContractViolation);
            }
            (Some(*binding), definition.output.value(variant.clone()))
        }
        (
            Instruction::Suggest {
                binding,
                mode,
                element,
                ..
            },
            Request::Suggest { candidates, .. },
            Fulfillment::Suggested(suggestion),
        ) => (
            Some(*binding),
            semantic::accept(mode, element, candidates, suggestion)?,
        ),
        (Instruction::Ask { binding, .. }, Request::Ask { .. }, Fulfillment::Text(text)) => {
            (Some(*binding), Value::Text(text.clone()))
        }
        (
            Instruction::Rate {
                binding, rating, ..
            },
            Request::Rate { .. },
            Fulfillment::Rating(number),
        ) => {
            if !number.is_finite() || *number < rating.min || *number > rating.max {
                return Err(Error::ContractViolation);
            }
            (Some(*binding), Value::Number(*number))
        }
        (
            Instruction::Generate {
                binding, contract, ..
            },
            Request::Generate { .. },
            Fulfillment::Generated(value),
        ) => {
            if !contract.accepts(value) {
                return Err(Error::ContractViolation);
            }
            (Some(*binding), value.clone())
        }
        (Instruction::Turn { binding, .. }, Request::Turn { .. }, Fulfillment::Turn(text)) => {
            (*binding, Value::Text(text.clone()))
        }
        (
            Instruction::Choose { binding, .. },
            Request::Choose { options, .. },
            Fulfillment::Selected(key),
        ) => {
            let choice = options
                .iter()
                .find(|c| &c.value == key)
                .ok_or(Error::UnknownChoice)?;
            (Some(*binding), Value::Choice(choice.clone()))
        }
        (
            Instruction::Select {
                binding,
                options,
                selection,
                ..
            },
            Request::Select {
                options: offered,
                min,
                max,
                ..
            },
            answer,
        ) => (
            Some(*binding),
            selection::answer(options, selection, offered, *min..=*max, answer, inner)?,
        ),
        _ => return Err(Error::WrongResult),
    };
    if let Some(id) = binding {
        bind(&mut result, id, value.clone())?;
    }
    result
        .traces
        .push(Trace::EffectFulfilled(receipt.effect_id.clone()));
    result
        .state
        .inner
        .history
        .push(Accepted::External(receipt.clone()));
    result.state.inner.ledger.push(receipt);
    result.state.inner.pending = None;
    if matches!(node.instruction, Instruction::Turn { .. }) {
        debug_assert_eq!(value.value_type(), Type::Text);
        emit(
            &mut result,
            &node,
            Request::Show {
                markdown: value.display(),
                view: None,
            },
        )?;
    }
    advance_pc(&mut result.state.inner)?;
    drive(&mut result)?;
    Ok(result)
}

/// Only the Run Manager may deliver child results; this is not a Host fulfillment.
pub(crate) fn complete_child(state: &RunState, receipt: ChildResult) -> Result<Transition, Error> {
    let mut result = Transition {
        state: state.clone(),
        effects: vec![],
        traces: vec![],
        actions: vec![],
    };
    if let Some(previous) = state
        .inner
        .history
        .iter()
        .find_map(|accepted| match accepted {
            Accepted::Child(previous) if previous.call_id == receipt.call_id => Some(previous),
            _ => None,
        })
    {
        return if previous == &receipt {
            Ok(result)
        } else {
            Err(Error::ConflictingDuplicate)
        };
    }
    if state.status() == &Status::Paused {
        return Err(Error::Paused);
    }
    if state.status() != &Status::Waiting {
        return Err(Error::Terminal);
    }
    state
        .pending_child()
        .filter(|c| c.call_id == receipt.call_id)
        .ok_or(Error::WrongEffect)?;
    let node = current_node(&state.inner)?;
    let Instruction::Use {
        binding, outputs, ..
    } = node.instruction
    else {
        return Err(Error::InvalidSnapshot);
    };
    let value = Value::Record(receipt.outputs.clone());
    if !value.is_valid() || value.value_type() != Type::Record(outputs) {
        return Err(Error::ContractViolation);
    }
    bind(&mut result, binding, value)?;
    result.state.inner.pending_child = None;
    result
        .traces
        .push(Trace::ChildCompleted(receipt.call_id.clone()));
    result.state.inner.history.push(Accepted::Child(receipt));
    advance_pc(&mut result.state.inner)?;
    drive(&mut result)?;
    Ok(result)
}
