//! A host-driven countdown contract; the pure interpreter never reads a clock.
use super::*;

pub const MAX_TIMER_SECONDS: u32 = 86_400;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Timer {
    pub duration_seconds: u32,
    pub adjustable: bool,
    pub min_seconds: u32,
    pub max_seconds: u32,
    pub blocking: bool,
    /// Host placement only; omitted for the historical sticky default.
    #[serde(default = "sticky_default", skip_serializing_if = "is_sticky")]
    pub sticky: bool,
}

fn sticky_default() -> bool {
    true
}
fn is_sticky(value: &bool) -> bool {
    *value
}

impl Timer {
    /// Declare the immutable participant-confirmed timer snapshot available to expressions.
    pub(crate) fn output_type() -> Type {
        Type::Record(BTreeMap::from([
            ("duration_seconds".into(), Type::Number),
            ("elapsed_seconds".into(), Type::Number),
            ("completed".into(), Type::Boolean),
        ]))
    }
}

/// Reject missing, contradictory or unsupported parameters before declaring a timer binding.
pub(super) fn check(
    b: &Block,
    symbols: &mut Scope,
    prompt: Vec<CheckedPart>,
) -> Check<CheckedStep> {
    let attrs = attributes(
        b,
        &["duration", "adjustable", "min", "max", "blocking", "sticky"],
    )?;
    let seconds = |key: &str| -> Check<u32> {
        let attr = attrs
            .get(key)
            .ok_or_else(|| err(format!("!timer requires :{key}"), b.span.clone()))?;
        let word = &arity(attr, 1)?[0];
        word.text
            .parse::<u32>()
            .ok()
            .filter(|value| !word.quoted && (1..=MAX_TIMER_SECONDS).contains(value))
            .ok_or_else(|| {
                err(
                    "Timer durations must be whole seconds from 1 through 86400",
                    word.span.clone(),
                )
            })
    };
    let boolean = |key: &str| -> Check<bool> {
        let attr = attrs
            .get(key)
            .ok_or_else(|| err(format!("!timer requires :{key}"), b.span.clone()))?;
        let word = &arity(attr, 1)?[0];
        match (word.quoted, word.text.as_str()) {
            (false, "true") => Ok(true),
            (false, "false") => Ok(false),
            _ => Err(err("Expected true or false", word.span.clone())),
        }
    };
    let duration_seconds = seconds("duration")?;
    let adjustable = if attrs.contains_key("adjustable") {
        boolean("adjustable")?
    } else {
        false
    };
    let blocking = boolean("blocking")?;
    let sticky = if attrs.contains_key("sticky") {
        boolean("sticky")?
    } else {
        true
    };
    let (min_seconds, max_seconds) = if adjustable {
        (seconds("min")?, seconds("max")?)
    } else {
        if attrs.contains_key("min") || attrs.contains_key("max") {
            return Err(err(
                "Timer :min/:max require :adjustable true",
                b.span.clone(),
            ));
        }
        (duration_seconds, duration_seconds)
    };
    if min_seconds > max_seconds || !(min_seconds..=max_seconds).contains(&duration_seconds) {
        return Err(err(
            "Timer duration must be within ordered inclusive min/max bounds",
            b.span.clone(),
        ));
    }
    let binding = required_binding(b)?;
    declare(
        symbols,
        binding.clone(),
        Timer::output_type(),
        b.binding.as_ref().unwrap().span.clone(),
    )?;
    Ok(CheckedStep::Timer {
        binding,
        timer: Timer {
            duration_seconds,
            adjustable,
            min_seconds,
            max_seconds,
            blocking,
            sticky,
        },
        prompt,
    })
}
