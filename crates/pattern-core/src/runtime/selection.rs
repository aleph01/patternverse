//! Selection fulfillment is validated against the frozen offer, never inferred by a model.
use super::*;
use std::collections::BTreeSet;

/// Adapt a newly supported typed list to a legacy single-choice offer without altering old catalogues.
pub(super) fn choice_list(items: Vec<Value>) -> Result<Vec<Choice>, Error> {
    let choices = items
        .into_iter()
        .map(|item| match item {
            Value::Choice(choice) => Ok(choice),
            _ => Err(Error::InvalidSnapshot),
        })
        .collect::<Result<Vec<_>, _>>()?;
    if choices.len() > 1000 || !crate::value::valid_choices(&choices) {
        return Err(Error::ContractViolation);
    }
    Ok(choices)
}

/// Resolve the source once per transition, retaining original typed records for ranked outputs.
fn items(
    options: &Options,
    selection: &Selection,
    state: &SavedRun,
) -> Result<(Vec<Choice>, Vec<Value>, Type), Error> {
    let (values, element_type) = match options {
        Options::Static(choices) => (
            choices.iter().cloned().map(Value::Choice).collect(),
            Type::Choice,
        ),
        Options::Dynamic(source) => match evaluate(source, state)? {
            Value::Choices(choices) => (
                choices.into_iter().map(Value::Choice).collect(),
                Type::Choice,
            ),
            Value::List {
                items,
                element_type,
            } => (items, element_type),
            _ => return Err(Error::InvalidSnapshot),
        },
    };
    if values.len() > 1000 {
        return Err(Error::ContractViolation);
    }
    let choices = values
        .iter()
        .enumerate()
        .map(|(index, item)| match item {
            Value::Choice(choice) => Ok(choice.clone()),
            Value::Record(fields) => {
                match selection.label.as_ref().and_then(|label| fields.get(label)) {
                    Some(Value::Text(label)) if !label.trim().is_empty() => Ok(Choice {
                        value: format!("row_{index}"),
                        label: label.clone(),
                    }),
                    _ => Err(Error::ContractViolation),
                }
            }
            _ => Err(Error::InvalidSnapshot),
        })
        .collect::<Result<Vec<_>, _>>()?;
    if !choices.is_empty() && !crate::value::valid_choices(&choices) {
        return Err(Error::ContractViolation);
    }
    Ok((choices, values, element_type))
}

/// Freeze the option catalogue and effective bounds when opening an interaction.
pub(super) fn request(
    options: &Options,
    selection: &Selection,
    prompt: String,
    state: &SavedRun,
) -> Result<Request, Error> {
    let (options, _, _) = items(options, selection, state)?;
    let (min, max) = match selection.mode {
        SelectionMode::Rank => (options.len(), options.len()),
        SelectionMode::Single => (1, 1),
        SelectionMode::Multi => (
            selection.min,
            selection.max.unwrap_or(options.len()).min(options.len()),
        ),
    };
    if min > max || min > options.len() {
        return Err(Error::ContractViolation);
    }
    Ok(Request::Select {
        prompt,
        options,
        mode: selection.mode,
        min,
        max,
        prefer: selection.prefer.clone(),
    })
}

/// Validate IDs, uniqueness, cardinality and order, then return the declared typed value.
pub(super) fn answer(
    options: &Options,
    selection: &Selection,
    offered: &[Choice],
    bounds: std::ops::RangeInclusive<usize>,
    answer: &Fulfillment,
    state: &SavedRun,
) -> Result<Value, Error> {
    let keys = match (selection.mode, answer) {
        (SelectionMode::Single, Fulfillment::Selected(key)) => std::slice::from_ref(key),
        (SelectionMode::Multi, Fulfillment::SelectedMany(keys))
        | (SelectionMode::Rank, Fulfillment::Ranked(keys)) => keys.as_slice(),
        _ => return Err(Error::WrongResult),
    };
    if !bounds.contains(&keys.len()) || keys.iter().collect::<BTreeSet<_>>().len() != keys.len() {
        return Err(Error::ContractViolation);
    }
    let indices = keys
        .iter()
        .map(|key| {
            offered
                .iter()
                .position(|choice| &choice.value == key)
                .ok_or(Error::UnknownChoice)
        })
        .collect::<Result<Vec<_>, _>>()?;
    let (resolved, values, element_type) = items(options, selection, state)?;
    if resolved != offered {
        return Err(Error::InvalidSnapshot);
    }
    let items = if selection.mode == SelectionMode::Multi {
        values
            .into_iter()
            .enumerate()
            .filter(|(index, _)| indices.contains(index))
            .map(|(_, value)| value)
            .collect()
    } else {
        indices
            .into_iter()
            .map(|index| values[index].clone())
            .collect::<Vec<_>>()
    };
    if selection.mode == SelectionMode::Single {
        items.into_iter().next().ok_or(Error::ContractViolation)
    } else {
        Ok(Value::List {
            element_type,
            items,
        })
    }
}
