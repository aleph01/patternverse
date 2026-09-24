//! Collection frame scheduling only. Body instructions run through the parent driver.
use super::*;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub(super) enum Phase {
    Body { pc: usize },
    Continuation,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub(super) struct CollectionFrame {
    pub node_id: NodeId,
    pub source: Option<Vec<Value>>,
    pub completed: Vec<Value>,
    pub locals: BTreeMap<usize, Value>,
    pub phase: Phase,
}
/// Borrow the collection instruction at the parent cursor; reject any other instruction.
pub(super) fn definition(state: &SavedRun) -> Result<&Collection, Error> {
    match &state
        .pattern
        .nodes
        .get(state.pc)
        .ok_or(Error::InvalidSnapshot)?
        .instruction
    {
        Instruction::Collect(c) => Ok(c),
        _ => Err(Error::InvalidSnapshot),
    }
}
/// Evaluate the mapped source once and allocate a bounded collection frame.
/// Rejects nested frames, invalid sources, and excessive record counts before scheduling.
pub(super) fn begin(result: &mut Transition, node: &Node, c: &Collection) -> Result<(), Error> {
    if result.state.inner.collection.is_some() {
        return Err(Error::InvalidSnapshot);
    }
    let source = match &c.mode {
        CollectionMode::Open { .. } => None,
        CollectionMode::Mapped { source, .. } => {
            Some(match evaluate(source, &result.state.inner)? {
                Value::List { items, .. } => items,
                Value::Choices(choices) => choices.into_iter().map(Value::Choice).collect(),
                _ => return Err(Error::InvalidSnapshot),
            })
        }
    };
    if source
        .as_ref()
        .is_some_and(|items| items.len() > result.state.inner.limits.max_collection_records)
    {
        return Err(Error::CollectionLimit);
    }
    result.state.inner.collection = Some(CollectionFrame {
        node_id: node.id,
        source,
        completed: vec![],
        locals: BTreeMap::new(),
        phase: Phase::Continuation,
    });
    result.traces.push(Trace::CollectionStarted(node.id));
    schedule(result)
}
/// Clear iteration-local bindings and bind the next mapped item in a fresh record scope.
fn start_record(result: &mut Transition) -> Result<(), Error> {
    let alias = match definition(&result.state.inner)?.mode {
        CollectionMode::Mapped { alias, .. } => Some(alias),
        CollectionMode::Open { .. } => None,
    };
    let frame = result
        .state
        .inner
        .collection
        .as_mut()
        .ok_or(Error::InvalidSnapshot)?;
    frame.locals.clear();
    frame.phase = Phase::Body { pc: 0 };
    let index = frame.completed.len();
    if let Some(alias) = alias {
        let item = frame
            .source
            .as_ref()
            .and_then(|v| v.get(index))
            .ok_or(Error::InvalidSnapshot)?;
        frame.locals.insert(alias.0, item.clone());
    }
    result.traces.push(Trace::RecordStarted {
        collection: frame.node_id,
        index,
    });
    Ok(())
}
/// Publish completed records as the collection binding and resume the parent cursor.
fn complete(result: &mut Transition) -> Result<(), Error> {
    let c = definition(&result.state.inner)?;
    let (binding, record_type) = (c.binding, c.record_type.clone());
    let frame = result
        .state
        .inner
        .collection
        .take()
        .ok_or(Error::InvalidSnapshot)?;
    bind(
        result,
        binding,
        Value::List {
            element_type: record_type,
            items: frame.completed,
        },
    )?;
    result.state.inner.pc += 1;
    result
        .traces
        .push(Trace::CollectionCompleted(frame.node_id));
    Ok(())
}
/// Choose the next record, participant continuation, or completion from mode and bounds.
fn schedule(result: &mut Transition) -> Result<(), Error> {
    let c = definition(&result.state.inner)?;
    let frame = result
        .state
        .inner
        .collection
        .as_ref()
        .ok_or(Error::InvalidSnapshot)?;
    let count = frame.completed.len();
    match &c.mode {
        CollectionMode::Mapped { .. } => {
            if count == frame.source.as_ref().ok_or(Error::InvalidSnapshot)?.len() {
                complete(result)
            } else {
                start_record(result)
            }
        }
        CollectionMode::Open { min, max } => {
            let (min, max) = (*min, *max);
            if count >= max {
                return complete(result);
            }
            if count < min {
                return start_record(result);
            }
            let node = result.state.inner.pattern.nodes[result.state.inner.pc].clone();
            let continuation = CollectionContinuation {
                collection_node_id: node.id,
                completed: count,
                min,
                max,
            };
            let frame = result.state.inner.collection.as_mut().unwrap();
            frame.phase = Phase::Continuation;
            frame.locals.clear();
            let effect = emit(
                result,
                &node,
                Request::Choose {
                    prompt: if count == 0 {
                        "Add an entry?".into()
                    } else {
                        "Add another entry?".into()
                    },
                    options: vec![
                        Choice {
                            value: "add".into(),
                            label: "Add another".into(),
                        },
                        Choice {
                            value: "finish".into(),
                            label: "Finish".into(),
                        },
                    ],
                    collection_continuation: Some(continuation),
                },
            )?;
            result.state.inner.pending = Some(effect);
            Ok(())
        }
    }
}
/// Returns true only when the driver must yield for continuation input.
pub(super) fn pump(result: &mut Transition) -> Result<bool, Error> {
    let Some(frame) = result.state.inner.collection.as_ref() else {
        return Ok(false);
    };
    if frame.phase == Phase::Continuation {
        return Ok(true);
    }
    let Phase::Body { pc } = frame.phase else {
        unreachable!()
    };
    let c = definition(&result.state.inner)?;
    if pc < c.nodes.len() {
        return Ok(false);
    }
    if pc != c.nodes.len() {
        return Err(Error::InvalidSnapshot);
    }
    let fields = c
        .fields
        .iter()
        .map(|(key, id)| {
            frame
                .locals
                .get(&id.0)
                .cloned()
                .map(|v| (key.clone(), v))
                .ok_or(Error::InvalidSnapshot)
        })
        .collect::<Result<BTreeMap<_, _>, _>>()?;
    let record = Value::Record(fields);
    yield_value(result, record)?;
    Ok(result
        .state
        .inner
        .collection
        .as_ref()
        .is_some_and(|f| f.phase == Phase::Continuation))
}
/// Finish one iteration with only its explicitly yielded value and schedule the next.
pub(super) fn yield_value(result: &mut Transition, record: Value) -> Result<(), Error> {
    let c = definition(&result.state.inner)?;
    if !record.is_valid() || record.value_type() != c.record_type {
        return Err(Error::InvalidSnapshot);
    }
    if c.nodes
        .last()
        .is_some_and(|node| matches!(node.instruction, Instruction::Yield(_)))
    {
        let frame = result
            .state
            .inner
            .collection
            .as_ref()
            .ok_or(Error::InvalidSnapshot)?;
        crate::expression::functional::validate_values(
            frame.completed.iter().chain(std::iter::once(&record)),
        )
        .map_err(Error::Expression)?;
    }
    let frame = result.state.inner.collection.as_mut().unwrap();
    let index = frame.completed.len();
    frame.completed.push(record);
    frame.locals.clear();
    result.traces.push(Trace::RecordCompleted {
        collection: frame.node_id,
        index,
    });
    schedule(result)
}
/// Apply an add/finish choice only at a valid open-collection continuation boundary.
pub(super) fn answer(result: &mut Transition, choice: &str) -> Result<(), Error> {
    let c = definition(&result.state.inner)?;
    let CollectionMode::Open { min, max } = c.mode else {
        return Err(Error::InvalidSnapshot);
    };
    let frame = result
        .state
        .inner
        .collection
        .as_ref()
        .ok_or(Error::InvalidSnapshot)?;
    if frame.phase != Phase::Continuation
        || frame.completed.len() < min
        || frame.completed.len() >= max
    {
        return Err(Error::InvalidSnapshot);
    }
    match choice {
        "add" => start_record(result),
        "finish" => complete(result),
        _ => Err(Error::UnknownChoice),
    }
}
