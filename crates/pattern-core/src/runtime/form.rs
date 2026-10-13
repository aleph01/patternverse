//! Validate the entire form before committing its immutable result record.
use super::*;
use crate::compiler::{Form, FormBlock};

/// Reject missing, extra, malformed or blank required fields before binding any answer.
pub(super) fn answer(
    form: &Form<Vec<Part>>,
    answer: &BTreeMap<String, Value>,
) -> Result<Value, Error> {
    let mut expected = 0;
    for block in &form.blocks {
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
    Ok(Value::Record(answer.clone()))
}
