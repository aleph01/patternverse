//! Line-oriented Pattern grammar. All spans are UTF-8 byte ranges.
//! Unknown constructs fail closed; later milestones extend this AST, not a Host parser.
use chumsky::{prelude::*, Stream};
use serde::{Deserialize, Serialize};
use std::ops::Range;
mod functional;
mod imports;
mod semantic;
pub use imports::{imports, Import};

pub type Span = Range<usize>;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Severity {
    Error,
    Warning,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Diagnostic {
    pub severity: Severity,
    pub code: String,
    pub message: String,
    pub primary: Span,
    pub secondary: Vec<(Span, String)>,
    pub help: Option<String>,
}

impl Diagnostic {
    /// Construct an error diagnostic with a primary UTF-8 byte span and no secondary labels.
    pub(crate) fn error(code: &str, message: impl Into<String>, primary: Span) -> Self {
        Self {
            severity: Severity::Error,
            code: code.into(),
            message: message.into(),
            primary,
            secondary: vec![],
            help: None,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Word {
    pub text: String,
    pub quoted: bool,
    pub span: Span,
}
#[derive(Clone, Debug)]
pub struct Attribute {
    pub name: String,
    pub args: Vec<Word>,
    pub span: Span,
    pub raw: String,
    pub raw_offset: usize,
}
#[derive(Clone, Debug)]
pub struct BodyLine {
    pub text: String,
    pub span: Span,
}
#[derive(Clone, Debug)]
pub struct Block {
    pub kind: String,
    pub binding: Option<Word>,
    pub attributes: Vec<Attribute>,
    pub body: Vec<BodyLine>,
    pub span: Span,
    pub argument: Option<(String, Span)>,
    pub statements: Vec<Statement>,
}
#[derive(Clone, Debug)]
pub enum Statement {
    Yield {
        expression: String,
        expression_offset: usize,
        span: Span,
    },
    Block(Block),
    Propose {
        expression: String,
        expression_offset: usize,
        span: Span,
    },
    Repeat {
        expression: String,
        expression_offset: usize,
        span: Span,
    },
    Derive {
        binding: Word,
        expression: String,
        expression_offset: usize,
        span: Span,
    },
    Jump {
        target: Word,
        span: Span,
    },
    Label(Word),
}
impl Statement {
    /// Clone the full UTF-8 byte range occupied by this statement.
    pub fn span(&self) -> Span {
        match self {
            Self::Block(b) => b.span.clone(),
            Self::Derive { span, .. }
            | Self::Jump { span, .. }
            | Self::Repeat { span, .. }
            | Self::Propose { span, .. } => span.clone(),
            Self::Yield { span, .. } => span.clone(),
            Self::Label(w) => w.span.clone(),
        }
    }
}
#[derive(Clone, Debug)]
pub struct ParsedPattern {
    pub flows: Vec<Block>,
    pub events: Vec<Block>,
    pub classifiers: Vec<Block>,
    pub(crate) source: String,
    pub declarations: Vec<Attribute>,
    pub statements: Vec<Statement>,
}

/// Parse an ASCII identifier with optional underscores and internal digits or hyphens.
pub(crate) fn identifier() -> impl Parser<char, String, Error = Simple<char>> + Clone {
    filter(|c: &char| c.is_ascii_alphabetic() || *c == '_')
        .chain(filter(|c: &char| c.is_ascii_alphanumeric() || *c == '_' || *c == '-').repeated())
        .collect()
}

/// Parse a binding/field path, offsetting diagnostics into the enclosing source.
/// Rejects expressions and incomplete paths.
pub(crate) fn reference(source: &str, offset: usize) -> Result<Vec<String>, Diagnostic> {
    identifier()
        .separated_by(just('.'))
        .at_least(1)
        .then_ignore(end())
        .parse(Stream::from_iter(
            offset + source.len()..offset + source.len(),
            source
                .char_indices()
                .map(|(i, c)| (c, offset + i..offset + i + c.len_utf8())),
        ))
        .map_err(|_| {
            Diagnostic::error(
                "P003",
                "Expected a binding or field reference, not an expression",
                offset..offset + source.len(),
            )
        })
}

/// Check whether the entire string is exactly one identifier, not a field path.
pub(crate) fn is_identifier(value: &str) -> bool {
    reference(value, 0).is_ok_and(|parts| parts.len() == 1)
}

// Quoted attribute arguments use JSON string escapes, including Unicode escapes.
/// Tokenize whitespace-separated arguments with JSON-escaped quoted strings and byte spans.
pub(crate) fn words(source: &str, offset: usize) -> Result<Vec<Word>, Vec<Diagnostic>> {
    let spaces = one_of(" \t").repeated().at_least(1).ignored();
    let quoted = just('"')
        .chain(
            just('\\')
                .chain(any())
                .or(filter(|c| *c != '"' && *c != '\\').map(|c| vec![c]))
                .repeated()
                .flatten(),
        )
        .chain(just('"'))
        .collect::<String>()
        .try_map(|raw, span| {
            serde_json::from_str::<String>(&raw)
                .map(|text| (text, true))
                .map_err(|e| Simple::custom(span, e.to_string()))
        });
    let bare = filter(|c: &char| !c.is_whitespace() && *c != '"')
        .repeated()
        .at_least(1)
        .collect::<String>()
        .map(|text| (text, false));
    quoted
        .or(bare)
        .map_with_span(|(text, quoted), span| Word { text, quoted, span })
        .separated_by(spaces)
        .allow_trailing()
        .then_ignore(end())
        .parse(Stream::from_iter(
            offset + source.len()..offset + source.len(),
            source
                .char_indices()
                .map(|(i, c)| (c, offset + i..offset + i + c.len_utf8())),
        ))
        .map_err(|errors| {
            errors
                .into_iter()
                .map(|e| Diagnostic::error("P001", e.to_string(), e.span()))
                .collect()
        })
}

/// Parse an attribute while preserving raw expression arguments for later type checking.
/// The caller supplies a colon-prefixed line and its enclosing byte span.
fn attribute(line: &str, offset: usize, span: Span) -> Result<Attribute, Vec<Diagnostic>> {
    // Branch expressions are parsed by the expression grammar, not the word lexer.
    let name_end = line[1..]
        .find(char::is_whitespace)
        .map_or(line.len(), |i| i + 1);
    let rest = &line[name_end..];
    let raw = rest.trim_start().to_string();
    let raw_offset = offset + name_end + rest.len() - rest.trim_start().len();
    if matches!(&line[1..name_end], "when" | "case" | "else" | "with") {
        return Ok(Attribute {
            name: line[1..name_end].into(),
            args: vec![],
            span,
            raw,
            raw_offset,
        });
    }
    let mut tokens = words(&line[1..], offset + 1)?;
    if tokens.is_empty() || tokens[0].quoted || !is_identifier(&tokens[0].text) {
        return Err(vec![Diagnostic::error(
            "P002",
            "Expected an attribute name after ':'",
            span,
        )]);
    }
    let name = tokens.remove(0).text;
    Ok(Attribute {
        name,
        args: tokens,
        span,
        raw,
        raw_offset,
    })
}

/// Recognize an unescaped statement boundary that terminates an implicit Markdown block.
fn boundary(line: &str) -> bool {
    line.starts_with('!')
        || line.starts_with('?')
        || line.starts_with('~')
        || line.starts_with("->")
        || line.starts_with("= ")
        || line.strip_suffix(':').is_some_and(is_identifier)
}

/// Parse an action or control header and report whether it opens an explicit brace block.
fn header(line: &str, offset: usize, span: Span) -> Result<(Block, bool), Vec<Diagnostic>> {
    if line.starts_with("!refine[") {
        return refinement_header(line, offset, span);
    }
    if line.starts_with("?loop[") || line.starts_with("?loop ") {
        return loop_header(line, offset, span);
    }
    let explicit = line.ends_with('{');
    let header = if explicit {
        line[..line.len() - 1].trim_end()
    } else {
        line
    };
    let kind_end = header.find(char::is_whitespace).unwrap_or(header.len());
    let kind = &header[1..kind_end];
    let rest = &header[kind_end..];
    let rest_offset = offset + kind_end + rest.len() - rest.trim_start().len();
    let rest = rest.trim();
    let mut block = Block {
        kind: kind.into(),
        binding: None,
        argument: None,
        attributes: vec![],
        body: vec![],
        span: span.clone(),
        statements: vec![],
    };
    if line.starts_with('!') && kind == "use" {
        let tokens = words(rest, rest_offset)?;
        if tokens.len() != 3
            || tokens.iter().any(|w| w.quoted)
            || tokens[1].text != "as"
            || !is_identifier(&tokens[2].text)
            || reference(&tokens[0].text, tokens[0].span.start).is_err()
        {
            return Err(vec![Diagnostic::error(
                "P018",
                "Expected '!use pattern.name as alias'",
                span,
            )]);
        }
        block.binding = Some(tokens[2].clone());
        block.argument = Some((tokens[0].text.clone(), tokens[0].span.clone()));
    } else if line.starts_with('?') {
        if !explicit
            || !matches!(kind, "branch" | "match")
            || (kind == "branch" && !rest.is_empty())
            || (kind == "match" && rest.is_empty())
        {
            return Err(vec![Diagnostic::error(
                "P008",
                "Expected '?branch {' or '?match expression {'",
                span,
            )]);
        }
        block.kind = format!("?{kind}");
        if kind == "match" {
            block.argument = Some((rest.into(), rest_offset..rest_offset + rest.len()));
        }
    } else {
        let binding = if matches!(kind, "choose" | "rank") {
            selection_header(rest, rest_offset, &mut block)?
        } else {
            rest
        };
        let tokens = words(binding, rest_offset)?;
        let count = if kind == "rate" { 2 } else { 1 };
        if !is_identifier(kind)
            || tokens.len() > count
            || tokens
                .first()
                .is_some_and(|w| w.quoted || !is_identifier(&w.text))
            || (kind == "rate" && tokens.len() != 2)
        {
            return Err(vec![Diagnostic::error(
                "P008",
                "Expected '!action [binding]' or '!rate binding low..high'",
                span,
            )]);
        }
        block.binding = tokens.first().cloned();
        if let Some(range) = tokens.get(1) {
            if range.quoted {
                return Err(vec![Diagnostic::error(
                    "P008",
                    "Rating range must not be quoted",
                    range.span.clone(),
                )]);
            }
            block.argument = Some((range.text.clone(), range.span.clone()));
        }
    }
    Ok((block, explicit))
}

/// Normalize the compact refinement header to the existing attribute-oriented AST.
fn refinement_header(
    line: &str,
    offset: usize,
    span: Span,
) -> Result<(Block, bool), Vec<Diagnostic>> {
    let fail = || {
        vec![Diagnostic::error(
            "P022",
            "Expected '!refine[rounds=4, renewable] result = initial {'",
            span.clone(),
        )]
    };
    let rest = line
        .strip_prefix("!refine[")
        .and_then(|s| s.strip_suffix('{'))
        .ok_or_else(fail)?;
    let (parameters, rest) = rest.split_once(']').ok_or_else(fail)?;
    let (binding, initial) = rest.split_once('=').ok_or_else(fail)?;
    let binding = binding.trim();
    let initial = initial.trim();
    if !is_identifier(binding) || initial.is_empty() {
        return Err(fail());
    }
    let mut attributes = vec![];
    for parameter in parameters.split(',').map(str::trim) {
        let (key, value) = if parameter == "renewable" {
            ("renewable", "true")
        } else {
            parameter.split_once('=').ok_or_else(fail)?
        };
        if !matches!(key.trim(), "rounds" | "renewable") {
            return Err(fail());
        }
        attributes.push(Attribute {
            name: key.trim().into(),
            args: vec![Word {
                text: value.trim().into(),
                quoted: false,
                span: span.clone(),
            }],
            raw: value.trim().into(),
            raw_offset: offset,
            span: span.clone(),
        });
    }
    attributes.push(Attribute {
        name: "initial".into(),
        args: vec![],
        raw: initial.into(),
        raw_offset: offset + line.rfind(initial).ok_or_else(fail)?,
        span: span.clone(),
    });
    Ok((
        Block {
            kind: "refine".into(),
            binding: Some(Word {
                text: binding.into(),
                quoted: false,
                span: span.clone(),
            }),
            argument: None,
            attributes,
            body: vec![],
            statements: vec![],
            span,
        },
        true,
    ))
}

/// Parse an optional numeric iteration limit followed by a functional state binding.
fn loop_header(line: &str, offset: usize, span: Span) -> Result<(Block, bool), Vec<Diagnostic>> {
    let failure = || {
        vec![Diagnostic::error(
            "P020",
            "Expected '?loop[10] state = initial {' or '?loop state = initial {'",
            span.clone(),
        )]
    };
    let mut rest = line.strip_suffix('{').ok_or_else(failure)?[5..].trim();
    let mut attributes = vec![];
    if let Some(parameters) = rest.strip_prefix('[') {
        let (max, tail) = parameters.split_once(']').ok_or_else(failure)?;
        if !max.trim().is_empty() {
            if !max.trim().chars().all(|c| c.is_ascii_digit()) {
                return Err(failure());
            }
            attributes.push(Attribute {
                name: "max".into(),
                args: vec![Word {
                    text: max.trim().into(),
                    quoted: false,
                    span: span.clone(),
                }],
                span: span.clone(),
                raw: max.trim().into(),
                raw_offset: offset + 6,
            });
        }
        rest = tail.trim();
    }
    let (binding, initial) = rest.split_once('=').ok_or_else(failure)?;
    let binding = binding.trim();
    let initial = initial.trim();
    if !is_identifier(binding) || initial.is_empty() {
        return Err(failure());
    }
    let initial_offset = offset + line.rfind(initial).ok_or_else(failure)?;
    Ok((
        Block {
            kind: "?loop".into(),
            binding: Some(Word {
                text: binding.into(),
                quoted: false,
                span: span.clone(),
            }),
            argument: Some((
                initial.into(),
                initial_offset..initial_offset + initial.len(),
            )),
            attributes,
            body: vec![],
            statements: vec![],
            span,
        },
        true,
    ))
}

/// Normalize optional selection parameters to ordinary attributes, retaining source offsets.
fn selection_header<'a>(
    rest: &'a str,
    offset: usize,
    block: &mut Block,
) -> Result<&'a str, Vec<Diagnostic>> {
    let Some(open) = rest.find('[') else {
        return Ok(rest);
    };
    if !rest.ends_with(']') {
        return Err(vec![Diagnostic::error(
            "P008",
            "Selection parameters must end with ']'",
            block.span.clone(),
        )]);
    }
    block.argument = Some((
        "selection_header".into(),
        offset + open..offset + rest.len(),
    ));
    if rest[open + 1..rest.len() - 1].trim().is_empty() {
        return Ok(rest[..open].trim_end());
    }
    let mut cursor = offset + open + 1;
    for parameter in rest[open + 1..rest.len() - 1].split(',') {
        let start = cursor + parameter.len() - parameter.trim_start().len();
        cursor += parameter.len() + 1;
        let parameter = parameter.trim();
        let (name, value) = parameter.split_once('=').unwrap_or((parameter, ""));
        let name = name.trim();
        let value_offset = start + parameter.len() - value.trim_start().len();
        let value = value.trim();
        if !is_identifier(name) || (parameter.contains('=') && value.is_empty()) {
            return Err(vec![Diagnostic::error(
                "P008",
                "Expected a flag or name=value parameter",
                start..start + parameter.len(),
            )]);
        }
        block.attributes.push(Attribute {
            name: name.into(),
            args: words(value, value_offset)?,
            span: start..start + parameter.len(),
            raw: value.into(),
            raw_offset: value_offset,
        });
    }
    Ok(rest[..open].trim_end())
}

/// Parse an explicit stable-ID option; ordinary Markdown bullets remain prompt text.
fn selection_option(
    line: &str,
    offset: usize,
    span: Span,
) -> Option<Result<Attribute, Vec<Diagnostic>>> {
    let rest = line.strip_prefix("- ")?;
    let (key, label) = rest.split_once(':')?;
    if !is_identifier(key.trim()) {
        return None;
    }
    let label_offset = offset + line.len() - label.trim_start().len();
    Some(words(label.trim(), label_offset).map(|mut args| {
        args.insert(
            0,
            Word {
                text: key.trim().into(),
                quoted: false,
                span: offset + 2..offset + 2 + key.trim().len(),
            },
        );
        Attribute {
            name: "option".into(),
            args,
            span,
            raw: String::new(),
            raw_offset: offset,
        }
    }))
}

/// Attach a parsed statement to its current enclosing block or the root sequence.
fn append_statement(statement: Statement, stack: &mut [(Block, bool)], root: &mut Vec<Statement>) {
    if let Some((parent, _)) = stack.last_mut() {
        parent.statements.push(statement);
    } else {
        root.push(statement);
    }
}

/// Parse line-oriented Pattern Markdown without executing it or resolving dependencies.
///
/// # Errors
/// Returns collected syntax diagnostics for malformed or unsupported constructs;
/// all diagnostic spans are UTF-8 byte offsets into `source`.
pub fn parse(source: &str) -> Result<ParsedPattern, Vec<Diagnostic>> {
    let mut declarations = vec![];
    let mut statements = vec![];
    let mut classifiers = vec![];
    let mut flows = vec![];
    let mut events = vec![];
    let mut stack: Vec<(Block, bool)> = vec![];
    let mut errors = vec![];
    let mut offset = 0;
    let mut extended_syntax = false;
    let mut legacy_headers = true;
    let mut lines = source.split_inclusive('\n').peekable();
    while let Some(line) = lines.next() {
        let mut raw = line.to_string();
        let in_flow = stack.last().is_none_or(|(block, explicit)| {
            (!explicit
                && (!legacy_headers
                    || !source[block.span.start..].starts_with('!')
                    || boundary(line.trim())))
                || matches!(
                    block.kind.as_str(),
                    "collect" | "?loop" | "refine" | "each" | "flow"
                )
        });
        if extended_syntax && in_flow && functional::is_pure_line(line.trim()) {
            while functional::needs_more(&raw)
                || lines.peek().is_some_and(|line| {
                    line.trim_start().starts_with("|>")
                        || (raw.trim_start().starts_with("type ")
                            && line.trim_start().starts_with('|'))
                })
            {
                let Some(next) = lines.next() else {
                    break;
                };
                raw.push_str(next);
            }
        }
        let text = raw.trim_end_matches(['\r', '\n']);
        let trimmed = text.trim();
        let start = offset + text.len() - text.trim_start().len();
        let span = start..start + trimmed.len();
        if stack.last().is_some_and(|(block, explicit)| {
            !explicit
                && (((boundary(trimmed)
                    || (extended_syntax
                        && (!legacy_headers || !source[block.span.start..].starts_with('!'))
                        && functional::binding(trimmed).is_some()))
                    && !trimmed.starts_with('~'))
                    || trimmed == "}")
        }) {
            let (block, _) = stack.pop().unwrap();
            append_statement(Statement::Block(block), &mut stack, &mut statements);
        }
        if let Some(instruction) = trimmed.strip_prefix('~') {
            if stack.last().is_some_and(|(b, _)| {
                !matches!(
                    b.kind.as_str(),
                    "ask" | "show" | "collect" | "?loop" | "refine" | "each" | "flow"
                )
            }) {
                errors.push(Diagnostic::error("P021", "Realization is allowed only as standalone content or inside !ask/!show; it cannot be nested", span));
            } else {
                let instruction = instruction.trim_start();
                let explicit = instruction == "{";
                let body = if explicit {
                    vec![]
                } else {
                    vec![BodyLine {
                        text: instruction.into(),
                        span: start + trimmed.len() - instruction.len()..span.end,
                    }]
                };
                let block = Block {
                    kind: "realize".into(),
                    binding: None,
                    argument: None,
                    attributes: vec![],
                    body,
                    statements: vec![],
                    span,
                };
                if explicit {
                    stack.push((block, true));
                } else {
                    append_statement(Statement::Block(block), &mut stack, &mut statements);
                }
            }
            offset += raw.len();
            continue;
        }
        if stack.last().is_some_and(|(block, _)| {
            !matches!(
                block.kind.as_str(),
                "collect" | "?loop" | "refine" | "each" | "flow"
            )
        }) {
            let (block, explicit) = stack.last_mut().unwrap();
            if *explicit && trimmed == "}" {
                block.span.end = span.end;
                let (block, _) = stack.pop().unwrap();
                if block.kind == "classifier" {
                    classifiers.push(block);
                } else if block.kind == "events" {
                    events.push(block);
                } else {
                    append_statement(Statement::Block(block), &mut stack, &mut statements);
                }
            } else if let Some(option) = (matches!(block.kind.as_str(), "choose" | "rank")
                && (block.argument.is_some()
                    || !block
                        .attributes
                        .iter()
                        .any(|attribute| matches!(attribute.name.as_str(), "option" | "from"))))
            .then(|| selection_option(trimmed, start, span.clone()))
            .flatten()
            {
                if block.argument.is_none() {
                    block.argument = Some(("selection_bullets".into(), span.clone()));
                }
                match option {
                    Ok(option) => block.attributes.push(option),
                    Err(e) => errors.extend(e),
                }
            } else if trimmed.starts_with(':') {
                if block.body.iter().any(|l| !l.text.trim().is_empty()) {
                    errors.push(Diagnostic::error(
                        "P004",
                        "Attributes must precede Markdown content",
                        span,
                    ));
                } else {
                    match attribute(trimmed, start, span) {
                        Ok(a) => block.attributes.push(a),
                        Err(e) => errors.extend(e),
                    }
                }
            } else if (boundary(trimmed) && !trimmed.strip_suffix(':').is_some_and(is_identifier))
                || trimmed == "}"
            {
                errors.push(Diagnostic::error("P005","Nested statements are not supported here; escape literal syntax with a backslash",span));
            } else {
                block.span.end = span.end;
                block.body.push(BodyLine {
                    text: text.into(),
                    span: offset..offset + text.len(),
                });
            }
        } else if trimmed.is_empty() {
        } else if trimmed == "}" {
            if let Some((mut block, _)) = stack.pop() {
                block.span.end = span.end;
                if block.kind == "flow" {
                    flows.push(block);
                } else {
                    append_statement(Statement::Block(block), &mut stack, &mut statements);
                }
            } else {
                errors.push(Diagnostic::error("P016", "Unexpected closing brace", span));
            }
        } else if trimmed.starts_with(':') {
            if let Some((block, _)) = stack.last_mut() {
                if !block.statements.is_empty() {
                    errors.push(Diagnostic::error(
                        "P004",
                        "Collection attributes must precede body statements",
                        span,
                    ));
                } else {
                    match attribute(trimmed, start, span) {
                        Ok(a) => block.attributes.push(a),
                        Err(e) => errors.extend(e),
                    }
                }
            } else if !statements.is_empty() {
                errors.push(Diagnostic::error(
                    "P007",
                    "Pattern declarations must precede statements",
                    span,
                ));
            } else {
                match attribute(trimmed, start, span) {
                    Ok(a) => {
                        if a.name == "language"
                            && a.args
                                .first()
                                .is_some_and(|w| !w.quoted && matches!(w.text.as_str(), "1" | "2"))
                        {
                            extended_syntax = true;
                            legacy_headers = a.args[0].text == "1";
                        }
                        declarations.push(a);
                    }
                    Err(e) => errors.extend(e),
                }
            }
        } else if extended_syntax && (trimmed.starts_with("flow ") || trimmed == "events {") {
            if !stack.is_empty() || !statements.is_empty() {
                errors.push(Diagnostic::error(
                    "P025",
                    "Flows and events must be declared before steps",
                    span,
                ));
            } else if trimmed == "events {" {
                stack.push((
                    Block {
                        kind: "events".into(),
                        binding: None,
                        attributes: vec![],
                        body: vec![],
                        span,
                        argument: None,
                        statements: vec![],
                    },
                    true,
                ));
            } else if let Some(name) = trimmed
                .strip_prefix("flow ")
                .and_then(|s| s.strip_suffix('{'))
                .map(str::trim)
                .filter(|s| is_identifier(s))
            {
                stack.push((
                    Block {
                        kind: "flow".into(),
                        binding: None,
                        attributes: vec![],
                        body: vec![],
                        span: span.clone(),
                        argument: Some((name.into(), span)),
                        statements: vec![],
                    },
                    true,
                ));
            } else {
                errors.push(Diagnostic::error(
                    "P025",
                    "Expected flow name { with :input and :output declarations",
                    span,
                ));
            }
        } else if extended_syntax
            && (trimmed.starts_with("type ") || trimmed.starts_with("classifier "))
        {
            if !stack.is_empty() || !statements.is_empty() {
                errors.push(Diagnostic::error(
                    "P024",
                    "Types and classifiers must precede flow steps",
                    span,
                ));
            } else if trimmed.starts_with("type ") {
                match semantic::enum_declaration(trimmed, start, span) {
                    Ok(a) => declarations.push(a),
                    Err(e) => errors.extend(e),
                }
            } else {
                match semantic::classifier_header(trimmed, span) {
                    Ok(b) => stack.push((b, true)),
                    Err(e) => errors.extend(e),
                }
            }
        } else if extended_syntax && trimmed.starts_with("fn ") {
            if !stack.is_empty() || !statements.is_empty() {
                errors.push(Diagnostic::error(
                    "P023",
                    "Pure helpers must be declared before flow steps",
                    span,
                ));
            } else {
                declarations.push(Attribute {
                    name: "function".into(),
                    args: vec![],
                    raw: trimmed[3..].into(),
                    raw_offset: start + 3,
                    span,
                });
            }
        } else if extended_syntax
            && functional::binding(trimmed).is_some_and(|(_, rhs)| !functional::effectful(rhs))
        {
            let (name, expression) = functional::binding(trimmed).unwrap();
            append_statement(
                Statement::Derive {
                    binding: Word {
                        text: name.into(),
                        quoted: false,
                        span: start..start + name.len(),
                    },
                    expression: expression.into(),
                    expression_offset: start + trimmed.len() - expression.len(),
                    span,
                },
                &mut stack,
                &mut statements,
            );
        } else if trimmed.starts_with('!')
            || trimmed.starts_with('?')
            || (extended_syntax && functional::binding(trimmed).is_some())
        {
            let parsed_header = if extended_syntax && functional::binding(trimmed).is_some() {
                functional::header(trimmed, start, span.clone())
            } else {
                header(trimmed, start, span.clone())
            };
            match parsed_header {
                Ok((block, explicit)) => {
                    if matches!(block.kind.as_str(), "collect" | "?loop" | "refine" | "each")
                        && (!explicit || stack.iter().any(|(b, _)| b.kind != "flow"))
                    {
                        errors.push(Diagnostic::error(
                            "P017",
                            "Collections and loops require explicit braces and cannot be nested in this Run",
                            span,
                        ));
                    } else {
                        stack.push((block, explicit));
                    }
                }
                Err(e) => errors.extend(e),
            }
        } else if extended_syntax && trimmed.starts_with("-> yield ") {
            let expression = trimmed[9..].trim();
            append_statement(
                Statement::Yield {
                    expression: expression.into(),
                    expression_offset: start + trimmed.len() - expression.len(),
                    span,
                },
                &mut stack,
                &mut statements,
            );
        } else if let Some(expression) = trimmed.strip_prefix("-> propose ") {
            append_statement(
                Statement::Propose {
                    expression: expression.trim().into(),
                    expression_offset: start + trimmed.len() - expression.trim_start().len(),
                    span,
                },
                &mut stack,
                &mut statements,
            );
        } else if let Some(expression) = trimmed.strip_prefix("-> repeat ") {
            append_statement(
                Statement::Repeat {
                    expression: expression.trim().into(),
                    expression_offset: start + trimmed.len() - expression.trim_start().len(),
                    span,
                },
                &mut stack,
                &mut statements,
            );
        } else if trimmed.starts_with("->") {
            match words(trimmed, start) {
                Ok(w)
                    if w.len() == 2
                        && w[0].text == "->"
                        && !w[1].quoted
                        && is_identifier(&w[1].text) =>
                {
                    append_statement(
                        Statement::Jump {
                            target: w[1].clone(),
                            span,
                        },
                        &mut stack,
                        &mut statements,
                    );
                }
                _ => errors.push(Diagnostic::error(
                    "P010",
                    "Expected '-> label' or '-> end'",
                    span,
                )),
            }
        } else if let Some(label) = trimmed.strip_suffix(':').filter(|s| is_identifier(s)) {
            append_statement(
                Statement::Label(Word {
                    text: label.into(),
                    quoted: false,
                    span,
                }),
                &mut stack,
                &mut statements,
            );
        } else if let Some(rest) = trimmed.strip_prefix("= ") {
            let rest_offset = start + 2 + rest.len() - rest.trim_start().len();
            let rest = rest.trim_start();
            let split = rest.find(char::is_whitespace).unwrap_or(rest.len());
            let key = &rest[..split];
            let expr = &rest[split..];
            let expression_offset = rest_offset + split + expr.len() - expr.trim_start().len();
            if !is_identifier(key) || expr.trim().is_empty() {
                errors.push(Diagnostic::error(
                    "P015",
                    "Expected '= binding expression'",
                    span,
                ));
            } else {
                append_statement(
                    Statement::Derive {
                        binding: Word {
                            text: key.into(),
                            quoted: false,
                            span: rest_offset..rest_offset + key.len(),
                        },
                        expression: expr.trim().into(),
                        expression_offset,
                        span,
                    },
                    &mut stack,
                    &mut statements,
                );
            }
        } else {
            errors.push(Diagnostic::error(
                "P011",
                "Expected a declaration, statement, label, or jump",
                span,
            ));
        }
        offset += raw.len();
    }
    while let Some((block, explicit)) = stack.pop() {
        if explicit {
            errors.push(Diagnostic::error(
                "P012",
                "Unclosed action block",
                block.span,
            ));
        } else {
            append_statement(Statement::Block(block), &mut stack, &mut statements);
        }
    }
    if errors.is_empty() {
        Ok(ParsedPattern {
            flows,
            events,
            classifiers,
            source: source.into(),
            declarations,
            statements,
        })
    } else {
        Err(errors)
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) enum TemplatePart {
    Literal(String),
    Reference { path: Vec<String>, span: Span },
}

/// Remove common indentation and parse escaped Markdown and field interpolations.
/// Rejects unclosed or invalid references while preserving source-byte provenance.
pub(crate) fn template(lines: &[BodyLine]) -> Result<Vec<TemplatePart>, Diagnostic> {
    let mut result = vec![];
    let first = lines
        .iter()
        .position(|l| !l.text.trim().is_empty())
        .unwrap_or(lines.len());
    let last = lines
        .iter()
        .rposition(|l| !l.text.trim().is_empty())
        .map_or(first, |i| i + 1);
    let lines = &lines[first..last];
    let indent = lines
        .iter()
        .filter(|l| !l.text.trim().is_empty())
        .map(|l| l.text.len() - l.text.trim_start_matches([' ', '\t']).len())
        .min()
        .unwrap_or(0);
    for (index, line) in lines.iter().enumerate() {
        if index > 0 {
            result.push(TemplatePart::Literal("\n".into()));
        }
        let skip = indent.min(line.text.len() - line.text.trim_start_matches([' ', '\t']).len());
        let mut remaining = &line.text[skip..];
        let mut offset = line.span.start + skip;
        let leading = remaining.len() - remaining.trim_start_matches([' ', '\t']).len();
        if let Some(literal) = remaining[leading..].strip_prefix('\\') {
            if boundary(literal) || literal.starts_with(':') || literal == "}" {
                result.push(TemplatePart::Literal(remaining[..leading].into()));
                remaining = literal;
                offset += leading + 1;
            }
        }
        while !remaining.is_empty() {
            if remaining.starts_with("\\\\") || remaining.starts_with("\\{{") {
                let n = if remaining.starts_with("\\\\") { 2 } else { 3 };
                result.push(TemplatePart::Literal(remaining[1..n].into()));
                remaining = &remaining[n..];
                offset += n;
            } else if let Some(tail) = remaining.strip_prefix("{{") {
                let close = tail.find("}}").ok_or_else(|| {
                    Diagnostic::error("P014", "Unclosed interpolation", offset..line.span.end)
                })?;
                let raw = &tail[..close];
                let trimmed = raw.trim();
                let start = offset + 2 + raw.len() - raw.trim_start().len();
                result.push(TemplatePart::Reference {
                    path: reference(trimmed, start)?,
                    span: start..start + trimmed.len(),
                });
                let consumed = close + 4;
                remaining = &remaining[consumed..];
                offset += consumed;
            } else {
                let n = remaining.chars().next().unwrap().len_utf8();
                if let Some(TemplatePart::Literal(s)) = result.last_mut() {
                    s.push_str(&remaining[..n]);
                } else {
                    result.push(TemplatePart::Literal(remaining[..n].into()));
                }
                remaining = &remaining[n..];
                offset += n;
            }
        }
    }
    Ok(result)
}
