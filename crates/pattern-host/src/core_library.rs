//! The ten current CBT exercises; sources are pinned at compile time.
use super::Technique;

pub(super) const TECHNIQUES: &[Technique] = &[
    Technique {
        id: "cbt.thought-record",
        title: "Thought Record / Cognitive Restructuring",
        modality: "cbt",
        needs_ai: false,
    },
    Technique {
        id: "cbt.activation",
        title: "Behavioral Activation",
        modality: "cbt",
        needs_ai: false,
    },
    Technique {
        id: "cbt.exposure",
        title: "Exposure",
        modality: "cbt",
        needs_ai: false,
    },
    Technique {
        id: "cbt.experiment",
        title: "Behavioral Experiment",
        modality: "cbt",
        needs_ai: false,
    },
    Technique {
        id: "cbt.problem-solving",
        title: "Problem Solving",
        modality: "cbt",
        needs_ai: false,
    },
    Technique {
        id: "cbt.thinking-patterns",
        title: "Identify Cognitive Distortions",
        modality: "cbt",
        needs_ai: false,
    },
    Technique {
        id: "cbt.downward-arrow",
        title: "Downward Arrow",
        modality: "cbt",
        needs_ai: false,
    },
    Technique {
        id: "cbt.worry-time",
        title: "Worry Time / Stimulus Control for Worry",
        modality: "cbt",
        needs_ai: false,
    },
    Technique {
        id: "cbt.activity-mood",
        title: "Activity–Mood Monitoring",
        modality: "cbt",
        needs_ai: false,
    },
    Technique {
        id: "cbt.graded-task",
        title: "Graded Task Assignment",
        modality: "cbt",
        needs_ai: false,
    },
];

/// Resolve only explicitly bundled sources; never interpret a caller-supplied path.
pub(super) fn source(id: &str) -> Option<&'static str> {
    Some(match id {
        "cbt.thought-record" => include_str!(
            "../../../packages/therapy-patterns/patterns/cbt.thought-record.pattern.md"
        ),
        "cbt.activation" => {
            include_str!("../../../packages/therapy-patterns/patterns/cbt.activation.pattern.md")
        }
        "cbt.exposure" => {
            include_str!("../../../packages/therapy-patterns/patterns/cbt.exposure.pattern.md")
        }
        "cbt.experiment" => {
            include_str!("../../../packages/therapy-patterns/patterns/cbt.experiment.pattern.md")
        }
        "cbt.problem-solving" => include_str!(
            "../../../packages/therapy-patterns/patterns/cbt.problem-solving.pattern.md"
        ),
        "cbt.thinking-patterns" => include_str!(
            "../../../packages/therapy-patterns/patterns/cbt.thinking-patterns.pattern.md"
        ),
        "cbt.downward-arrow" => include_str!(
            "../../../packages/therapy-patterns/patterns/cbt.downward-arrow.pattern.md"
        ),
        "cbt.worry-time" => {
            include_str!("../../../packages/therapy-patterns/patterns/cbt.worry-time.pattern.md")
        }
        "cbt.activity-mood" => {
            include_str!("../../../packages/therapy-patterns/patterns/cbt.activity-mood.pattern.md")
        }
        "cbt.graded-task" => {
            include_str!("../../../packages/therapy-patterns/patterns/cbt.graded-task.pattern.md")
        }
        _ => return None,
    })
}
