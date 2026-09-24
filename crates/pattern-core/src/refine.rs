//! Participant-controlled refinement of a text candidate.
//!
//! All nondeterminism arrives through events. `ExecuteBody` is an internal Runtime
//! action, NOT an AI request or Host effect. Only the compiled body can produce
//! `BodyCompleted`; the future Run runtime must validate its bindings first.
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Config {
    pub rounds: u32,
    pub renewable: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Status {
    Waiting,
    Paused,
    Completed,
    Cancelled,
    Failed,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Outcome {
    Accepted,
    Unresolved,
    LimitReached,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ResultValue {
    pub value: String,
    pub outcome: Outcome,
    pub rounds: u64,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Decision {
    Accept,
    Revise,
    Continue,
    Finish,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Actor {
    Participant,
    Agent,
}

/// The renderer may choose buttons or an accessible conversational confirmation.
/// A model's inferred intent alone is never a Participant fulfillment.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Review {
    pub effect_id: String,
    pub candidate: String,
    pub choices: Vec<Decision>,
    pub at_checkpoint: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Pending {
    Review { id: String },
    Body { id: String },
}

impl Pending {
    /// Borrow the identity of the outstanding review or body invocation.
    fn id(&self) -> &str {
        match self {
            Self::Review { id } | Self::Body { id } => id,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Receipt {
    Edit { id: String, value: String },
    Review { id: String, decision: Decision },
    Body { id: String, value: String },
}

impl Receipt {
    /// Borrow the invocation identity used to detect duplicate accepted results.
    fn id(&self) -> &str {
        match self {
            Self::Review { id, .. } | Self::Body { id, .. } | Self::Edit { id, .. } => id,
        }
    }
}

/// Accepted results are separate from traces. The Run Manager will persist this
/// ledger atomically with frame state and use it for crash recovery/replay.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct State {
    run_id: String,
    node_id: String,
    config: Config,
    candidate: String,
    rounds: u64,
    remaining: u32,
    sequence: u64,
    status: Status,
    pending: Option<Pending>,
    result: Option<ResultValue>,
    ledger: Vec<Receipt>,
}

impl State {
    /// Borrow the current refinement lifecycle status.
    pub fn status(&self) -> &Status {
        &self.status
    }
    /// Borrow the latest candidate, whether or not the participant has accepted it.
    pub fn candidate(&self) -> &str {
        &self.candidate
    }
    /// Borrow the outstanding operation; paused operations retain their identity.
    pub fn pending(&self) -> Option<&Pending> {
        self.pending.as_ref()
    }
    /// Borrow the final candidate and outcome after completion.
    pub fn result(&self) -> Option<&ResultValue> {
        self.result.as_ref()
    }
    /// Borrow accepted receipts in order; rejected events are never recorded.
    pub fn ledger(&self) -> &[Receipt] {
        &self.ledger
    }
    /// Allocate an unambiguous length-prefixed operation identity; reject sequence overflow.
    fn next_id(&mut self) -> Result<String, Error> {
        let sequence = self.sequence;
        self.sequence = sequence.checked_add(1).ok_or(Error::CounterOverflow)?;
        // Length-prefixed identities cannot collide when user IDs contain ':'.
        Ok(format!(
            "{}:{}:{}:{}:{}",
            self.run_id.len(),
            self.run_id,
            self.node_id.len(),
            self.node_id,
            sequence
        ))
    }
    /// Schedule a new review identity, propagating sequence-overflow errors.
    fn review(&mut self) -> Result<(), Error> {
        self.pending = Some(Pending::Review {
            id: self.next_id()?,
        });
        Ok(())
    }
    /// Freeze the current candidate and outcome, clear pending work, and mark completion.
    fn complete(&mut self, outcome: Outcome) {
        self.result = Some(ResultValue {
            value: self.candidate.clone(),
            outcome,
            rounds: self.rounds,
        });
        self.pending = None;
        self.status = Status::Completed;
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum Event {
    Edited {
        effect_id: String,
        value: String,
        actor: Actor,
    },
    ReviewAnswered {
        effect_id: String,
        decision: Decision,
        actor: Actor,
    },
    BodyCompleted {
        invocation_id: String,
        value: Value,
    },
    Retry {
        pending_id: String,
    },
    Pause,
    Resume,
    Cancel,
    Fail,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Action {
    /// Runtime evaluates the compiled body in a fresh iteration scope, binding
    /// the :as alias to current and exposing only permitted outer bindings.
    ExecuteBody {
        invocation_id: String,
        current: String,
    },
    SuspendBody {
        invocation_id: String,
    },
    ResumeBody {
        invocation_id: String,
    },
    CancelBody {
        invocation_id: String,
    },
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Trace {
    CandidateEdited,
    ReviewRequested,
    ReviewAccepted,
    BudgetRenewed,
    IterationCompleted,
    Paused,
    Resumed,
    Completed,
    Cancelled,
    Failed,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Transition {
    pub state: State,
    pub reviews: Vec<Review>,
    pub actions: Vec<Action>,
    pub traces: Vec<Trace>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Error {
    InvalidConfiguration,
    InvalidState,
    WrongOperation,
    WrongPhase,
    ParticipantRequired,
    DecisionUnavailable,
    InvalidCandidate,
    ConflictingDuplicate,
    CounterOverflow,
}

/// Wrap a state in an initially empty transition without producing effects.
fn output(state: State) -> Transition {
    Transition {
        state,
        reviews: vec![],
        actions: vec![],
        traces: vec![],
    }
}

/// Project the pending review with choices permitted by its remaining round budget.
fn emit_review(out: &mut Transition) {
    if let Some(Pending::Review { id }) = &out.state.pending {
        let mut choices = vec![Decision::Accept];
        if out.state.remaining > 0 {
            choices.push(Decision::Revise);
        } else if out.state.config.renewable {
            choices.push(Decision::Continue);
        }
        choices.push(Decision::Finish);
        out.reviews.push(Review {
            effect_id: id.clone(),
            candidate: out.state.candidate.clone(),
            choices,
            at_checkpoint: out.state.remaining == 0,
        });
    }
}

/// Create a refinement frame and request participant review of the initial candidate.
///
/// # Errors
/// Rejects empty identities, a zero round budget, or operation-counter overflow.
pub fn start(
    run_id: String,
    node_id: String,
    initial: String,
    config: Config,
) -> Result<Transition, Error> {
    if config.rounds == 0 || run_id.is_empty() || node_id.is_empty() {
        return Err(Error::InvalidConfiguration);
    }
    let mut state = State {
        run_id,
        node_id,
        candidate: initial,
        remaining: config.rounds,
        config,
        rounds: 0,
        sequence: 0,
        status: Status::Waiting,
        pending: None,
        result: None,
        ledger: vec![],
    };
    state.review()?;
    let mut out = output(state);
    emit_review(&mut out);
    out.traces.push(Trace::ReviewRequested);
    Ok(out)
}

/// Pure transition: errors leave the caller's snapshot unchanged. Snapshots in
/// this development slice are trusted; production restore validation belongs
/// at the versioned Run Manager boundary, not arbitrary Serde deserialization.
/// # Errors
/// Rejects stale or conflicting replies, nonparticipant decisions, invalid phases or values,
/// and exhausted counters. No effects or state changes are committed on rejection.
pub fn transition(state: &State, event: Event) -> Result<Transition, Error> {
    let receipt = match &event {
        Event::Edited {
            effect_id,
            value,
            actor,
        } => {
            if *actor != Actor::Participant {
                return Err(Error::ParticipantRequired);
            }
            if value.trim().is_empty() || value.len() > 32_000 {
                return Err(Error::InvalidCandidate);
            }
            Some(Receipt::Edit {
                id: effect_id.clone(),
                value: value.clone(),
            })
        }
        Event::ReviewAnswered {
            effect_id,
            decision,
            actor,
        } => {
            if *actor != Actor::Participant {
                return Err(Error::ParticipantRequired);
            }
            Some(Receipt::Review {
                id: effect_id.clone(),
                decision: decision.clone(),
            })
        }
        Event::BodyCompleted {
            invocation_id,
            value,
        } => Some(Receipt::Body {
            id: invocation_id.clone(),
            value: value.as_str().ok_or(Error::InvalidCandidate)?.to_owned(),
        }),
        _ => None,
    };
    if let Some(candidate) = &receipt {
        if let Some(accepted) = state.ledger.iter().find(|r| r.id() == candidate.id()) {
            return if accepted == candidate {
                Ok(output(state.clone()))
            } else {
                Err(Error::ConflictingDuplicate)
            };
        }
    }
    let terminal = matches!(
        state.status,
        Status::Completed | Status::Cancelled | Status::Failed
    );
    if terminal {
        return Err(Error::InvalidState);
    }
    let mut out = output(state.clone());
    match event {
        Event::Edited {
            effect_id, value, ..
        } => {
            if state.status != Status::Waiting {
                return Err(Error::InvalidState);
            }
            let Some(Pending::Review { id }) = &state.pending else {
                return Err(Error::WrongPhase);
            };
            if *id != effect_id {
                return Err(Error::WrongOperation);
            }
            out.state.candidate = value;
            out.state.review()?;
            emit_review(&mut out);
            out.traces
                .extend([Trace::CandidateEdited, Trace::ReviewRequested]);
        }
        Event::Cancel | Event::Fail => {
            if let Some(Pending::Body { id }) = &state.pending {
                out.actions.push(Action::CancelBody {
                    invocation_id: id.clone(),
                });
            }
            let cancelled = event == Event::Cancel;
            out.state.status = if cancelled {
                Status::Cancelled
            } else {
                Status::Failed
            };
            out.state.pending = None;
            out.traces.push(if cancelled {
                Trace::Cancelled
            } else {
                Trace::Failed
            });
        }
        Event::Pause => {
            if state.status != Status::Waiting {
                return Err(Error::InvalidState);
            }
            out.state.status = Status::Paused;
            if let Some(Pending::Body { id }) = &state.pending {
                out.actions.push(Action::SuspendBody {
                    invocation_id: id.clone(),
                });
            }
            out.traces.push(Trace::Paused);
        }
        Event::Resume => {
            if state.status != Status::Paused {
                return Err(Error::InvalidState);
            }
            out.state.status = Status::Waiting;
            emit_review(&mut out);
            if let Some(Pending::Body { id }) = &state.pending {
                out.actions.push(Action::ResumeBody {
                    invocation_id: id.clone(),
                });
            }
            out.traces.push(Trace::Resumed);
        }
        Event::Retry { pending_id } => {
            if state.status != Status::Waiting {
                return Err(Error::InvalidState);
            }
            if state.pending.as_ref().map(Pending::id) != Some(pending_id.as_str()) {
                return Err(Error::WrongOperation);
            }
            emit_review(&mut out);
            if let Some(Pending::Body { id }) = &state.pending {
                // Resume the existing body frame; never start the accepted work again.
                out.actions.push(Action::ResumeBody {
                    invocation_id: id.clone(),
                });
            }
        }
        Event::ReviewAnswered {
            effect_id,
            decision,
            ..
        } => {
            if state.status != Status::Waiting {
                return Err(Error::InvalidState);
            }
            let Some(Pending::Review { id }) = &state.pending else {
                return Err(Error::WrongPhase);
            };
            if *id != effect_id {
                return Err(Error::WrongOperation);
            }
            match decision {
                Decision::Accept => out.state.complete(Outcome::Accepted),
                Decision::Finish => {
                    out.state
                        .complete(if state.remaining == 0 && !state.config.renewable {
                            Outcome::LimitReached
                        } else {
                            Outcome::Unresolved
                        })
                }
                Decision::Revise | Decision::Continue => {
                    if decision == Decision::Continue {
                        if state.remaining != 0 || !state.config.renewable {
                            return Err(Error::DecisionUnavailable);
                        }
                        out.state.remaining = state.config.rounds;
                        out.traces.push(Trace::BudgetRenewed);
                    } else if state.remaining == 0 {
                        return Err(Error::DecisionUnavailable);
                    }
                    let id = out.state.next_id()?;
                    out.state.pending = Some(Pending::Body { id: id.clone() });
                    out.actions.push(Action::ExecuteBody {
                        invocation_id: id,
                        current: state.candidate.clone(),
                    });
                }
            }
            out.traces.push(Trace::ReviewAccepted);
            if out.state.status == Status::Completed {
                out.traces.push(Trace::Completed);
            }
        }
        Event::BodyCompleted {
            invocation_id,
            value,
        } => {
            if state.status != Status::Waiting {
                return Err(Error::InvalidState);
            }
            let Some(Pending::Body { id }) = &state.pending else {
                return Err(Error::WrongPhase);
            };
            if *id != invocation_id {
                return Err(Error::WrongOperation);
            }
            out.state.candidate = value.as_str().ok_or(Error::InvalidCandidate)?.to_owned();
            out.state.remaining = state.remaining.checked_sub(1).ok_or(Error::InvalidState)?;
            out.state.rounds = state.rounds.checked_add(1).ok_or(Error::CounterOverflow)?;
            out.state.review()?;
            emit_review(&mut out);
            out.traces
                .extend([Trace::IterationCompleted, Trace::ReviewRequested]);
        }
    }
    if let Some(receipt) = receipt {
        out.state.ledger.push(receipt);
    }
    Ok(out)
}
