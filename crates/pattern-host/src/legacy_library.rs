//! Retired, pinned sources for restoring existing checkpoints only. Never a new-run catalog.
pub(super) fn source(id: &str) -> Option<&'static str> {
    Some(match id {
        "act.acceptance" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/act.acceptance.pattern.md"
        ),
        "act.attention" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/act.attention.pattern.md"
        ),
        "act.barriers" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/act.barriers.pattern.md"
        ),
        "act.choice-point" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/act.choice-point.pattern.md"
        ),
        "act.defusion" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/act.defusion.pattern.md"
        ),
        "act.flexibility-review" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/act.flexibility-review.pattern.md"
        ),
        "act.observe-thoughts" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/act.observe-thoughts.pattern.md"
        ),
        "act.observer" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/act.observer.pattern.md"
        ),
        "act.present" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/act.present.pattern.md"
        ),
        "act.stories" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/act.stories.pattern.md"
        ),
        "act.values-clarity" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/act.values-clarity.pattern.md"
        ),
        "act.values-goals" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/act.values-goals.pattern.md"
        ),
        "act.values-priority" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/act.values-priority.pattern.md"
        ),
        "act.values" => {
            include_str!("../../../packages/therapy-patterns/legacy/patterns/act.values.pattern.md")
        }
        "act.willingness" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/act.willingness.pattern.md"
        ),
        "cbt.abc" => {
            include_str!("../../../packages/therapy-patterns/legacy/patterns/cbt.abc.pattern.md")
        }
        "cbt.activation" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.activation.pattern.md"
        ),
        "cbt.automatic-thought" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.automatic-thought.pattern.md"
        ),
        "cbt.beliefs" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.beliefs.pattern.md"
        ),
        "cbt.coping-card" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.coping-card.pattern.md"
        ),
        "cbt.decatastrophizing" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.decatastrophizing.pattern.md"
        ),
        "cbt.emotion" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.emotion.pattern.md"
        ),
        "cbt.evidence" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.evidence.pattern.md"
        ),
        "cbt.experiment-review" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.experiment-review.pattern.md"
        ),
        "cbt.experiment" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.experiment.pattern.md"
        ),
        "cbt.graded-task" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.graded-task.pattern.md"
        ),
        "cbt.maintenance" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.maintenance.pattern.md"
        ),
        "cbt.moment" => {
            include_str!("../../../packages/therapy-patterns/legacy/patterns/cbt.moment.pattern.md")
        }
        "cbt.perspectives" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.perspectives.pattern.md"
        ),
        "cbt.positive-data" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.positive-data.pattern.md"
        ),
        "cbt.probability" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.probability.pattern.md"
        ),
        "cbt.problem-solving" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.problem-solving.pattern.md"
        ),
        "cbt.review" => {
            include_str!("../../../packages/therapy-patterns/legacy/patterns/cbt.review.pattern.md")
        }
        "cbt.rules" => {
            include_str!("../../../packages/therapy-patterns/legacy/patterns/cbt.rules.pattern.md")
        }
        "cbt.thinking-patterns" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.thinking-patterns.pattern.md"
        ),
        "cbt.thought-record" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.thought-record.pattern.md"
        ),
        "cbt.worry-chain" => include_str!(
            "../../../packages/therapy-patterns/legacy/patterns/cbt.worry-chain.pattern.md"
        ),
        _ => return None,
    })
}
