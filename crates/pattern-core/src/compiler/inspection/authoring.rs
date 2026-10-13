//! Editing projections only. The parser, compiler and runtime remain authoritative.
use super::*;

#[derive(Clone, Debug, Serialize)]
pub struct SourceField {
    pub value: String,
    pub span: Span,
}

#[derive(Clone, Debug, Serialize)]
pub struct SourceAttribute {
    pub name: String,
    pub span: Span,
    pub args: Vec<SourceField>,
    pub raw: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct SourceStatement {
    pub kind: String,
    pub span: Span,
    pub binding: Option<SourceField>,
    pub argument: Option<SourceField>,
    pub body: Option<SourceField>,
    pub attributes: Vec<SourceAttribute>,
}

#[derive(Clone, Debug, Serialize)]
pub struct Rule {
    pub response: String,
    pub operator: &'static str,
    pub value: f64,
}

#[derive(Clone, Debug, Serialize)]
pub struct PathArm {
    pub attribute: Span,
    pub value: String,
    pub rule: Option<Rule>,
    pub target: String,
    /// Includes the owned entry label and its instructions, excluding the outgoing jump.
    pub content: Span,
    pub terminal: Span,
    pub destination: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct Paths {
    pub control: Span,
    pub span: Span,
    pub mode: &'static str,
    pub response: Option<String>,
    pub arms: Vec<PathArm>,
    pub continuation: Option<String>,
    pub continuation_span: Option<Span>,
}

/// Copy an authored token with its exact UTF-8 editing range.
fn word(word: &Word) -> SourceField {
    SourceField {
        value: word.text.clone(),
        span: word.span.clone(),
    }
}

/// Preserve exact source bytes. Unknown/advanced statements receive source-only fields.
pub(super) fn statements(statements: &[Statement], source: &str) -> Vec<SourceStatement> {
    statements
        .iter()
        .map(|statement| {
            let (kind, binding, argument, body, attributes) = match statement {
                Statement::Block(block) => {
                    let body = if block.statements.is_empty() && !block.body.is_empty() {
                        let span = block.body.first().unwrap().span.start
                            ..block.body.last().unwrap().span.end;
                        Some(SourceField {
                            value: source[span.clone()].into(),
                            span,
                        })
                    } else if block.statements.is_empty()
                        && source[block.span.clone()].ends_with('}')
                    {
                        let point = source[..block.span.end - 1]
                            .rfind('\n')
                            .map_or(block.span.end - 1, |i| i + 1);
                        Some(SourceField {
                            value: String::new(),
                            span: point..point,
                        })
                    } else {
                        None
                    };
                    (
                        block.kind.clone(),
                        block.binding.as_ref().map(word),
                        block.argument.as_ref().map(|(value, span)| SourceField {
                            value: value.clone(),
                            span: span.clone(),
                        }),
                        body,
                        block
                            .attributes
                            .iter()
                            .map(|a| SourceAttribute {
                                name: a.name.clone(),
                                span: a.span.clone(),
                                args: a.args.iter().map(word).collect(),
                                raw: a.raw.clone(),
                            })
                            .collect(),
                    )
                }
                Statement::Label(label) => ("label".into(), None, Some(word(label)), None, vec![]),
                Statement::Jump { target, .. } => {
                    ("jump".into(), None, Some(word(target)), None, vec![])
                }
                _ => ("source".into(), None, None, None, vec![]),
            };
            SourceStatement {
                kind,
                span: statement.span(),
                binding,
                argument,
                body,
                attributes,
            }
        })
        .collect()
}

/// Project supported scalar comparisons; leave compound expressions in Source.
fn simple_rule(expression: &CheckedExpr) -> Option<Rule> {
    let Kind::Binary(operator, left, right) = &expression.kind else {
        return None;
    };
    let Kind::Reference((response, None)) = &left.kind else {
        return None;
    };
    let value = match &right.kind {
        Kind::Literal(Value::Number(value)) => *value,
        Kind::Unary(Unary::Negate, value) => match value.kind {
            Kind::Literal(Value::Number(n)) => -n,
            _ => return None,
        },
        _ => return None,
    };
    let operator = match operator {
        expression::Binary::Less => "<",
        expression::Binary::LessEqual => "<=",
        expression::Binary::Greater => ">",
        expression::Binary::GreaterEqual => ">=",
        expression::Binary::Equal => "==",
        expression::Binary::NotEqual => "!=",
        _ => return None,
    };
    Some(Rule {
        response: response.clone(),
        operator,
        value,
    })
}

/// Group only a conservative source shape: distinct labelled linear paths, each ending
/// in an explicit forward jump or completion. Arbitrary graphs stay lossless source blocks.
pub(super) fn paths(
    checked: &[(CheckedStep, Span)],
    steps: &[Step],
    statements: &[SourceStatement],
    source: &str,
) -> Vec<Paths> {
    (0..steps.len())
        .filter_map(|index| project_paths(index, checked, steps, statements, source))
        .collect()
}

/// Group only independently owned arms whose labels, jumps and shared join can be edited safely.
fn project_paths(
    index: usize,
    checked: &[(CheckedStep, Span)],
    steps: &[Step],
    statements: &[SourceStatement],
    source: &str,
) -> Option<Paths> {
    let step = &steps[index];
    let (mode, response, rules) = match &checked[index].0 {
        CheckedStep::Match {
            subject,
            cases,
            has_fallback: true,
            ..
        } => {
            if cases.iter().any(|(case, _)| matches!(case, Case::Enum(_))) {
                return None;
            }
            let Kind::Reference((name, None)) = &subject.kind else {
                return None;
            };
            ("match", Some(name.clone()), vec![None; step.edges.len()])
        }
        CheckedStep::Branch { arms, .. } => {
            let rules: Vec<_> = arms
                .iter()
                .map(|(e, _)| simple_rule(e))
                .chain([None])
                .collect();
            let response = rules.iter().flatten().next().map(|r| r.response.clone());
            if rules[..rules.len() - 1].iter().any(|r| {
                r.as_ref()
                    .is_none_or(|r| Some(&r.response) != response.as_ref())
            }) {
                return None;
            }
            ("branch", response, rules)
        }
        _ => return None,
    };
    let control = statements.iter().find(|s| s.span == step.span)?;
    if control.attributes.len() != step.edges.len() {
        return None;
    }
    let mut starts = BTreeSet::new();
    let mut occupied = BTreeSet::from([index]);
    let mut arms = vec![];
    let mut continuations = BTreeSet::new();
    let mut region_end = step.span.end;
    for (arm_index, edge) in step.edges.iter().enumerate() {
        // Direct shared targets and direct -> end are intentionally left in Source: no
        // independently owned path exists to safely insert/delete blocks inside them.
        if edge.target <= index || edge.target >= steps.len() || !starts.insert(edge.target) {
            return None;
        }
        let label = statements
            .iter()
            .filter(|s| {
                s.kind == "label"
                    && s.span.start > step.span.end
                    && s.span.end <= steps[edge.target].span.start
            })
            .next_back()?;
        let target = label.argument.as_ref()?.value.clone();
        let next = statements
            .iter()
            .find(|s| s.kind != "label" && s.span.start >= label.span.end)?;
        if next.span != steps[edge.target].span {
            return None;
        }
        let mut terminal_index = edge.target;
        loop {
            let current = steps.get(terminal_index)?;
            if !occupied.insert(terminal_index) {
                return None;
            }
            if matches!(current.kind, "jump" | "end") {
                break;
            }
            if matches!(current.kind, "branch" | "match")
                || current.edges.len() != 1
                || current.edges[0].target != terminal_index + 1
            {
                return None;
            }
            terminal_index += 1;
        }
        let terminal = &steps[terminal_index];
        let destination = if terminal.kind == "end" {
            "end".into()
        } else {
            let jump = statements
                .iter()
                .find(|s| s.span == terminal.span && s.kind == "jump")?;
            let destination = jump.argument.as_ref()?.value.clone();
            if terminal.edges[0].target <= terminal_index {
                return None;
            }
            continuations.insert(destination.clone());
            destination
        };
        region_end = region_end.max(terminal.span.end);
        arms.push(PathArm {
            attribute: control.attributes[arm_index].span.clone(),
            value: edge.label.clone(),
            rule: rules[arm_index].clone(),
            target,
            content: label.span.start..terminal.span.start,
            terminal: terminal.span.clone(),
            destination,
        });
    }
    // No outside incoming edges, interleaved statements, or aliases may be hidden by grouping.
    let region = step.span.start..region_end;
    if steps.iter().enumerate().any(|(i, s)| {
        s.span.start >= region.start && s.span.end <= region.end && !occupied.contains(&i)
    }) {
        return None;
    }
    if steps.iter().enumerate().any(|(i, s)| {
        !occupied.contains(&i)
            && s.edges
                .iter()
                .any(|e| occupied.contains(&e.target) && e.target != index)
    }) {
        return None;
    }
    let mut physical: Vec<_> = arms.iter().collect();
    physical.sort_by_key(|arm| arm.content.start);
    let mut cursor = step.span.end;
    for arm in physical {
        if !source[cursor..arm.content.start].trim().is_empty() {
            return None;
        }
        // Extra labels are significant aliases and remain in Source.
        if statements
            .iter()
            .filter(|s| {
                s.kind == "label"
                    && s.span.start >= arm.content.start
                    && s.span.end <= arm.terminal.end
            })
            .count()
            != 1
        {
            return None;
        }
        cursor = arm.terminal.end;
    }
    if continuations.len() > 1 {
        return None;
    }
    // Keep an immediately following shared continuation selectable even when every
    // arm currently finishes. No code is removed or made reachable by this projection.
    let continuation = continuations.into_iter().next().or_else(|| {
        statements
            .iter()
            .find(|s| s.span.start >= region_end)
            .and_then(|s| {
                (s.kind == "label" && source[region_end..s.span.start].trim().is_empty())
                    .then(|| s.argument.as_ref().map(|a| a.value.clone()))
                    .flatten()
            })
    });
    let continuation_span = continuation.as_ref().and_then(|name| {
        statements
            .iter()
            .find(|s| s.kind == "label" && s.argument.as_ref().is_some_and(|a| &a.value == name))
            .map(|s| s.span.clone())
    });
    if continuation_span
        .as_ref()
        .is_some_and(|span| span.start < region_end)
    {
        return None;
    }
    Some(Paths {
        control: step.span.clone(),
        span: region,
        mode,
        response,
        arms,
        continuation,
        continuation_span,
    })
}
