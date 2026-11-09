//! Validate the entire form before committing its immutable result record.
use super::*;
use crate::compiler::{Form, FormBlock};

/// Render one atomic offer, freezing all dynamic selections through the existing contract.
pub(super) fn request(
    form: &Form<Vec<Part>, Options>,
    state: &SavedRun,
) -> Result<Form<String>, Error> {
    form.clone().try_map(
        |parts| render(&parts, state),
        |options, contract| {
            let Request::Select {
                options, min, max, ..
            } = selection::request(&options, contract, String::new(), state)?
            else {
                unreachable!()
            };
            contract.min = min;
            contract.max = Some(max);
            Ok(options)
        },
    )
}

/// Multi-choice receipt identity is independent of the order in which boxes were checked.
pub(super) fn normalize(fields: &mut BTreeMap<String, Value>) {
    for value in fields.values_mut() {
        if let Value::List {
            element_type: Type::Choice,
            items,
        } = value
        {
            items.sort_by(|a, b| match (a, b) {
                (Value::Choice(a), Value::Choice(b)) => a.value.cmp(&b.value),
                _ => std::cmp::Ordering::Equal,
            });
        }
    }
}

/// Reject missing, extra, malformed or blank required fields before binding any answer.
pub(super) fn answer(
    form: &Form<Vec<Part>, Options>,
    offered: &Form<String>,
    answer: &BTreeMap<String, Value>,
    state: &SavedRun,
) -> Result<Value, Error> {
    let mut expected = 0;
    let mut accepted = answer.clone();
    for (index, block) in form.blocks.iter().enumerate() {
        match block {
            FormBlock::Show { .. } => (),
            FormBlock::Ask { id, required, .. } => {
                expected += 1;
                let Some(Value::Text(text)) = answer.get(id) else {
                    return Err(Error::ContractViolation);
                };
                if (*required && text.trim().is_empty()) || text.len() > 32_000 {
                    return Err(Error::ContractViolation);
                }
            }
            FormBlock::Rate { id, rating, .. } => {
                expected += 1;
                let Some(Value::Number(number)) = answer.get(id) else {
                    return Err(Error::ContractViolation);
                };
                if !rating.accepts(*number) {
                    return Err(Error::ContractViolation);
                }
            }
            FormBlock::Select {
                id,
                options,
                selection: contract,
                ..
            } => {
                expected += 1;
                let Some(FormBlock::Select {
                    options: choices,
                    selection: bounds,
                    ..
                }) = offered.blocks.get(index)
                else {
                    return Err(Error::InvalidSnapshot);
                };
                let reply = match (contract.mode, answer.get(id)) {
                    (SelectionMode::Single, Some(Value::Choice(choice))) => {
                        Fulfillment::Selected(choice.value.clone())
                    }
                    (
                        SelectionMode::Multi,
                        Some(Value::List {
                            element_type: Type::Choice,
                            items,
                        }),
                    ) => Fulfillment::SelectedMany(
                        items
                            .iter()
                            .map(|item| match item {
                                Value::Choice(choice) => Ok(choice.value.clone()),
                                _ => Err(Error::ContractViolation),
                            })
                            .collect::<Result<_, _>>()?,
                    ),
                    _ => return Err(Error::ContractViolation),
                };
                accepted.insert(
                    id.clone(),
                    selection::answer(
                        options,
                        contract,
                        choices,
                        bounds.min..=bounds.max.ok_or(Error::InvalidSnapshot)?,
                        &reply,
                        state,
                    )?,
                );
            }
            FormBlock::Timer {
                id,
                timer: contract,
                ..
            } => {
                expected += 1;
                let Some(Value::Record(fields)) = answer.get(id) else {
                    return Err(Error::ContractViolation);
                };
                let seconds = |key: &str| -> Result<u32, Error> {
                    match fields.get(key) {
                        Some(Value::Number(n))
                            if n.is_finite()
                                && *n >= 0.0
                                && *n <= f64::from(u32::MAX)
                                && n.fract() == 0.0 =>
                        {
                            Ok(*n as u32)
                        }
                        _ => Err(Error::ContractViolation),
                    }
                };
                let Some(Value::Boolean(completed)) = fields.get("completed") else {
                    return Err(Error::ContractViolation);
                };
                if fields.len() != 3 {
                    return Err(Error::ContractViolation);
                }
                timer::answer(
                    contract,
                    &TimerResult {
                        duration_seconds: seconds("duration_seconds")?,
                        elapsed_seconds: seconds("elapsed_seconds")?,
                        completed: *completed,
                    },
                )?;
            }
        }
    }
    if answer.len() != expected {
        return Err(Error::ContractViolation);
    }
    Ok(Value::Record(accepted))
}
