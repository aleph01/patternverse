//! Bounded, replayable side conversations. The original pending effect is never rewritten.
use super::*;
use crate::{
    compiler::CompiledPattern,
    runtime::{Fulfillment, Receipt, Request},
};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub(super) struct Interruption {
    pub handler_run: String,
    pub target_run: String,
    message_id: String,
    receipt: Receipt,
}

/// Find the nearest enclosing pattern's hook, allowing local flows to inherit their caller's hook.
pub(super) fn handler<'a>(state: &'a RunManager, id: &str) -> Option<&'a CompiledPattern> {
    let mut run = state.inner.runs.get(id)?;
    loop {
        let pattern = state.inner.snapshot.get(run.state.snapshot_id())?;
        if let Some(name) = &pattern.message_handler {
            return pattern.flows.get(name);
        }
        run = state.inner.runs.get(&run.parent.as_ref()?.run_id)?;
    }
}

/// Start one isolated handler for a current text question. Repeated message IDs are idempotent.
pub(super) fn message(state: &RunManager, command: Command) -> Result<Transition, Error> {
    let Event::Message {
        effect_id,
        message_id,
        text,
    } = &command.event
    else {
        return Err(Error::InvalidTree);
    };
    let mut result = Transition {
        state: state.clone(),
        effects: vec![],
        traces: vec![],
    };
    if let Some(old) = state
        .inner
        .accepted
        .iter()
        .find(|c| matches!(&c.event, Event::Message { message_id: id, .. } if id == message_id))
    {
        return if old == &command {
            Ok(result)
        } else {
            Err(runtime::Error::ConflictingDuplicate.into())
        };
    }
    if message_id.is_empty()
        || message_id.len() > 128
        || text.trim().is_empty()
        || text.len() > 64 * 1024
    {
        return Err(runtime::Error::WrongResult.into());
    }
    if state.inner.interruption.is_some() {
        return Err(runtime::Error::WrongEffect.into());
    }
    let pending = state
        .pending()
        .filter(|e| e.effect_id == *effect_id && e.run_id == command.run_id)
        .ok_or(runtime::Error::WrongEffect)?;
    if state.root().status() != &Status::Waiting
        || state.inner.runs[&command.run_id].state.status() != &Status::Waiting
    {
        return Err(runtime::Error::Paused.into());
    }
    let Request::Ask { prompt } = &pending.request else {
        return Err(runtime::Error::WrongEffect.into());
    };
    let compiled = handler(state, &command.run_id)
        .ok_or(runtime::Error::WrongEffect)?
        .clone();
    if state.inner.runs.len() >= state.inner.limits.max_runs
        || depth(state, &command.run_id)? >= state.inner.limits.max_depth
    {
        return Err(Error::RunLimit);
    }
    let id = format!(
        "{}-event-{}",
        state.inner.root_id,
        state.inner.accepted.len()
    );
    if state.inner.runs.contains_key(&id) {
        return Err(Error::InvalidTree);
    }
    let turn = runtime::start_with_limits(
        compiled,
        id.clone(),
        BTreeMap::from([
            ("message".into(), Value::Text(text.clone())),
            ("prompt".into(), Value::Text(prompt.clone())),
        ]),
        state.inner.limits.runtime.clone(),
    )?;
    // A durable display-only event preserves the participant's side question in replayed chat.
    let mut shown = pending.clone();
    shown.effect_id = format!("{id}:message");
    shown.request = Request::Show {
        view: None,
        markdown: format!("You · {text}"),
    };
    result.effects.push(shown);
    result.state.inner.interruption = Some(Interruption {
        handler_run: id.clone(),
        target_run: command.run_id.clone(),
        message_id: message_id.clone(),
        receipt: Receipt {
            effect_id: effect_id.clone(),
            result: Fulfillment::Text(text.clone()),
        },
    });
    result.state.inner.runs.insert(
        id.clone(),
        ManagedRun {
            parent: Some(ParentLink {
                run_id: command.run_id.clone(),
                call_id: id.clone(),
            }),
            state: turn.state.clone(),
        },
    );
    settle(&mut result, id, turn)?;
    finish(&mut result)?;
    result.state.inner.accepted.push(command);
    Ok(result)
}

/// Commit pass-through only after a valid completed handler; handled leaves the question intact.
pub(super) fn finish(result: &mut Transition) -> Result<(), Error> {
    let Some(frame) = result.state.inner.interruption.clone() else {
        return Ok(());
    };
    let handler = &result.state.inner.runs[&frame.handler_run].state;
    if handler.status() != &Status::Completed {
        return Ok(());
    }
    let disposition = handler.outputs().get("disposition");
    let pass = match disposition {
        Some(Value::Text(value) | Value::Enum { variant: value, .. }) if value == "pass" => true,
        Some(Value::Text(value) | Value::Enum { variant: value, .. }) if value == "handled" => {
            false
        }
        _ => return Err(runtime::Error::WrongResult.into()),
    };
    result.state.inner.interruption = None;
    if pass {
        let turn = runtime::transition(
            &result.state.inner.runs[&frame.target_run].state,
            Event::Fulfill(frame.receipt.clone()),
        )?;
        result
            .state
            .inner
            .delivered_messages
            .insert(frame.message_id, frame.receipt);
        settle(result, frame.target_run, turn)?;
    }
    Ok(())
}

/// Stop an interrupting subtree before honoring the original loop's explicit stop control.
pub(super) fn stop_handler(result: &mut Transition) -> Result<(), Error> {
    let Some(frame) = result.state.inner.interruption.take() else {
        return Ok(());
    };
    let ids: Vec<_> = result
        .state
        .inner
        .runs
        .iter()
        .filter(|(id, run)| {
            is_descendant(&result.state, id, &frame.handler_run) && active(run.state.status())
        })
        .map(|(id, _)| id.clone())
        .collect();
    for id in ids {
        let turn = runtime::transition(&result.state.inner.runs[&id].state, Event::Cancel)?;
        settle(result, id, turn)?;
    }
    Ok(())
}
