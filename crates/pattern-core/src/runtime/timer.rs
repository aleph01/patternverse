//! Validate host-reported elapsed time, independent of wall-clock time and replay speed.
use super::*;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TimerResult {
    pub duration_seconds: u32,
    pub elapsed_seconds: u32,
    pub completed: bool,
}

/// Validate the host report against its frozen timer contract without consulting a clock.
pub(super) fn answer(timer: &Timer, answer: &TimerResult) -> Result<Value, Error> {
    if !(timer.min_seconds..=timer.max_seconds).contains(&answer.duration_seconds)
        || (!timer.adjustable && answer.duration_seconds != timer.duration_seconds)
        || answer.elapsed_seconds > answer.duration_seconds
        || answer.completed != (answer.elapsed_seconds == answer.duration_seconds)
        || (timer.blocking && !answer.completed)
    {
        return Err(Error::ContractViolation);
    }
    Ok(Value::Record(BTreeMap::from([
        (
            "duration_seconds".into(),
            Value::Number(f64::from(answer.duration_seconds)),
        ),
        (
            "elapsed_seconds".into(),
            Value::Number(f64::from(answer.elapsed_seconds)),
        ),
        ("completed".into(), Value::Boolean(answer.completed)),
    ])))
}
