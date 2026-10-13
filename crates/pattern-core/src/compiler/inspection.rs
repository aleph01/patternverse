//! Read-only editor projections from the validated AST; never a second interpreter.
use super::*;
mod authoring;
pub use authoring::{PathArm, Paths, Rule, SourceAttribute, SourceField, SourceStatement};

#[derive(Clone, Debug, Serialize)]
pub struct Binding {
    pub name: String,
    pub slot: usize,
    pub value_type: Type,
    pub span: Span,
}

#[derive(Clone, Debug, Serialize)]
pub struct Step {
    pub kind: &'static str,
    pub binding: Option<String>,
    pub dependency: Option<String>,
    pub targets: Vec<usize>,
    pub span: Span,
    pub locals: Vec<Binding>,
    pub children: Vec<Step>,
    pub text: String,
    pub edges: Vec<Edge>,
}

#[derive(Clone, Debug, Serialize)]
pub struct Edge {
    pub target: usize,
    pub label: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct Inspection {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message_handler: Option<String>,
    pub title: Option<String>,
    pub revision: String,
    pub inputs: BTreeMap<String, Type>,
    pub outputs: BTreeMap<String, Type>,
    pub bindings: Vec<Binding>,
    pub steps: Vec<Step>,
    /// Lossless editing ranges from the existing parser, not executable instructions.
    pub source_statements: Vec<SourceStatement>,
    /// Only independently owned, linear arms are grouped for visual editing.
    pub paths: Vec<Paths>,
    pub dependencies: BTreeMap<String, String>,
}

impl CompiledPattern {
    /// Derive an editor outline from the validated source and its exact dependency interfaces.
    /// This projection cannot be submitted to the runtime as executable instructions.
    ///
    /// # Errors
    /// Returns diagnostics if the compiled value's source or pinned interfaces are invalid.
    pub fn inspect(&self) -> Result<Inspection, Vec<Diagnostic>> {
        let parsed = syntax::parse(&self.source)?;
        let checked = check(parsed.clone(), self.dependencies.clone()).map_err(|e| vec![e])?;
        let steps = outline(&checked.steps, &self.source);
        let source_statements = authoring::statements(&parsed.statements, &self.source);
        let paths = authoring::paths(&checked.steps, &steps, &source_statements, &self.source);
        Ok(Inspection {
            message_handler: self.message_handler.clone(),
            title: checked.title,
            revision: self.snapshot_id.clone(),
            inputs: self.input_types(),
            outputs: self.output_types.clone(),
            bindings: bindings(&checked.symbols),
            steps,
            source_statements,
            paths,
            dependencies: self
                .dependencies
                .iter()
                .map(|(name, value)| (name.clone(), value.id.clone()))
                .collect(),
        })
    }
}

/// Retain lexical names and type contracts; local slots are scoped, not global runtime addresses.
fn bindings(symbols: &Scope) -> Vec<Binding> {
    symbols
        .iter()
        .map(|(name, symbol)| Binding {
            name: name.clone(),
            slot: symbol.id.0,
            value_type: symbol.value_type.clone(),
            span: symbol.span.clone(),
        })
        .collect()
}

/// Preserve validated statement ordering and nested collection scopes without interpreting flow.
fn outline(steps: &[(CheckedStep, Span)], source: &str) -> Vec<Step> {
    steps
        .iter()
        .enumerate()
        .map(|(index, (step, span))| {
            let (kind, binding) = match step {
                CheckedStep::Form { binding, .. } => ("form", Some(binding)),
                CheckedStep::Realize { binding, .. } => ("realize", Some(binding)),
                CheckedStep::Classify { binding, .. } => ("classify", Some(binding)),
                CheckedStep::Suggest { binding, .. } => ("suggest", Some(binding)),
                CheckedStep::Refine(body) => ("refine", Some(&body.binding)),
                CheckedStep::Propose(_) => ("propose", None),
                CheckedStep::Yield(_) => ("yield", None),
                CheckedStep::Ask { binding, .. } => ("ask", Some(binding)),
                CheckedStep::Timer { binding, .. } => ("timer", Some(binding)),
                CheckedStep::Loop(body) => ("loop", Some(&body.binding)),
                CheckedStep::Repeat(_) => ("repeat", None),
                CheckedStep::Break => ("break", None),
                CheckedStep::Rate { binding, .. } => ("rate", Some(binding)),
                CheckedStep::Choose { binding, .. } => ("choose", Some(binding)),
                CheckedStep::Select {
                    binding, selection, ..
                } => (
                    match selection.mode {
                        SelectionMode::Single => "choose",
                        SelectionMode::Multi => "multi",
                        SelectionMode::Rank => "rank",
                    },
                    Some(binding),
                ),
                CheckedStep::Generate { binding, .. } => ("generate", Some(binding)),
                CheckedStep::Derive { binding, .. } => ("derive", Some(binding)),
                CheckedStep::Use { binding, .. } => ("use", Some(binding)),
                CheckedStep::Collect(body) => (
                    if matches!(body.mode, CheckedCollectionMode::Mapped { .. })
                        && body
                            .steps
                            .iter()
                            .any(|(step, _)| matches!(step, CheckedStep::Yield(_)))
                    {
                        "each"
                    } else {
                        "collect"
                    },
                    Some(&body.binding),
                ),
                CheckedStep::Turn { binding, .. } => ("turn", binding.as_ref()),
                CheckedStep::Image { .. } => ("image", None),
                CheckedStep::Video { .. } => ("video", None),
                CheckedStep::Show { .. } | CheckedStep::ShowCollection { .. } => ("show", None),
                CheckedStep::Branch { .. } => ("branch", None),
                CheckedStep::Match { .. } => ("match", None),
                CheckedStep::Jump(_) => ("jump", None),
                CheckedStep::End => ("end", None),
            };
            let targets = match step {
                CheckedStep::Branch { arms, otherwise } => arms
                    .iter()
                    .map(|(_, id)| id.0)
                    .chain([otherwise.0])
                    .collect(),
                CheckedStep::Match {
                    cases,
                    otherwise,
                    has_fallback,
                    ..
                } => cases
                    .iter()
                    .map(|(_, id)| id.0)
                    .chain(has_fallback.then_some(otherwise.0))
                    .collect(),
                CheckedStep::Jump(id) => vec![id.0],
                _ => vec![],
            };
            let (locals, children) = match step {
                CheckedStep::Refine(body) => (bindings(&body.locals), outline(&body.steps, source)),
                CheckedStep::Loop(body) => (bindings(&body.locals), outline(&body.steps, source)),
                CheckedStep::Collect(body) => {
                    (bindings(&body.locals), outline(&body.steps, source))
                }
                _ => (vec![], vec![]),
            };
            Step {
                kind,
                binding: binding.cloned(),
                dependency: match step {
                    CheckedStep::Use { name, .. } => Some(name.clone()),
                    _ => None,
                },
                targets,
                span: span.clone(),
                locals,
                children,
                text: step_text(step, source),
                edges: edges(step, index, steps.len(), source),
            }
        })
        .collect()
}

/// Project readable templates without resolving references or executing expressions.
fn step_text(step: &CheckedStep, source: &str) -> String {
    if let CheckedStep::Form { form, .. } = step {
        return form
            .title
            .clone()
            .unwrap_or_else(|| "Grouped questions".into());
    }
    if let CheckedStep::ShowCollection { spec, .. } = step {
        return format!("Show {{{{{}}}}}", spec.source);
    }
    let parts = match step {
        CheckedStep::Realize { prompt, .. }
        | CheckedStep::Suggest {
            criteria: prompt, ..
        }
        | CheckedStep::Ask { prompt, .. }
        | CheckedStep::Timer { prompt, .. }
        | CheckedStep::Rate { prompt, .. }
        | CheckedStep::Choose { prompt, .. }
        | CheckedStep::Select { prompt, .. }
        | CheckedStep::Generate { prompt, .. }
        | CheckedStep::Turn { prompt, .. } => prompt,
        CheckedStep::Image { body, .. }
        | CheckedStep::Video { body, .. }
        | CheckedStep::Show { body } => body,
        CheckedStep::Classify { definition, .. } => {
            return format!(
                "{} → {} (AI interpretation)",
                definition.name, definition.output.name
            )
        }
        CheckedStep::Derive { expression, .. } => return source[expression.span.clone()].into(),
        CheckedStep::Match { subject, .. } => return source[subject.span.clone()].into(),
        CheckedStep::Loop(body) => {
            return body.max.map_or_else(
                || "Repeat until you stop · always cancellable".into(),
                |max| format!("Up to {max} iterations · always cancellable"),
            )
        }
        CheckedStep::Repeat(expression)
        | CheckedStep::Propose(expression)
        | CheckedStep::Yield(expression) => return source[expression.span.clone()].into(),
        CheckedStep::Refine(body) => {
            return format!(
                "Review wording · {} revision rounds{}",
                body.config.rounds,
                if body.config.renewable {
                    " · renewable"
                } else {
                    ""
                }
            )
        }
        _ => return String::new(),
    };
    parts
        .iter()
        .map(|part| match part {
            CheckedPart::Literal(text) => text.clone(),
            CheckedPart::Realize { specification, .. } => format!("~ {specification}"),
            CheckedPart::Reference(name, field) => {
                let suffix = field
                    .as_ref()
                    .map(|field| format!(".{}", field.0.join(".")))
                    .unwrap_or_default();
                format!("{{{{{name}{suffix}}}}}")
            }
        })
        .collect()
}

/// Expose exact outgoing targets in this lexical scope, including ordinary fallthrough.
fn edges(step: &CheckedStep, index: usize, count: usize, source: &str) -> Vec<Edge> {
    match step {
        CheckedStep::Branch { arms, otherwise } => arms
            .iter()
            .map(|(condition, target)| Edge {
                target: target.0,
                label: source[condition.span.clone()].into(),
            })
            .chain([Edge {
                target: otherwise.0,
                label: "Otherwise".into(),
            }])
            .collect(),
        CheckedStep::Match {
            cases,
            otherwise,
            has_fallback,
            ..
        } => cases
            .iter()
            .map(|(case, target)| Edge {
                target: target.0,
                label: match case {
                    Case::Text(value) | Case::Choice(value) | Case::Enum(value) => value.clone(),
                    Case::Number(value) => value.to_string(),
                    Case::Boolean(value) => value.to_string(),
                },
            })
            .chain(has_fallback.then(|| Edge {
                target: otherwise.0,
                label: "Otherwise".into(),
            }))
            .collect(),
        CheckedStep::Jump(target) => vec![Edge {
            target: target.0,
            label: String::new(),
        }],
        CheckedStep::Repeat(_) => vec![Edge {
            target: 0,
            label: "Repeat with next state".into(),
        }],
        CheckedStep::End | CheckedStep::Break | CheckedStep::Yield(_) => vec![],
        _ if index + 1 < count => vec![Edge {
            target: index + 1,
            label: String::new(),
        }],
        _ => vec![],
    }
}
