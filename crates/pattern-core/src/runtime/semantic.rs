//! Runtime enforcement for typed semantic AI; operational errors never become uncertainty values.
use super::*;
use crate::semantic::{Candidate, Suggestion, SuggestionMode, SuggestionOutcome};

/// Resolve authored wording and explicit semantic references separately, never by prompt interpolation.
pub(super) fn wording(
    parts: &[Part],
    state: &SavedRun,
) -> Result<(String, BTreeMap<String, Value>), Error> {
    let [Part::Realize {
        specification,
        inputs,
    }] = parts
    else {
        return Err(Error::InvalidSnapshot);
    };
    let inputs = inputs
        .iter()
        .map(|(key, id, field)| Ok((key.clone(), field_value(state, *id, field)?)))
        .collect::<Result<_, Error>>()?;
    Ok((specification.clone(), inputs))
}

/// Snapshot offered items under request-local stable identities, retaining duplicate text as separate items.
pub(super) fn candidates(input: Value) -> Result<Vec<Candidate>, Error> {
    let values = match input {
        Value::List { items, .. } => items,
        Value::Choices(items) => items.into_iter().map(Value::Choice).collect(),
        _ => return Err(Error::InvalidSnapshot),
    };
    if values.len() > 128 {
        return Err(Error::ContractViolation);
    }
    crate::expression::functional::validate_values(&values).map_err(Error::Expression)?;
    Ok(values
        .into_iter()
        .enumerate()
        .map(|(index, value)| Candidate {
            id: format!("item-{index}"),
            value,
        })
        .collect())
}

/// Accept only offered identities with operation-specific cardinality; never trust model-reconstructed data.
pub(super) fn accept(
    mode: &SuggestionMode,
    element: &Type,
    candidates: &[Candidate],
    suggestion: &Suggestion,
) -> Result<Value, Error> {
    let ids = &suggestion.ids;
    let unique: std::collections::BTreeSet<_> = ids.iter().collect();
    if unique.len() != ids.len() || ids.iter().any(|id| !candidates.iter().any(|c| &c.id == id)) {
        return Err(Error::ContractViolation);
    }
    let uncertain = suggestion.outcome == SuggestionOutcome::Uncertain;
    if uncertain && !ids.is_empty() {
        return Err(Error::ContractViolation);
    }
    if !uncertain
        && match mode {
            SuggestionMode::Select => ids.len() != 1,
            SuggestionMode::Filter => false,
            SuggestionMode::Rank => ids.len() != candidates.len(),
        }
    {
        return Err(Error::ContractViolation);
    }
    let items = if *mode == SuggestionMode::Filter {
        candidates
            .iter()
            .filter(|c| ids.contains(&c.id))
            .map(|c| c.value.clone())
            .collect()
    } else {
        ids.iter()
            .map(|id| {
                candidates
                    .iter()
                    .find(|c| &c.id == id)
                    .unwrap()
                    .value
                    .clone()
            })
            .collect()
    };
    Ok(Value::Record(BTreeMap::from([
        (
            "outcome".into(),
            crate::semantic::outcome_type().value(if uncertain { "uncertain" } else { "decided" }),
        ),
        (
            "items".into(),
            Value::List {
                element_type: element.clone(),
                items,
            },
        ),
    ])))
}
