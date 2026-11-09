//! Structured decisions retain their authored tree and lower to the existing forward graph.
use super::*;

/// Recognize an arm only immediately inside a decision, never inside Markdown.
pub(super) fn arm(line: &str, offset: usize, span: Span) -> Result<Block, Vec<Diagnostic>> {
    let raw = line.strip_suffix('{').unwrap().trim_end();
    let attribute = attribute(raw, offset, span.clone())?;
    if !matches!(attribute.name.as_str(), "case" | "when" | "else")
        || (attribute.name == "else" && !attribute.raw.is_empty())
        || (attribute.name != "else" && attribute.raw.is_empty())
    {
        return Err(vec![Diagnostic::error(
            "P026",
            "Expected :case value {, :when condition {, or :else {",
            span,
        )]);
    }
    Ok(Block {
        kind: format!("arm_{}", attribute.name),
        binding: None,
        argument: Some((
            attribute.raw.clone(),
            attribute.raw_offset..attribute.raw_offset + attribute.raw.len(),
        )),
        attributes: vec![],
        body: vec![],
        statements: vec![],
        span,
    })
}

/// Expand structured arms without rewriting source or adding a second execution engine.
pub(crate) fn flatten(statements: Vec<Statement>) -> Result<Vec<Statement>, Diagnostic> {
    expand(statements, &mut 0, 0, false)
}

/// Allocate unspellable labels so authored labels cannot capture a generated continuation.
fn expand(
    statements: Vec<Statement>,
    serial: &mut usize,
    depth: usize,
    inside: bool,
) -> Result<Vec<Statement>, Diagnostic> {
    if depth > 32 {
        return Err(Diagnostic::error(
            "P026",
            "Structured decisions may nest at most 32 levels",
            statements.first().map_or(0..0, Statement::span),
        ));
    }
    let mut result = vec![];
    for statement in statements {
        if inside
            && (matches!(&statement, Statement::Label(_))
                || matches!(&statement, Statement::Jump { target, .. } if target.text != "end"))
        {
            return Err(Diagnostic::error("P026", "Use local branches or -> end inside a structured arm; labels and escaping jumps are not allowed", statement.span()));
        }
        let Statement::Block(mut decision) = statement else {
            result.push(statement);
            continue;
        };
        if inside
            && matches!(decision.kind.as_str(), "?match" | "?branch")
            && decision.statements.is_empty()
        {
            return Err(Diagnostic::error("P026", "Use local decision arms inside a structured arm; label-target dispatch could escape the block", decision.span));
        }
        if !matches!(decision.kind.as_str(), "?match" | "?branch") || decision.statements.is_empty()
        {
            result.push(Statement::Block(decision));
            continue;
        }
        if !decision.attributes.is_empty()
            || decision.body.iter().any(|l| !l.text.trim().is_empty())
        {
            return Err(Diagnostic::error(
                "P026",
                "Do not mix local arms with label-target arms or Markdown",
                decision.span,
            ));
        }
        *serial += 1;
        let prefix = format!("$decision{serial}");
        let join = format!("{prefix}_join");
        let close = decision.span.end.saturating_sub(1)..decision.span.end;
        let mut bodies = vec![];
        for (index, statement) in std::mem::take(&mut decision.statements)
            .into_iter()
            .enumerate()
        {
            let Statement::Block(arm) = statement else {
                return Err(Diagnostic::error(
                    "P026",
                    "A structured decision contains only local arms",
                    statement.span(),
                ));
            };
            let expected = if decision.kind == "?match" {
                "arm_case"
            } else {
                "arm_when"
            };
            if arm.kind != expected && arm.kind != "arm_else" {
                return Err(Diagnostic::error(
                    "P026",
                    "Unexpected local arm for this decision",
                    arm.span,
                ));
            }
            if !arm.attributes.is_empty() || arm.body.iter().any(|l| !l.text.trim().is_empty()) {
                return Err(Diagnostic::error(
                    "P026",
                    "Put actions inside a local arm",
                    arm.span,
                ));
            }
            let label = format!("{prefix}_{index}");
            let (value, value_span) = arm.argument.ok_or_else(|| {
                Diagnostic::error(
                    "P026",
                    "Use :case, :when, or :else to declare a local arm",
                    arm.span.clone(),
                )
            })?;
            decision.attributes.push(Attribute {
                name: arm.kind.strip_prefix("arm_").unwrap().into(),
                args: vec![],
                raw: format!("{value} -> {label}"),
                raw_offset: value_span.start,
                span: arm.span.clone(),
            });
            bodies.push(Statement::Label(Word {
                text: label,
                quoted: false,
                span: arm.span.clone(),
            }));
            let expanded = expand(arm.statements, serial, depth + 1, true)?;
            let ends = matches!(expanded.last(), Some(Statement::Jump { target, .. }) if target.text == "end");
            bodies.extend(expanded);
            if !ends {
                bodies.push(Statement::Jump {
                    target: Word {
                        text: join.clone(),
                        quoted: false,
                        span: close.clone(),
                    },
                    span: close.clone(),
                });
            }
        }
        // The dispatch occupies its header; child source spans remain independently editable.
        decision.span.end = decision
            .argument
            .as_ref()
            .map_or(decision.span.start + 9, |(_, span)| span.end + 1);
        result.push(Statement::Block(decision));
        result.extend(bodies);
        result.push(Statement::Label(Word {
            text: join,
            quoted: false,
            span: close,
        }));
    }
    Ok(result)
}
