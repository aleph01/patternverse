//! Resolve explicit local sources once; execution never consults a mutable library.
use crate::{
    compiler::{self, CompiledPattern},
    syntax::{self, Diagnostic, Statement},
};
use serde::{Deserialize, Deserializer, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

/// An explicit name-to-source library supplied by the Host. No filesystem/network lookup.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SourceBundle {
    pub root: String,
    pub patterns: BTreeMap<String, String>,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BuildError {
    pub pattern: String,
    pub diagnostics: Vec<Diagnostic>,
}
impl std::fmt::Display for BuildError {
    /// Format the failing pattern and its first diagnostic for a concise build error.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}: {}",
            self.pattern,
            self.diagnostics
                .first()
                .map_or("Invalid snapshot", |d| d.message.as_str())
        )
    }
}
impl std::error::Error for BuildError {}
/// Create a dependency diagnostic without an attributable source span.
fn error(pattern: &str, message: impl Into<String>) -> BuildError {
    BuildError {
        pattern: pattern.into(),
        diagnostics: vec![Diagnostic::error("D001", message, 0..0)],
    }
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
struct SnapshotData {
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    widgets: crate::widgets::Packages,
    version: u32,
    id: String,
    root_name: String,
    root_revision: String,
    sources: BTreeMap<String, String>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    data: BTreeMap<String, crate::data::DataLibrary>,
    patterns: BTreeMap<String, CompiledPattern>,
}
/// Exact root source and transitive dependency closure, with content-derived identity.
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(transparent)]
pub struct ExecutableSnapshot {
    inner: SnapshotData,
}
impl<'de> Deserialize<'de> for ExecutableSnapshot {
    /// Rebuild executable code from saved sources and reject mismatching snapshot metadata.
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let saved = SnapshotData::deserialize(deserializer)?;
        let rebuilt = Self::build_with_widgets(
            SourceBundle {
                root: saved.root_name.clone(),
                patterns: saved.sources.clone(),
            },
            saved.data.clone(),
            saved.widgets.clone(),
        )
        .map_err(serde::de::Error::custom)?;
        if rebuilt.inner != saved {
            return Err(serde::de::Error::custom(
                "Executable snapshot does not match its exact sources",
            ));
        }
        Ok(rebuilt)
    }
}
impl ExecutableSnapshot {
    /// Compile the root and its transitive dependencies into a content-addressed snapshot.
    /// Only exact source text in the supplied bundle is used; no external lookup occurs.
    ///
    /// # Errors
    /// Rejects missing or cyclic dependencies, invalid patterns, name mismatches, and graph limits.
    pub fn build(bundle: SourceBundle) -> Result<Self, BuildError> {
        Self::build_with_data(bundle, BTreeMap::new())
    }

    /// Freeze a source closure and its host-supplied reference resources together.
    ///
    /// # Errors
    /// Rejects invalid or oversized sources, resources, imports and dependency graphs.
    pub fn build_with_data(
        bundle: SourceBundle,
        data: BTreeMap<String, crate::data::DataLibrary>,
    ) -> Result<Self, BuildError> {
        Self::build_with_widgets(bundle,data,BTreeMap::new())
    }
    /// Freeze the source closure, reference data and widget packages into one replayable snapshot.
    ///
    /// # Errors
    /// Rejects oversized or invalid resources, imports and dependency graphs.
    pub fn build_with_widgets(bundle:SourceBundle,data:BTreeMap<String,crate::data::DataLibrary>,widgets:crate::widgets::Packages)->Result<Self,BuildError>{
        if widgets.len()>64 || serde_json::to_vec(&widgets).map_err(|_|error(&bundle.root,"Invalid widgets"))?.len()>4*1024*1024 {return Err(error(&bundle.root,"Widget package limit exceeded"));}
        if data.len() > 64
            || serde_json::to_vec(&data)
                .map_err(|_| error(&bundle.root, "Invalid data resources"))?
                .len()
                > 2 * 1024 * 1024
        {
            return Err(error(
                &bundle.root,
                "Data resources exceed 64 libraries / 2 MiB",
            ));
        }
        let mut compiled = BTreeMap::new();
        visit(
            &bundle.root,
            &bundle.patterns,
            &mut vec![],
            &mut compiled,
            &mut BTreeMap::new(),
            &data,
            &widgets,
        )?;
        let root_revision = compiled[&bundle.root].snapshot_id().to_owned();
        let sources: BTreeMap<_, _> = compiled
            .keys()
            .map(|name| (name.clone(), bundle.patterns[name].clone()))
            .collect();
        let used = sources
            .values()
            .map(|source| {
                syntax::parse(source).map_err(|diagnostics| BuildError {
                    pattern: bundle.root.clone(),
                    diagnostics,
                })
            })
            .collect::<Result<Vec<_>, _>>()?
            .into_iter()
            .map(|parsed| {
                syntax::data_imports(&parsed.declarations).map_err(|diagnostic| BuildError {
                    pattern: bundle.root.clone(),
                    diagnostics: vec![diagnostic],
                })
            })
            .collect::<Result<Vec<_>, _>>()?
            .into_iter()
            .flatten()
            .map(|i| i.resource)
            .collect::<std::collections::BTreeSet<_>>();
        let data = data
            .into_iter()
            .filter(|(key, _)| used.contains(key))
            .collect::<BTreeMap<_, _>>();
        let widgets=compiled.values().flat_map(|p|p.widgets.clone()).collect::<BTreeMap<_,_>>();
        let id = format!(
            "executable-m4-v1:{:x}",
            Sha256::digest(
                if !widgets.is_empty() {
                    serde_json::to_vec(&("executable-widgets-v1",&bundle.root,&sources,&data,&widgets))
                } else if data.is_empty() {
                    serde_json::to_vec(&("executable-m4-v1", &bundle.root, &sources))
                } else {
                    serde_json::to_vec(&("executable-data-v1", &bundle.root, &sources, &data))
                }
                .expect("source strings serialize")
            )
        );
        let patterns = compiled
            .into_values()
            .map(|p| (p.snapshot_id().to_owned(), p))
            .collect();
        let version=if !widgets.is_empty(){3}else if data.is_empty(){1}else{2};
        Ok(Self {
            inner: SnapshotData {
                widgets,
                version,
                id,
                root_name: bundle.root,
                root_revision,
                sources,
                data,
                patterns,
            },
        })
    }
    /// Borrow the content-derived identity of the root and its exact source closure.
    pub fn id(&self) -> &str {
        &self.inner.id
    }
    /// Borrow the compiled root; construction and restore guarantee its revision is present.
    pub fn root(&self) -> &CompiledPattern {
        &self.inner.patterns[&self.inner.root_revision]
    }
    /// Borrow the exact source closure used to build this snapshot.
    pub fn sources(&self) -> &BTreeMap<String, String> {
        &self.inner.sources
    }
    /// Borrow the exact resource closure used by this snapshot.
    pub fn data(&self) -> &BTreeMap<String, crate::data::DataLibrary> {
        &self.inner.data
    }

    /// Iterate over compiled patterns in revision-key order.
    pub fn patterns(&self) -> impl Iterator<Item = &CompiledPattern> {
        self.inner
            .patterns
            .values()
            .flat_map(|pattern| std::iter::once(pattern).chain(pattern.flows.values()))
    }
    /// Look up a compiled dependency by its pinned revision; unknown revisions return `None`.
    pub(crate) fn get(&self, revision: &str) -> Option<&CompiledPattern> {
        self.inner.patterns.get(revision).or_else(|| {
            self.inner
                .patterns
                .values()
                .flat_map(|p| p.flows.values())
                .find(|p| p.snapshot_id() == revision)
        })
    }
}

/// Collect nested `use` references and source spans without resolving them.
pub(crate) fn dependencies(statements: &[Statement], found: &mut BTreeMap<String, syntax::Span>) {
    for statement in statements {
        if let Statement::Block(block) = statement {
            if block.kind == "use" {
                if let Some((name, span)) = &block.argument {
                    found.insert(name.clone(), span.clone());
                }
            }
            dependencies(&block.statements, found);
        }
    }
}
/// Compile dependencies before their parent, detecting cycles and enforcing graph limits.
/// Mutates only the caller's staging maps; a failed build never publishes them.
fn visit(
    name: &str,
    sources: &BTreeMap<String, String>,
    stack: &mut Vec<String>,
    compiled: &mut BTreeMap<String, CompiledPattern>,
    heights: &mut BTreeMap<String, usize>,
    data: &BTreeMap<String, crate::data::DataLibrary>,
    widgets: &crate::widgets::Packages,
) -> Result<(), BuildError> {
    if stack.iter().any(|item| item == name) {
        return Err(error(
            name,
            format!(
                "Recursive Pattern dependency: {} -> {name}",
                stack.join(" -> ")
            ),
        ));
    }
    if compiled.contains_key(name) {
        return Ok(());
    }
    if stack.len() >= 64 || compiled.len() + stack.len() >= 1024 {
        return Err(error(
            name,
            "Dependency graph exceeds the build limit (64 depth / 1024 patterns)",
        ));
    }
    if syntax::reference(name, 0).is_err() {
        return Err(error(
            name,
            "Pattern names must be dot-separated identifiers",
        ));
    }
    let source = sources
        .get(name)
        .ok_or_else(|| error(name, "Missing local Pattern source"))?;
    let parsed = syntax::parse(source).map_err(|diagnostics| BuildError {
        pattern: name.into(),
        diagnostics,
    })?;
    let mut found = BTreeMap::new();
    dependencies(&parsed.statements, &mut found);
    for flow in &parsed.flows {
        dependencies(&flow.statements, &mut found);
    }
    for flow in &parsed.flows {
        found.remove(&flow.argument.as_ref().unwrap().0);
    }
    for import in syntax::imports(&parsed.declarations).map_err(|diagnostic| BuildError {
        pattern: name.into(),
        diagnostics: vec![diagnostic],
    })? {
        found.insert(import.alias, import.span);
    }
    stack.push(name.into());
    let mut interfaces = BTreeMap::new();
    let mut height = 1;
    for (child, span) in found {
        if !sources.contains_key(&child) {
            return Err(BuildError {
                pattern: name.into(),
                diagnostics: vec![Diagnostic::error(
                    "D002",
                    format!("Missing local Pattern '{child}'"),
                    span,
                )],
            });
        }
        visit(&child, sources, stack, compiled, heights, data,widgets)?;
        height = height.max(heights[&child] + 1);
        if height > 64 {
            return Err(error(name, "Dependency graph exceeds 64 levels"));
        }
        interfaces.insert(child.clone(), compiled[&child].interface());
    }
    let pattern =
        compiler::compile_with_widget_environment(source, interfaces, data,widgets).map_err(|diagnostics| {
            BuildError {
                pattern: name.into(),
                diagnostics,
            }
        })?;
    stack.pop();
    heights.insert(name.into(), height);
    compiled.insert(name.into(), pattern);
    Ok(())
}
