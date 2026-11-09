//! Previous DBT opening choices, retained only for exact checkpoint restoration.

/// Resolve the frozen source from before redundant initial exit choices were removed.
pub(super) fn source(id: &str) -> Option<&'static str> {
    match id {
        "dbt.pause" => Some(include_str!(
            "../../../packages/therapy-patterns/legacy/opening-choices/patterns/dbt.pause.pattern.md"
        )),
        "dbt.interpersonal" => Some(include_str!(
            "../../../packages/therapy-patterns/legacy/opening-choices/patterns/dbt.interpersonal.pattern.md"
        )),
        _ => None,
    }
}
