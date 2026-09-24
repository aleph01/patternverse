//! Surface syntax for explicitly effectful semantic operations and declarations.
use super::*;

/// Locate an unquoted, top-level semantic operator; quoted instructions remain literal data.
pub(super) fn operation(source: &str) -> Option<(&str, &str, &str)> {
    let mut quoted = false;
    let mut escaped = false;
    let mut depth = 0usize;
    for (i, c) in source.char_indices() {
        if quoted {
            if escaped {
                escaped = false;
            } else if c == '\\' {
                escaped = true;
            } else if c == '"' {
                quoted = false;
            }
            continue;
        }
        match c {
            '"' => quoted = true,
            '(' | '[' | '{' => depth += 1,
            ')' | ']' | '}' => depth = depth.saturating_sub(1),
            _ => {}
        }
        if depth != 0 || quoted {
            continue;
        }
        if let Some(rest) = source[i..].strip_prefix("?~") {
            return Some(("classify", source[..i].trim(), rest.trim()));
        }
        if let Some(rest) = source[i..].strip_prefix("|>") {
            for name in ["select", "filter", "rank"] {
                if let Some(tail) = rest
                    .trim_start()
                    .strip_prefix(name)
                    .and_then(|s| s.trim_start().strip_prefix('~'))
                {
                    return Some((name, source[..i].trim(), tail.trim()));
                }
            }
        }
    }
    None
}

/// Build a semantic binding without interpolating participant values into its authored criteria.
pub(super) fn binding_header(
    name: &str,
    rhs: &str,
    line: &str,
    offset: usize,
    span: Span,
) -> Option<Result<(Block, bool), Vec<Diagnostic>>> {
    let mut block = Block {
        kind: String::new(),
        binding: Some(Word {
            text: name.into(),
            quoted: false,
            span: offset..offset + name.len(),
        }),
        attributes: vec![],
        body: vec![],
        statements: vec![],
        argument: None,
        span: span.clone(),
    };
    if let Some(specification) = rhs.strip_prefix('~').map(str::trim) {
        block.kind = "bound_realize".into();
        let explicit = specification == "{";
        if !explicit {
            block.body.push(BodyLine {
                text: specification.into(),
                span: offset + line.len() - specification.len()..span.end,
            });
        }
        return Some(Ok((block, explicit)));
    }
    let (kind, input, tail) = operation(rhs)?;
    let explicit = tail.ends_with('{');
    let tail = if explicit {
        tail[..tail.len() - 1].trim()
    } else {
        tail
    };
    block.kind = if kind == "classify" {
        "classify".into()
    } else {
        format!("semantic_{kind}")
    };
    block.attributes.push(Attribute {
        name: "input".into(),
        args: vec![],
        raw: input.into(),
        raw_offset: offset + line.find(input).unwrap_or(0),
        span: span.clone(),
    });
    if kind == "classify" {
        if !is_identifier(tail) {
            return Some(Err(vec![Diagnostic::error(
                "P024",
                "Expected input ?~ classifier_name { :with context = value }",
                span,
            )]));
        }
        block.argument = Some((tail.into(), span));
    } else if !tail.is_empty() {
        block.body.push(BodyLine {
            text: tail.into(),
            span: offset + line.rfind(tail).unwrap_or(0)
                ..offset + line.rfind(tail).unwrap_or(0) + tail.len(),
        });
    }
    Some(Ok((block, explicit)))
}

/// Parse a closed enum declaration into ordinary header data for semantic validation.
pub(super) fn enum_declaration(
    line: &str,
    offset: usize,
    span: Span,
) -> Result<Attribute, Vec<Diagnostic>> {
    let Some((name, variants)) = line[5..].split_once('=') else {
        return Err(vec![Diagnostic::error(
            "P024",
            "Expected type Name = first | second",
            span,
        )]);
    };
    // Allow a leading pipe for multiline declarations, but never empty alternatives.
    let variants = variants.trim().strip_prefix('|').unwrap_or(variants.trim());
    let values = std::iter::once(name.trim()).chain(variants.split('|').map(str::trim));
    let args = values
        .map(|text| Word {
            text: text.into(),
            quoted: false,
            span: span.clone(),
        })
        .collect();
    Ok(Attribute {
        name: "enum".into(),
        args,
        raw: line.into(),
        raw_offset: offset,
        span,
    })
}

/// Parse a named classifier header; all context and category rules live in its explicit body.
pub(super) fn classifier_header(line: &str, span: Span) -> Result<Block, Vec<Diagnostic>> {
    let fail = || {
        vec![Diagnostic::error(
            "P024",
            "Expected classifier name -> Enum {",
            span.clone(),
        )]
    };
    let (name, ty) = line
        .strip_prefix("classifier ")
        .and_then(|s| s.strip_suffix('{'))
        .and_then(|s| s.split_once("->"))
        .ok_or_else(fail)?;
    if !is_identifier(name.trim()) || !is_identifier(ty.trim()) {
        return Err(fail());
    }
    Ok(Block {
        kind: "classifier".into(),
        binding: Some(Word {
            text: name.trim().into(),
            quoted: false,
            span: span.clone(),
        }),
        argument: Some((ty.trim().into(), span.clone())),
        attributes: vec![],
        body: vec![],
        statements: vec![],
        span,
    })
}
