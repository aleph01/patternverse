//! Explicit local-library imports pinned to a compiled content revision.
use super::*;
use std::collections::BTreeSet;

#[derive(Clone, Debug)]
pub struct Import {
    pub artifact: String,
    pub revision: String,
    pub alias: String,
    pub span: Span,
}

/// Read unique aliases and exact revision pins; never interpret paths or remote URLs.
///
/// # Errors
/// Rejects malformed declarations, duplicate aliases, and non-content-addressed pins.
pub fn imports(declarations: &[Attribute]) -> Result<Vec<Import>, Diagnostic> {
    let mut aliases = BTreeSet::new();
    declarations
        .iter()
        .filter(|attr| attr.name == "import")
        .map(|attr| {
            let invalid = || {
                Diagnostic::error(
                    "D003",
                    "Expected :import \"artifact@m4-v1:<sha256>\" as alias, with a unique alias",
                    attr.span.clone(),
                )
            };
            let [pin, keyword, alias] = attr.args.as_slice() else {
                return Err(invalid());
            };
            let (artifact, revision) = pin.text.rsplit_once('@').ok_or_else(invalid)?;
            let hash = revision.strip_prefix("m4-v1:").ok_or_else(invalid)?;
            if !pin.quoted
                || artifact.is_empty()
                || artifact.len() > 100
                || keyword.quoted
                || keyword.text != "as"
                || alias.quoted
                || reference(&alias.text, 0).is_err()
                || !aliases.insert(alias.text.clone())
                || hash.len() != 64
                || !hash
                    .bytes()
                    .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
            {
                return Err(invalid());
            }
            Ok(Import {
                artifact: artifact.into(),
                revision: revision.into(),
                alias: alias.text.clone(),
                span: attr.span.clone(),
            })
        })
        .collect()
}
