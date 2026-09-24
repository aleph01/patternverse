//! Cancellable iteration frames. Each pass has fresh, single-assignment local bindings.
use super::*;
use crate::compiler::Loop;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub(super) struct LoopFrame {
    pub node_id: NodeId,
    pub pc: usize,
    pub iteration: usize,
    pub max: Option<usize>,
    pub locals: BTreeMap<usize, Value>,
}

/// Borrow the loop instruction owned by the enclosing cursor.
pub(super) fn definition(state: &SavedRun) -> Result<&Loop, Error> {
    match &state
        .pattern
        .nodes
        .get(state.pc)
        .ok_or(Error::InvalidSnapshot)?
        .instruction
    {
        Instruction::Loop(body) => Ok(body),
        _ => Err(Error::InvalidSnapshot),
    }
}

/// Evaluate the initial state once; a zero limit performs no iterations.
pub(super) fn begin(result: &mut Transition, node: &Node, body: &Loop) -> Result<(), Error> {
    if result.state.inner.looping.is_some() || result.state.inner.collection.is_some() {
        return Err(Error::InvalidSnapshot);
    }
    if body.max == Some(0) {
        result.state.inner.pc += 1;
        return Ok(());
    }
    let initial = evaluate(&body.initial, &result.state.inner)?;
    result.state.inner.looping = Some(LoopFrame {
        node_id: node.id,
        pc: 0,
        iteration: 1,
        max: body.max,
        locals: BTreeMap::from([(body.binding.0, initial)]),
    });
    result.traces.push(Trace::LoopStarted(node.id));
    Ok(())
}

/// Exit normally on fallthrough; no local values escape into enclosing scope.
pub(super) fn pump(result: &mut Transition) -> Result<(), Error> {
    if let Some(frame) = &result.state.inner.looping {
        let count = definition(&result.state.inner)?.nodes.len();
        if frame.pc > count {
            return Err(Error::InvalidSnapshot);
        }
        if frame.pc == count {
            exit(result)?;
        }
    }
    Ok(())
}

/// Discard the iteration scope and resume immediately after the loop.
pub(super) fn exit(result: &mut Transition) -> Result<(), Error> {
    let frame = result
        .state
        .inner
        .looping
        .take()
        .ok_or(Error::InvalidSnapshot)?;
    result.state.inner.realized = None;
    result.state.inner.pc += 1;
    result.traces.push(Trace::LoopExited(frame.node_id));
    Ok(())
}

/// Pass the next state to a fresh scope, or exit normally at the authored maximum.
pub(super) fn repeat(result: &mut Transition, next: Value) -> Result<(), Error> {
    let binding = definition(&result.state.inner)?.binding;
    let frame = result
        .state
        .inner
        .looping
        .as_mut()
        .ok_or(Error::InvalidSnapshot)?;
    if frame.max.is_some_and(|max| frame.iteration >= max) {
        return exit(result);
    }
    frame.iteration = frame
        .iteration
        .checked_add(1)
        .ok_or(Error::CounterOverflow)?;
    frame.pc = 0;
    frame.locals = BTreeMap::from([(binding.0, next)]);
    result.state.inner.realized = None;
    result.traces.push(Trace::LoopRepeated {
        node: frame.node_id,
        iteration: frame.iteration,
    });
    Ok(())
}
