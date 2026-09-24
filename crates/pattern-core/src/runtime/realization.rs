//! Realization is a typed wording effect, never an agent or a control-flow decision.
use super::*;

/// Emit a realization request before delivering its containing ask/show, unless already accepted.
pub(super) fn request(result: &mut Transition, node: &Node) -> Result<bool, Error> {
    if result.state.inner.realized.is_some() {
        return Ok(false);
    }
    let parts = match &node.instruction {
        Instruction::Ask { prompt, .. } => prompt,
        Instruction::Show { body } => body,
        _ => return Ok(false),
    };
    let [Part::Realize {
        specification,
        inputs,
    }] = parts.as_slice()
    else {
        return Ok(false);
    };
    let inputs = inputs
        .iter()
        .map(|(key, id, field)| Ok((key.clone(), field_value(&result.state.inner, *id, field)?)))
        .collect::<Result<_, Error>>()?;
    let effect = emit(
        result,
        node,
        Request::Realize {
            specification: specification.clone(),
            inputs,
        },
    )?;
    result.state.inner.pending = Some(effect);
    Ok(true)
}

/// Save accepted surface text without interpreting it as Pattern syntax or changing the cursor.
pub(super) fn accept(result: &mut Transition, receipt: Receipt) -> Result<(), Error> {
    let Fulfillment::Realized(text) = &receipt.result else {
        return Err(Error::WrongResult);
    };
    if text.trim().is_empty() || text.len() > 32_000 {
        return Err(Error::ContractViolation);
    }
    result.state.inner.realized = Some(text.clone());
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
    Ok(())
}
