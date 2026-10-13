//! Previous bundled sources with readiness screens, accepted only when restoring exact checkpoints.
pub(super) fn source(id: &str) -> Option<&'static str> {
    Some(match id {
        "cbt.activation" => include_str!(
            "../../../packages/therapy-patterns/legacy/readiness/patterns/cbt.activation.pattern.md"
        ),
        "cbt.activity-mood" => include_str!(
            "../../../packages/therapy-patterns/legacy/readiness/patterns/cbt.activity-mood.pattern.md"
        ),
        "cbt.downward-arrow" => include_str!(
            "../../../packages/therapy-patterns/legacy/readiness/patterns/cbt.downward-arrow.pattern.md"
        ),
        "cbt.experiment" => include_str!(
            "../../../packages/therapy-patterns/legacy/readiness/patterns/cbt.experiment.pattern.md"
        ),
        "cbt.exposure" => include_str!(
            "../../../packages/therapy-patterns/legacy/readiness/patterns/cbt.exposure.pattern.md"
        ),
        "cbt.graded-task" => include_str!(
            "../../../packages/therapy-patterns/legacy/readiness/patterns/cbt.graded-task.pattern.md"
        ),
        "cbt.problem-solving" => include_str!(
            "../../../packages/therapy-patterns/legacy/readiness/patterns/cbt.problem-solving.pattern.md"
        ),
        "cbt.thinking-patterns" => include_str!(
            "../../../packages/therapy-patterns/legacy/readiness/patterns/cbt.thinking-patterns.pattern.md"
        ),
        "cbt.thought-record" => include_str!(
            "../../../packages/therapy-patterns/legacy/readiness/patterns/cbt.thought-record.pattern.md"
        ),
        "cbt.worry-time" => include_str!(
            "../../../packages/therapy-patterns/legacy/readiness/patterns/cbt.worry-time.pattern.md"
        ),
        "dbt.interpersonal" => include_str!(
            "../../../packages/therapy-patterns/legacy/readiness/patterns/dbt.interpersonal.pattern.md"
        ),
        "dbt.pause" => include_str!(
            "../../../packages/therapy-patterns/legacy/readiness/patterns/dbt.pause.pattern.md"
        ),
        _ => return None,
    })
}

/// Accept previous exact sources only for replay-validated saved runs.
pub(super) fn accepts(id: &str, pinned: &str) -> bool {
    source(id) == Some(pinned)
        || (id == "cbt.worry-time"
            && pinned == include_str!(
                "../../../packages/therapy-patterns/legacy/worry-time/cbt.worry-time-2.1.0.pattern.md"
            ))
}
