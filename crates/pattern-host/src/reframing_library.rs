//! Bundled, original problem-reframing operators. Exact source bytes are pinned per run.
use super::Technique;

pub(super) const TECHNIQUES: &[Technique] = &[
    Technique {
        id: "reframing.rapid-reframe",
        title: "Rapid Reframe",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.frame-problem",
        title: "Frame the Problem",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.map-stakeholders",
        title: "Map Stakeholders",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.review-frame",
        title: "Review the Frame",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.verify-statement",
        title: "Verify the Statement",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.remove-constraints",
        title: "Remove Constraints",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.detect-baked-solution",
        title: "Detect a Baked-In Solution",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.identify-problem-form",
        title: "Identify the Problem Form",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.locate-problem",
        title: "Locate the Problem",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.inspect-emotion",
        title: "Inspect Emotional Language",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.break-tradeoff",
        title: "Break a False Trade-Off",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.explore-or-break",
        title: "Explore or Break the Frame",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.look-outside-frame",
        title: "Look Outside the Frame",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.escape-hammer",
        title: "Escape Your Hammer",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.expand-time-window",
        title: "Expand the Time Window",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.find-hidden-influence",
        title: "Find Hidden Influences",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.find-hidden-properties",
        title: "Find Hidden Properties",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.rethink-goal",
        title: "Rethink the Goal",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.surface-higher-goals",
        title: "Surface Higher-Level Goals",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.challenge-goal-logic",
        title: "Challenge Goal Logic",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.alternative-paths",
        title: "Find Alternative Paths",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.generate-real-options",
        title: "Generate Real Options",
        modality: "reframing",
        needs_ai: true,
    },
    Technique {
        id: "reframing.validate-frame",
        title: "Validate the Frame",
        modality: "reframing",
        needs_ai: true,
    },
];

/// Resolve only audited, bundled sources; no dynamic or network import is allowed.
pub(super) fn source(id: &str) -> Option<&'static str> {
    Some(match id {
        "reframing.rapid-reframe" => include_str!("../../../packages/reframing-patterns/patterns/reframing.rapid-reframe.pattern.md"),
        "reframing.frame-problem" => include_str!("../../../packages/reframing-patterns/patterns/reframing.frame-problem.pattern.md"),
        "reframing.map-stakeholders" => include_str!("../../../packages/reframing-patterns/patterns/reframing.map-stakeholders.pattern.md"),
        "reframing.review-frame" => include_str!("../../../packages/reframing-patterns/patterns/reframing.review-frame.pattern.md"),
        "reframing.verify-statement" => include_str!("../../../packages/reframing-patterns/patterns/reframing.verify-statement.pattern.md"),
        "reframing.remove-constraints" => include_str!("../../../packages/reframing-patterns/patterns/reframing.remove-constraints.pattern.md"),
        "reframing.detect-baked-solution" => include_str!("../../../packages/reframing-patterns/patterns/reframing.detect-baked-solution.pattern.md"),
        "reframing.identify-problem-form" => include_str!("../../../packages/reframing-patterns/patterns/reframing.identify-problem-form.pattern.md"),
        "reframing.locate-problem" => include_str!("../../../packages/reframing-patterns/patterns/reframing.locate-problem.pattern.md"),
        "reframing.inspect-emotion" => include_str!("../../../packages/reframing-patterns/patterns/reframing.inspect-emotion.pattern.md"),
        "reframing.break-tradeoff" => include_str!("../../../packages/reframing-patterns/patterns/reframing.break-tradeoff.pattern.md"),
        "reframing.explore-or-break" => include_str!("../../../packages/reframing-patterns/patterns/reframing.explore-or-break.pattern.md"),
        "reframing.look-outside-frame" => include_str!("../../../packages/reframing-patterns/patterns/reframing.look-outside-frame.pattern.md"),
        "reframing.escape-hammer" => include_str!("../../../packages/reframing-patterns/patterns/reframing.escape-hammer.pattern.md"),
        "reframing.expand-time-window" => include_str!("../../../packages/reframing-patterns/patterns/reframing.expand-time-window.pattern.md"),
        "reframing.find-hidden-influence" => include_str!("../../../packages/reframing-patterns/patterns/reframing.find-hidden-influence.pattern.md"),
        "reframing.find-hidden-properties" => include_str!("../../../packages/reframing-patterns/patterns/reframing.find-hidden-properties.pattern.md"),
        "reframing.rethink-goal" => include_str!("../../../packages/reframing-patterns/patterns/reframing.rethink-goal.pattern.md"),
        "reframing.surface-higher-goals" => include_str!("../../../packages/reframing-patterns/patterns/reframing.surface-higher-goals.pattern.md"),
        "reframing.challenge-goal-logic" => include_str!("../../../packages/reframing-patterns/patterns/reframing.challenge-goal-logic.pattern.md"),
        "reframing.alternative-paths" => include_str!("../../../packages/reframing-patterns/patterns/reframing.alternative-paths.pattern.md"),
        "reframing.generate-real-options" => include_str!("../../../packages/reframing-patterns/patterns/reframing.generate-real-options.pattern.md"),
        "reframing.validate-frame" => include_str!("../../../packages/reframing-patterns/patterns/reframing.validate-frame.pattern.md"),
        _ => return None,
    })
}

/// Supply the local namespace for static child-call resolution.
pub(super) fn sources() -> impl Iterator<Item = (String, String)> {
    TECHNIQUES.iter().map(|item| {
        (
            item.id.to_owned(),
            source(item.id).expect("bundled source").to_owned(),
        )
    })
}
