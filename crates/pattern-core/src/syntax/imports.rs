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
    let mut aliases: BTreeSet<String> = package_imports(declarations)?.into_iter().map(|i|i.alias).collect();
    declarations
        .iter()
        .filter(|attr| attr.name == "import" && attr.args.first().is_none_or(|word| word.quoted && !word.text.contains('/')))
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
            let hash = revision
                .strip_prefix("m4-v1:")
                .or_else(|| revision.strip_prefix("m4-v3:"))
                .ok_or_else(invalid)?;
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

#[derive(Clone, Debug)]
pub struct DataImport {
    pub resource: String,
    pub alias: String,
    pub span: Span,
}
/// A data import names a host-provided resource; it never denotes a URL or filesystem path.
///
/// # Errors
/// Rejects malformed resource names, invalid aliases and alias collisions.
pub fn data_imports(declarations: &[Attribute]) -> Result<Vec<DataImport>, Diagnostic> {
    let mut aliases: BTreeSet<String> = imports(declarations)?
        .into_iter()
        .chain(package_imports(declarations)?)
        .map(|i| i.alias)
        .collect();
    declarations
        .iter()
        .filter(|a| a.name == "import" && a.args.first().is_some_and(|w| !w.quoted))
        .map(|a| {
            let fail = || {
                Diagnostic::error(
                    "D003",
                    "Expected :import alias from \"source:resource\", with a unique alias",
                    a.span.clone(),
                )
            };
            let [alias, from, resource] = a.args.as_slice() else {
                return Err(fail());
            };
            let parts = resource.text.split(':').collect::<Vec<_>>();
            if alias.quoted
                || ["true", "false", "not", "and", "or", "count"].contains(&alias.text.as_str())
                || !super::is_identifier(&alias.text)
                || from.quoted
                || from.text != "from"
                || !resource.quoted
                || resource.text.len() > 128
                || parts.len() != 2
                || parts.iter().any(|s| {
                    s.is_empty()
                        || !s
                            .chars()
                            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_'))
                })
                || !aliases.insert(alias.text.clone())
            {
                return Err(fail());
            }
            Ok(DataImport {
                resource: resource.text.clone(),
                alias: alias.text.clone(),
                span: a.span.clone(),
            })
        })
        .collect()
}

/// Explicit local widget-package imports. Package code is never loaded here.
///
/// # Errors
/// Rejects malformed package references, unsupported versions and duplicate or invalid aliases.
pub fn package_imports(declarations: &[Attribute]) -> Result<Vec<Import>, Diagnostic> {
    let mut aliases=BTreeSet::new();
    declarations.iter().filter(|a|a.name=="import"&&a.args.first().is_some_and(|w|w.quoted&&w.text.contains('/'))).map(|a|{
        let bad=||Diagnostic::error("W001","Expected :import \"publisher/package@1.0.0\" as alias",a.span.clone());
        let [pin,keyword,alias]=a.args.as_slice() else{return Err(bad());};
        let (artifact,revision)=pin.text.rsplit_once('@').ok_or_else(bad)?;
        let parts:Vec<_>=artifact.split('/').collect();
        if parts.len()!=2||parts.iter().any(|p|!crate::widgets::segment(p))||(!crate::widgets::version(revision)&&(!revision.bytes().all(|b|b.is_ascii_digit())||(revision.len()>1&&revision.starts_with('0'))||revision.parse::<u32>().is_err()))||keyword.text!="as"||keyword.quoted||alias.quoted||!is_identifier(&alias.text)||!aliases.insert(alias.text.clone()){return Err(bad());}
        Ok(Import{artifact:artifact.into(),revision:revision.into(),alias:alias.text.clone(),span:a.span.clone()})
    }).collect()
}
