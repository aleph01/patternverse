//! Validate the five compositional operations against the existing typed collection schema.
use super::*;
use crate::show::{Order, ShowSpec};

/// Resolve the source and validate property arities, paths and scalar/relation contracts.
pub(super) fn check(block: &Block, symbols: &Scope) -> Check<CheckedStep> {
    if block.binding.is_some()
        || !block.statements.is_empty()
        || block.body.iter().any(|line| !line.text.trim().is_empty())
    {
        return Err(err(
            "!show {{items}} accepts properties only, and does not create a binding",
            block.span.clone(),
        ));
    }
    let attrs = attributes(block, &["map", "group", "order", "link", "split"])?;
    let (reference, span) = block.argument.as_ref().unwrap();
    let (source, ty) = check_expression(reference, span.start, symbols)?;
    let element = match ty {
        Type::List(element) => *element,
        Type::Choices => Type::Choice,
        _ => {
            return Err(err(
                "!show source must be a collection (list or choices)",
                span.clone(),
            ))
        }
    };
    let field_type = |path: &str, at: Span| -> Check<Type> {
        let parts = syntax::reference(path, at.start)?;
        let mut ty = element.clone();
        if !matches!(ty, Type::Record(_) | Type::Choice) && path == "value" {
            return Ok(ty);
        }
        for field in parts {
            ty = match ty {
                Type::Record(fields) => fields.get(&field).cloned().ok_or_else(|| {
                    let mut diagnostic = err(format!("!show: attribute '{path}' was not found on items in {{{{{reference}}}}}"), at.clone());
                    if let Some(candidate) = fields.keys().min_by_key(|key| crate::show::distance(path, key)) {
                        if crate::show::distance(path, candidate) <= 2 { diagnostic.help = Some(format!("Did you mean '{candidate}'?")); }
                    }
                    diagnostic
                })?,
                Type::Choice if matches!(field.as_str(), "value" | "label") => Type::Text,
                _ => return Err(err(format!("!show: attribute '{path}' is not available on these items"), at.clone())),
            };
        }
        Ok(ty)
    };
    let scalar = |path: &str, at: Span| -> Check<()> {
        if matches!(
            field_type(path, at.clone())?,
            Type::List(_) | Type::Record(_) | Type::Choices
        ) {
            return Err(err(
                format!("!show: '{path}' must be a scalar attribute, not a nested structure"),
                at,
            ));
        }
        Ok(())
    };
    let single = |key: &str| -> Check<Option<String>> {
        attrs
            .get(key)
            .map(|attr| {
                let word = &arity(attr, 1)?[0];
                if word.quoted {
                    return Err(err(
                        "Expected an attribute reference, not a quoted string",
                        word.span.clone(),
                    ));
                }
                scalar(&word.text, word.span.clone())?;
                Ok(word.text.clone())
            })
            .transpose()
    };
    let map = if let Some(attr) = attrs.get("map") {
        let paths: Vec<_> = attr.raw.split(',').map(str::trim).collect();
        if !(1..=2).contains(&paths.len()) || paths.iter().any(|path| path.is_empty()) {
            return Err(err(
                "!show :map requires one or two comma-separated attributes",
                attr.span.clone(),
            ));
        }
        if paths.len() == 2 && paths[0] == paths[1] {
            return Err(err(
                "!show :map dimensions must be distinct",
                attr.span.clone(),
            ));
        }
        for path in &paths {
            scalar(path, attr.raw_offset..attr.raw_offset + attr.raw.len())?;
        }
        paths.into_iter().map(str::to_owned).collect()
    } else {
        vec![]
    };
    let order = attrs
        .get("order")
        .map(|attr| {
            if !(1..=2).contains(&attr.args.len()) || attr.args.iter().any(|word| word.quoted) {
                return Err(err(
                    "Expected :order attribute [asc|desc]",
                    attr.span.clone(),
                ));
            }
            let word = &attr.args[0];
            scalar(&word.text, word.span.clone())?;
            let direction = attr.args.get(1).map_or("asc", |word| word.text.as_str());
            if !matches!(direction, "asc" | "desc") {
                return Err(err(
                    "!show order direction must be asc or desc",
                    attr.span.clone(),
                ));
            }
            Ok(Order {
                attribute: word.text.clone(),
                descending: direction == "desc",
            })
        })
        .transpose()?;
    let link = attrs.get("link").map(|attr| {
        let word = &arity(attr, 1)?[0];
        if word.quoted { return Err(err("Expected a relation attribute reference", word.span.clone())); }
        let ty = field_type(&word.text, word.span.clone())?;
        if !matches!(ty, Type::Text | Type::Choice | Type::Choices) && !matches!(ty, Type::List(ref element) if matches!(**element, Type::Text | Type::Choice)) {
            return Err(err("!show relation must contain item IDs (text, choice, or a list of either)", attr.span.clone()));
        }
        Ok(word.text.clone())
    }).transpose()?;
    Ok(CheckedStep::ShowCollection {
        source,
        spec: ShowSpec {
            source: reference.clone(),
            map,
            group: single("group")?,
            order,
            link,
            split: single("split")?,
        },
    })
}
