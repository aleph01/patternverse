//! Validate semantic declarations and effect boundaries without granting implicit chat access.
use super::*;
use crate::{
    semantic::{Classifier, SuggestionMode},
    value::EnumType,
};

/// Validate closed enum declarations before input contracts are resolved.
pub(super) fn enums(declarations: &[Attribute]) -> Check<BTreeMap<String, EnumType>> {
    let mut enums = BTreeMap::new();
    for a in declarations.iter().filter(|a| a.name == "enum") {
        let Some(first) = a.args.first() else {
            return Err(err("Enum requires a name and variants", a.span.clone()));
        };
        let ty = EnumType {
            name: first.text.clone(),
            variants: a.args[1..].iter().map(|w| w.text.clone()).collect(),
        };
        if !ty.is_valid()
            || enums.contains_key(&ty.name)
            || matches!(
                ty.name.as_str(),
                "text" | "number" | "boolean" | "choice" | "choices" | "list" | "SemanticOutcome"
            )
        {
            return Err(err(
                "Enum names and variants must be unique identifiers (maximum 64 variants)",
                a.span.clone(),
            ));
        }
        if enums.len() >= 32 {
            return Err(err("At most 32 authored enums", a.span.clone()));
        }
        enums.insert(ty.name.clone(), ty);
    }
    Ok(enums)
}

/// Resolve scalar/named enum contracts without changing existing structural type spellings.
pub(super) fn declared_type(word: &Word, symbols: &Scope) -> Check<Type> {
    if !word.quoted {
        if let Some(ty) = symbols.enums.get(&word.text) {
            return Ok(Type::Enum(ty.clone()));
        }
    }
    value_type(word)
}

/// Require explicit context and complete category rules with one authored uncertainty fallback.
pub(super) fn classifiers(
    blocks: &[Block],
    symbols: &Scope,
) -> Check<BTreeMap<String, Classifier>> {
    let mut definitions = BTreeMap::new();
    for b in blocks {
        let name = required_binding(b)?;
        if definitions.contains_key(&name) || definitions.len() >= 32 {
            return Err(err(
                "Duplicate classifier or more than 32 classifiers",
                b.span.clone(),
            ));
        }
        let output = symbols
            .enums
            .get(&b.argument.as_ref().unwrap().0)
            .cloned()
            .ok_or_else(|| err("Classifier requires a declared enum result", b.span.clone()))?;
        if !b.body.iter().all(|l| l.text.trim().is_empty()) || !b.statements.is_empty() {
            return Err(err(
                "Classifiers contain only :context, :case and :fallback declarations",
                b.span.clone(),
            ));
        }
        let mut rules = BTreeMap::new();
        let mut context = BTreeMap::new();
        let mut fallback = None;
        for a in &b.attributes {
            match a.name.as_str() {
                "context" => {
                    let args = arity(a, 2)?;
                    let key = super::name(&args[0])?;
                    let ty = declared_type(&args[1], symbols)?;
                    if context.insert(key, ty).is_some() || context.len() > 8 {
                        return Err(err(
                            "Classifier contexts must be unique (maximum eight)",
                            a.span.clone(),
                        ));
                    }
                }
                "case" => {
                    let args = syntax::words(&a.raw, a.raw_offset).map_err(|e| e[0].clone())?;
                    if args.len() != 2 {
                        return Err(err("Expected :case variant \"meaning\"", a.span.clone()));
                    }
                    let key = super::name(&args[0])?;
                    let description = quoted(&args[1])?;
                    if !output.variants.contains(&key)
                        || description.trim().is_empty()
                        || description.len() > 2000
                        || rules.insert(key, description).is_some()
                    {
                        return Err(err(
                            "Invalid or duplicate classifier category rule",
                            a.span.clone(),
                        ));
                    }
                }
                "fallback" => {
                    let key = super::name(&arity(a, 1)?[0])?;
                    if fallback.replace(key).is_some() {
                        return Err(err(
                            "Only one uncertainty fallback is allowed",
                            a.span.clone(),
                        ));
                    }
                }
                _ => return Err(err("Unsupported classifier attribute", a.span.clone())),
            }
        }
        let fallback = fallback
            .filter(|v| output.variants.contains(v))
            .ok_or_else(|| {
                err(
                    "Classifier requires :fallback naming an enum variant for ambiguity",
                    b.span.clone(),
                )
            })?;
        if output
            .variants
            .iter()
            .any(|v| v != &fallback && !rules.contains_key(v))
        {
            return Err(err(
                "Provide a :case description for every non-fallback variant",
                b.span.clone(),
            ));
        }
        definitions.insert(
            name.clone(),
            Classifier {
                name,
                output,
                rules,
                fallback,
                context,
            },
        );
    }
    Ok(definitions)
}

/// Validate the exact explicitly supplied classifier context; never capture other bindings.
fn context(
    b: &Block,
    definition: &Classifier,
    symbols: &Scope,
) -> Check<Vec<(String, CheckedExpr)>> {
    let mut supplied = BTreeMap::new();
    for a in b.attributes.iter().filter(|a| a.name == "with") {
        let (key, source, offset) = if let Some((key, tail)) = a.raw.split_once('=') {
            (
                key.trim(),
                tail.trim(),
                a.raw_offset + a.raw.len() - tail.trim_start().len(),
            )
        } else {
            (a.raw.trim(), a.raw.trim(), a.raw_offset)
        };
        let (expression, ty) = check_expression(source, offset, symbols)?;
        if definition.context.get(key) != Some(&ty)
            || supplied.insert(key.to_string(), expression).is_some()
        {
            return Err(err(
                "Classifier context must match its explicit names and types exactly",
                a.span.clone(),
            ));
        }
    }
    if supplied.len() != definition.context.len() {
        return Err(err("Missing explicit classifier context", b.span.clone()));
    }
    Ok(supplied.into_iter().collect())
}

/// Compile only explicit semantic effects, leaving pure functions unable to invoke them.
pub(super) fn check(b: Block, symbols: &mut Scope) -> Check<CheckedStep> {
    if !b.statements.is_empty() {
        return Err(err(
            "Semantic bindings cannot contain nested instructions",
            b.span,
        ));
    }
    let binding = required_binding(&b)?;
    if b.kind == "bound_realize" {
        let prompt = check_template(&b, symbols)?;
        declare(
            symbols,
            binding.clone(),
            Type::Text,
            b.binding.unwrap().span,
        )?;
        return Ok(CheckedStep::Realize { binding, prompt });
    }
    let inputs: Vec<_> = b.attributes.iter().filter(|a| a.name == "input").collect();
    if inputs.len() != 1 {
        return Err(err("Semantic operation needs one input", b.span));
    }
    let (input, ty) = check_expression(&inputs[0].raw, inputs[0].raw_offset, symbols)?;
    if b.kind == "classify" {
        if b.attributes
            .iter()
            .any(|a| !matches!(a.name.as_str(), "input" | "with"))
            || !b.body.iter().all(|l| l.text.trim().is_empty())
        {
            return Err(err(
                "Classification accepts only explicit :with context",
                b.span,
            ));
        }
        let definition = symbols
            .classifiers
            .get(&b.argument.as_ref().unwrap().0)
            .cloned()
            .ok_or_else(|| err("Unknown classifier", b.span.clone()))?;
        if ty != Type::Text {
            return Err(err("Classifier input must be text", b.span));
        }
        let context = context(&b, &definition, symbols)?;
        declare(
            symbols,
            binding.clone(),
            Type::Enum(definition.output.clone()),
            b.binding.unwrap().span,
        )?;
        return Ok(CheckedStep::Classify {
            binding,
            input,
            definition,
            context,
        });
    }
    if b.attributes.len() != 1 {
        return Err(err(
            "Semantic candidate operations accept criteria and an explicit input only",
            b.span,
        ));
    }
    let element = match ty {
        Type::Choices => Type::Choice,
        Type::List(inner) => *inner,
        _ => return Err(err("Semantic candidates must be a list or choices", b.span)),
    };
    let mut wording = b.clone();
    wording.kind = "realize".into();
    wording.attributes.clear();
    let criteria = check_template(&wording, symbols)?;
    let mode = match b.kind.as_str() {
        "semantic_select" => SuggestionMode::Select,
        "semantic_filter" => SuggestionMode::Filter,
        "semantic_rank" => SuggestionMode::Rank,
        _ => unreachable!(),
    };
    declare(
        symbols,
        binding.clone(),
        crate::semantic::suggestion_type(element.clone()),
        b.binding.unwrap().span,
    )?;
    Ok(CheckedStep::Suggest {
        binding,
        input,
        mode,
        element,
        criteria,
    })
}

/// Turn qualified enum constants into literals before ordinary lexical reference resolution.
pub(super) fn literals(expression: Expr<Vec<String>>, symbols: &Scope) -> Check<Expr<Vec<String>>> {
    let span = expression.span;
    let kind = match expression.kind {
        Kind::Reference(path) if path.len() == 2 && symbols.enums.contains_key(&path[0]) => {
            let ty = &symbols.enums[&path[0]];
            if !ty.variants.contains(&path[1]) {
                return Err(err("Unknown enum variant", span));
            }
            Kind::Literal(ty.value(path[1].clone()))
        }
        Kind::List(items, ty) => Kind::List(
            items
                .into_iter()
                .map(|e| literals(e, symbols))
                .collect::<Check<_>>()?,
            ty,
        ),
        Kind::Record(fields) => Kind::Record(
            fields
                .into_iter()
                .map(|(key, e)| Ok((key, literals(e, symbols)?)))
                .collect::<Check<_>>()?,
        ),
        Kind::Call(name, args) => Kind::Call(
            name,
            args.into_iter()
                .map(|e| literals(e, symbols))
                .collect::<Check<_>>()?,
        ),
        Kind::Unary(op, e) => Kind::Unary(op, Box::new(literals(*e, symbols)?)),
        Kind::Binary(op, a, b) => Kind::Binary(
            op,
            Box::new(literals(*a, symbols)?),
            Box::new(literals(*b, symbols)?),
        ),
        other => other,
    };
    Ok(Expr { kind, span })
}
