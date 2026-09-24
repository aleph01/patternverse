//! Adapter between compiled refinement bodies and the participant-review state machine.
use super::*;
use crate::{compiler::Refinement, refine};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub(super) struct Frame {
    pub state: refine::State,
    pub pc: usize,
    pub locals: BTreeMap<usize, Value>,
    review: Option<refine::Review>,
}

/// Borrow the pinned instruction at the enclosing cursor.
pub(super) fn definition(state: &SavedRun) -> Result<&Refinement, Error> {
    match &state
        .pattern
        .nodes
        .get(state.pc)
        .ok_or(Error::InvalidSnapshot)?
        .instruction
    {
        Instruction::Refine(body) => Ok(body),
        _ => Err(Error::InvalidSnapshot),
    }
}

/// Evaluate the initial text once and stage its first review without running the body.
pub(super) fn begin(result: &mut Transition, node: &Node, body: &Refinement) -> Result<(), Error> {
    if result.state.inner.refinement.is_some()
        || result.state.inner.looping.is_some()
        || result.state.inner.collection.is_some()
    {
        return Err(Error::InvalidSnapshot);
    }
    let Value::Text(initial) = evaluate(&body.initial, &result.state.inner)? else {
        return Err(Error::InvalidSnapshot);
    };
    let next = refine::start(
        result.state.inner.run_id.clone(),
        node.id.0.to_string(),
        initial,
        body.config.clone(),
    )
    .map_err(|_| Error::InvalidSnapshot)?;
    apply(result, next)
}

/// Replace the frame after a validated transition, allocating fresh locals for every body.
fn apply(result: &mut Transition, next: refine::Transition) -> Result<(), Error> {
    let body = definition(&result.state.inner)?;
    if let Some(done) = next.state.result() {
        let binding = body.binding;
        let outcome = match done.outcome {
            refine::Outcome::Accepted => "accepted",
            refine::Outcome::Unresolved => "unresolved",
            refine::Outcome::LimitReached => "limit_reached",
        };
        let value = Value::Record(BTreeMap::from([
            ("value".into(), Value::Text(done.value.clone())),
            (
                "outcome".into(),
                Value::Choice(Choice {
                    value: outcome.into(),
                    label: outcome.into(),
                }),
            ),
            ("rounds".into(), Value::Number(done.rounds as f64)),
        ]));
        result.state.inner.refinement = None;
        bind(result, binding, value)?;
        advance_pc(&mut result.state.inner)?;
    } else {
        let locals = if matches!(next.state.pending(), Some(refine::Pending::Body { .. })) {
            BTreeMap::from([(body.alias.0, Value::Text(next.state.candidate().into()))])
        } else {
            BTreeMap::new()
        };
        result.state.inner.refinement = Some(Frame {
            state: next.state,
            pc: 0,
            locals,
            review: next.reviews.into_iter().next(),
        });
        result.state.inner.realized = None;
    }
    Ok(())
}

/// Emit only participant-review requests; never infer acceptance from generated text.
pub(super) fn pump(result: &mut Transition) -> Result<bool, Error> {
    let Some(frame) = &result.state.inner.refinement else {
        return Ok(false);
    };
    if let Some(review) = &frame.review {
        let review = review.clone();
        let node = current_node(&result.state.inner)?;
        let effect = emit(result, &node, Request::Refine { review })?;
        result.state.inner.pending = Some(effect);
        return Ok(true);
    }
    Ok(false)
}

/// Accept a participant decision or direct edit with the outer effect's durable receipt.
pub(super) fn answer(result: &mut Transition, receipt: Receipt) -> Result<(), Error> {
    let frame = result
        .state
        .inner
        .refinement
        .as_ref()
        .ok_or(Error::InvalidSnapshot)?;
    let effect_id = frame
        .review
        .as_ref()
        .ok_or(Error::InvalidSnapshot)?
        .effect_id
        .clone();
    let event = match &receipt.result {
        Fulfillment::Reviewed(decision) => refine::Event::ReviewAnswered {
            effect_id,
            decision: decision.clone(),
            actor: refine::Actor::Participant,
        },
        Fulfillment::Edited(value) => refine::Event::Edited {
            effect_id,
            value: value.clone(),
            actor: refine::Actor::Participant,
        },
        _ => return Err(Error::WrongResult),
    };
    let next = refine::transition(&frame.state, event).map_err(|_| Error::ContractViolation)?;
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
    apply(result, next)
}

/// Deliver the body's final text proposal and return to review with a new effect identity.
pub(super) fn propose(result: &mut Transition, value: Value) -> Result<(), Error> {
    let Value::Text(value) = value else {
        return Err(Error::InvalidSnapshot);
    };
    let frame = result
        .state
        .inner
        .refinement
        .as_ref()
        .ok_or(Error::InvalidSnapshot)?;
    let Some(refine::Pending::Body { id }) = frame.state.pending() else {
        return Err(Error::InvalidSnapshot);
    };
    let next = refine::transition(
        &frame.state,
        refine::Event::BodyCompleted {
            invocation_id: id.clone(),
            value: serde_json::Value::String(value),
        },
    )
    .map_err(|_| Error::ContractViolation)?;
    apply(result, next)
}
