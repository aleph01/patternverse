//! Functional surface forms normalized to the existing immutable flow AST.
use super::*;

/// Recognize a canonical immutable binding, never equality or an arbitrary Markdown sentence.
pub(super) fn binding(line: &str) -> Option<(&str, &str)> {
    let (name, rhs) = line.split_once('=')?;
    let name = name.trim();
    let rhs = rhs.trim();
    (is_identifier(name) && !rhs.starts_with('=')).then_some((name, rhs))
}

/// Identify pure expression statements whose literals may span multiple source lines.
pub(super) fn is_pure_line(line: &str) -> bool {
    line.starts_with("fn ")
        || line.starts_with("-> yield ")
        || line.starts_with("-> propose ")
        || line.starts_with("-> repeat ")
        || line.starts_with("type ")
        || binding(line).is_some_and(|(_, rhs)| !effectful(rhs))
}

/// Keep effectful right-hand sides out of the pure-expression grammar.
pub(super) fn effectful(rhs: &str) -> bool {
    rhs.starts_with('!')
        || rhs.starts_with('~')
        || rhs.starts_with("each ")
        || super::semantic::operation(rhs).is_some()
}

/// Continue multiline literals only while delimiters remain open outside JSON strings.
pub(super) fn needs_more(source: &str) -> bool {
    let mut depth = 0usize;
    let mut quoted = false;
    let mut escaped = false;
    for c in source.chars() {
        if quoted {
            if escaped {
                escaped = false;
            } else if c == '\\' {
                escaped = true;
            } else if c == '"' {
                quoted = false;
            }
        } else {
            match c {
                '"' => quoted = true,
                '[' | '{' | '(' => depth += 1,
                ']' | '}' | ')' => depth = depth.saturating_sub(1),
                _ => {}
            }
        }
    }
    depth > 0
        || source.trim_end().ends_with('=')
        || source.trim_end().ends_with("=>")
        || source.trim_end().ends_with("|>")
}

/// Normalize only top-level effect bindings; effects nested inside pure expressions remain invalid.
pub(super) fn header(
    line: &str,
    offset: usize,
    span: Span,
) -> Result<(Block, bool), Vec<Diagnostic>> {
    let (name, rhs) = binding(line).unwrap();
    if let Some(block) = super::semantic::binding_header(name, rhs, line, offset, span.clone()) {
        return block;
    }
    let fail = || {
        vec![Diagnostic::error(
            "P023",
            "Expected name = !effect { ... } or name = each item in list { ... }",
            span.clone(),
        )]
    };
    if let Some(rest) = rhs.strip_prefix("!refine[") {
        let (parameters, tail) = rest.split_once(']').ok_or_else(fail)?;
        let initial = tail.trim().strip_suffix('{').ok_or_else(fail)?.trim();
        let normalized = format!("!refine[{parameters}] {name} = {initial} {{");
        let (mut block, explicit) = super::refinement_header(&normalized, offset, span.clone())?;
        block.binding = Some(Word {
            text: name.into(),
            quoted: false,
            span: offset..offset + name.len(),
        });
        let attribute = block
            .attributes
            .iter_mut()
            .find(|a| a.name == "initial")
            .unwrap();
        attribute.raw_offset = offset + line.rfind(initial).ok_or_else(fail)?;
        return Ok((block, explicit));
    }
    if let Some(rest) = rhs.strip_prefix("each ") {
        let rest = rest.strip_suffix('{').ok_or_else(fail)?.trim();
        let (alias, source) = rest.split_once(" in ").ok_or_else(fail)?;
        if !is_identifier(alias.trim()) || source.trim().is_empty() {
            return Err(fail());
        }
        return Ok((
            Block {
                kind: "each".into(),
                binding: Some(Word {
                    text: name.into(),
                    quoted: false,
                    span: offset..offset + name.len(),
                }),
                attributes: vec![
                    Attribute {
                        name: "as".into(),
                        args: vec![Word {
                            text: alias.trim().into(),
                            quoted: false,
                            span: span.clone(),
                        }],
                        raw: alias.trim().into(),
                        raw_offset: offset,
                        span: span.clone(),
                    },
                    Attribute {
                        name: "from".into(),
                        args: vec![],
                        raw: source.trim().into(),
                        raw_offset: offset + line.rfind(source.trim()).unwrap(),
                        span: span.clone(),
                    },
                ],
                argument: None,
                body: vec![],
                statements: vec![],
                span,
            },
            true,
        ));
    }
    let end = rhs
        .find(|c: char| c.is_whitespace() || c == '[' || c == '{')
        .unwrap_or(rhs.len());
    let kind = &rhs[..end];
    let tail = rhs[end..].trim_start();
    if !matches!(
        kind,
        "!ask"
            | "!rate"
            | "!choose"
            | "!rank"
            | "!agent"
            | "!turn"
            | "!use"
            | "!collect"
            | "!refine"
    ) {
        return Err(fail());
    }
    let normalized = if kind == "!use" {
        let child = tail.trim_end_matches('{').trim();
        format!(
            "!use {child} as {name} {}",
            if tail.ends_with('{') { "{" } else { "" }
        )
    } else {
        format!("{kind} {name} {tail}")
    };
    let (mut block, explicit) =
        super::header(normalized.trim(), offset, span.clone()).map_err(|mut errors| {
            for error in &mut errors {
                error.primary = span.clone();
                for (secondary, _) in &mut error.secondary {
                    *secondary = span.clone();
                }
            }
            errors
        })?;
    // Normalizing rearranges the header. Never expose synthetic offsets as source locations.
    if let Some((text, argument_span)) = &mut block.argument {
        let start = offset + line.rfind(text.as_str()).unwrap_or(0);
        *argument_span = start..start + text.len();
    }
    for attribute in &mut block.attributes {
        attribute.span = span.clone();
        attribute.raw_offset = offset + line.rfind(&attribute.raw).unwrap_or(0);
        for word in &mut attribute.args {
            word.span = span.clone();
        }
    }
    block.binding = Some(Word {
        text: name.into(),
        quoted: false,
        span: offset..offset + name.len(),
    });
    block.span = span;
    Ok((block, explicit))
}
