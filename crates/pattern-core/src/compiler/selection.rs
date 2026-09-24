//! Typed selection contracts, separate from the legacy single-choice instruction.
use super::*;

/// The meaning of a participant's confirmed selection, independent of its presentation.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SelectionMode {
    Single,
    Multi,
    Rank,
}

/// Validated cardinality and presentation hints; dynamic bounds resolve when the effect opens.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Selection {
    pub mode: SelectionMode,
    pub min: usize,
    pub max: Option<usize>,
    pub prefer: Option<String>,
    pub label: Option<String>,
}

/// Check selection attributes and declare the exact scalar or list output contract.
pub(super) fn check(
    b: &Block,
    symbols: &mut Scope,
    prompt: Vec<CheckedPart>,
) -> Result<CheckedStep, Diagnostic> {
    let binding = required_binding(b)?;
    let (selection, options, element_type) = selection_parameters(b, symbols)?;
    validate_presentation(&selection, b)?;
    validate_element_type(&selection, &element_type, b)?;
    let ty = if selection.mode == SelectionMode::Single {
        Type::Choice
    } else {
        Type::List(Box::new(element_type))
    };
    declare(
        symbols,
        binding.clone(),
        ty,
        b.binding.as_ref().unwrap().span.clone(),
    )?;
    Ok(CheckedStep::Select {
        binding,
        options,
        selection,
        prompt,
    })
}

/// Parse flags, presentation hints and one source without declaring the result binding.
fn selection_parameters(
    b: &Block,
    symbols: &Scope,
) -> Result<(Selection, CheckedOptions, Type), Diagnostic> {
    let mut selection = Selection {
        mode: if b.kind == "rank" {
            SelectionMode::Rank
        } else {
            SelectionMode::Single
        },
        min: 1,
        max: None,
        prefer: None,
        label: None,
    };
    let mut seen = BTreeSet::new();
    let mut options = Vec::new();
    let mut from = None;
    let mut element_type = Type::Choice;
    for attribute in &b.attributes {
        let args = &attribute.args;
        if attribute.name != "option" && !seen.insert(attribute.name.as_str()) {
            return Err(err("Duplicate selection parameter", attribute.span.clone()));
        }
        match attribute.name.as_str() {
            "option" => {
                let args = arity(attribute, 2)?;
                options.push(Choice {
                    value: name(&args[0])?,
                    label: quoted(&args[1])?,
                });
            }
            "multi" if b.kind == "choose" => {
                arity(attribute, 0)?;
                selection.mode = SelectionMode::Multi;
            }
            "min" | "max" if b.kind == "choose" => {
                arity(attribute, 1)?;
                let value = args[0]
                    .text
                    .parse::<usize>()
                    .ok()
                    .filter(|n| *n <= 1000 && !args[0].quoted)
                    .ok_or_else(|| {
                        err(
                            "Selection bounds must be integers from 0 through 1000",
                            attribute.span.clone(),
                        )
                    })?;
                if attribute.name == "min" {
                    selection.min = value;
                } else {
                    selection.max = Some(value);
                }
            }
            "prefer" | "label" => {
                arity(attribute, 1)?;
                let value = name(&args[0])?;
                if attribute.name == "prefer" {
                    selection.prefer = Some(value);
                } else {
                    selection.label = Some(value);
                }
            }
            "from" => {
                let (expression, ty) =
                    check_expression(&attribute.raw, attribute.raw_offset, symbols)?;
                element_type = match ty {
                    Type::Choices => Type::Choice,
                    Type::List(element) => *element,
                    _ => {
                        return Err(err(
                            "Selection :from requires choices or a typed list",
                            attribute.span.clone(),
                        ))
                    }
                };
                from = Some(expression);
            }
            _ => {
                return Err(err(
                    format!("Unsupported :{} on !{}", attribute.name, b.kind),
                    attribute.span.clone(),
                ))
            }
        }
    }
    let options = selection_source(from, options, &selection, b)?;
    Ok((selection, options, element_type))
}

/// Require an unambiguous catalogue and check bounds known at compile time.
fn selection_source(
    from: Option<CheckedExpr>,
    options: Vec<Choice>,
    selection: &Selection,
    b: &Block,
) -> Result<CheckedOptions, Diagnostic> {
    let options =
        match (from, options.is_empty()) {
            (Some(expression), true) => CheckedOptions::Dynamic(expression),
            (None, false) if valid_choices(&options) && options.len() <= 1000 => {
                if selection.mode != SelectionMode::Rank
                    && (selection.min > options.len()
                        || selection.max.is_some_and(|max| max > options.len()))
                {
                    return Err(err(
                        "Selection bounds exceed the available options",
                        b.span.clone(),
                    ));
                }
                CheckedOptions::Static(options)
            }
            _ => return Err(err(
                "Use exactly one source: from, or unique nonempty option entries (at most 1000)",
                b.span.clone(),
            )),
        };
    Ok(options)
}

/// Records may be ranked by a text label; all other selection outputs are choices.
fn validate_element_type(
    selection: &Selection,
    element_type: &Type,
    b: &Block,
) -> Result<(), Diagnostic> {
    match (element_type, &selection.label) {
        (Type::Choice, None) => Ok(()),
        (Type::Record(fields), Some(label)) if selection.mode == SelectionMode::Rank && fields.get(label) == Some(&Type::Text) => Ok(()),
        _ => Err(err("Rank collected records using label=<text field>; other selections require choice items", b.span.clone())),
    }
}

/// Reject contradictory counts and hints rather than silently changing selection semantics.
fn validate_presentation(selection: &Selection, b: &Block) -> Result<(), Diagnostic> {
    if selection.max.is_some_and(|max| max < selection.min)
        || (selection.mode == SelectionMode::Single
            && (selection.min != 1 || selection.max.is_some_and(|max| max != 1)))
    {
        return Err(err(
            "Use multi for zero or several selections; min must not exceed max",
            b.span.clone(),
        ));
    }
    let supported = match selection.mode {
        SelectionMode::Single => ["radio", "chips"].as_slice(),
        SelectionMode::Multi => ["checklist", "chips"].as_slice(),
        SelectionMode::Rank => ["reorder"].as_slice(),
    };
    if selection
        .prefer
        .as_ref()
        .is_some_and(|hint| !supported.contains(&hint.as_str()))
    {
        return Err(err(
            "Presentation hint does not match the interaction (radio/checklist/chips/reorder)",
            b.span.clone(),
        ));
    }
    Ok(())
}
