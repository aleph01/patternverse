//! Derive fresh run-specific permutations without reading a clock or changing replay behavior.
use super::*;
use crate::compiler::CompiledExpr;

/// Include the invocation and iteration identity so restoring a run recreates the same permutation.
pub(super) fn value(
    expression: &CompiledExpr,
    node: &Node,
    state: &SavedRun,
) -> Result<Value, Error> {
    let value = evaluate(expression, state)?;
    let seed = serde_json::to_vec(&(
        "pattern-run-shuffle-v1",
        &state.run_id,
        &state.pattern.snapshot_id,
        node.id,
        state.next_effect_sequence,
        state.collection.as_ref().map(|frame| frame.completed.len()),
        state.looping.as_ref().map(|frame| frame.iteration),
    ))
    .map_err(|_| Error::InvalidSnapshot)?;
    expression::functional::validate_values([&value]).map_err(Error::Expression)?;
    crate::shuffle::apply(value, &seed).map_err(Error::Expression)
}
