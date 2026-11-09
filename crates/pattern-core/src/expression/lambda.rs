//! Contextual inline callbacks lower to typed transforms with explicit immutable captures.
use super::*;
use std::cell::RefCell;

type ReferenceResolver<'a, R> = dyn Fn(&[String], Span) -> Result<(R, Type), Diagnostic> + 'a;

/// Recognize built-in callback positions, preserving same-named user helpers.
pub(super) fn is_transform(name: &str, functions: &functional::Functions) -> bool {
    matches!(
        name,
        "map" | "filter" | "fold" | "reduce" | "find" | "any" | "all"
    ) && !functions.contains_key(name)
}

/// Find this callback's placeholders, leaving nested callbacks and transforms independent.
fn placeholders(
    expression: &Expr<Vec<String>>,
    functions: &functional::Functions,
    spans: &mut Vec<Span>,
) {
    match &expression.kind {
        Kind::Reference(path) if path.first().is_some_and(|name| name == "_") => {
            spans.push(expression.span.clone())
        }
        Kind::Lambda(..) => {}
        Kind::Call(name, _) if is_transform(name, functions) => {}
        Kind::Call(_, args) | Kind::MapPipe(_, args) | Kind::List(args, _) => {
            for argument in args {
                placeholders(argument, functions, spans);
            }
        }
        Kind::Record(fields) => {
            for field in fields.values() {
                placeholders(field, functions, spans);
            }
        }
        Kind::Unary(_, inner) => placeholders(inner, functions, spans),
        Kind::Binary(_, left, right) => {
            placeholders(left, functions, spans);
            placeholders(right, functions, spans);
        }
        _ => {}
    }
}

/// Lower an explicit mapping pipe to a hygienic callback using the built-in map transform.
pub(super) fn check_map_pipe<R: Clone>(
    name: String,
    arguments: Vec<Expr<Vec<String>>>,
    span: Span,
    functions: &functional::Functions,
    parameters: &[(String, Type)],
    resolve: &ReferenceResolver<'_, R>,
) -> Result<(Expr<R>, Type), Diagnostic> {
    let mut arguments = arguments.into_iter();
    let source = arguments.next().ok_or_else(|| {
        Diagnostic::error(
            "E003",
            "A mapping pipe requires a source list",
            span.clone(),
        )
    })?;
    // '$' cannot appear in an authored identifier, so this local cannot capture user names.
    let parameter = "$pipe_item".to_string();
    let item = Expr {
        kind: Kind::Reference(vec![parameter.clone()]),
        span: source.span.clone(),
    };
    let arguments = std::iter::once(item).chain(arguments).collect();
    let callback = Expr {
        kind: Kind::Lambda(
            vec![parameter],
            Box::new(Expr {
                kind: Kind::Call(name, arguments),
                span: span.clone(),
            }),
        ),
        span: span.clone(),
    };
    // Call the transform checker directly: a user helper named 'map' must not change |>>.
    check_transform(
        "map".into(),
        vec![source, callback],
        span,
        functions,
        parameters,
        resolve,
    )
}

/// Check callback arity, infer parameter types, and freeze earlier values as capture arguments.
pub(super) fn check_transform<R: Clone>(
    name: String,
    mut arguments: Vec<Expr<Vec<String>>>,
    span: Span,
    functions: &functional::Functions,
    outer_parameters: &[(String, Type)],
    resolve: &dyn Fn(&[String], Span) -> Result<(R, Type), Diagnostic>,
) -> Result<(Expr<R>, Type), Diagnostic> {
    let fail = |message: &str| Diagnostic::error("E003", message, span.clone());
    let callback = arguments
        .pop()
        .ok_or_else(|| fail("Expected a named helper or inline lambda as the last argument"))?;
    let expected_arity = if name == "fold" { 2 } else { 1 };
    if arguments.len() != expected_arity {
        return Err(fail("Wrong number of transform arguments"));
    }
    let checked = arguments
        .into_iter()
        .map(|argument| check_inner(argument, functions, outer_parameters, resolve))
        .collect::<Result<Vec<_>, _>>()?;
    let Type::List(element) = &checked[0].1 else {
        return Err(fail("A collection transform requires a typed list"));
    };
    let parameter_types = if name == "fold" {
        vec![checked[1].1.clone(), *element.clone()]
    } else if name == "reduce" {
        vec![*element.clone(), *element.clone()]
    } else {
        vec![*element.clone()]
    };
    let expected_result = match name.as_str() {
        "map" => None,
        "fold" => Some(checked[1].1.clone()),
        "reduce" => Some(*element.clone()),
        _ => Some(Type::Boolean),
    };
    let (body, result_type, captures, inline) = if let Kind::Reference(path) = &callback.kind {
        if let [helper_name] = path.as_slice() {
            if let Some(helper) = functions.get(helper_name) {
                let actual: Vec<_> = helper.parameters.iter().map(|(_, ty)| ty.clone()).collect();
                if actual != parameter_types {
                    return Err(fail("Helper parameters must match the transform's element and accumulator types"));
                }
                (
                    lower(helper.body.clone(), &|()| {
                        unreachable!("Named pure helpers have no ambient references")
                    }),
                    helper.output.clone(),
                    vec![],
                    false,
                )
            } else {
                let (body, ty, captures) = inline_body(
                    callback,
                    &parameter_types,
                    expected_result.as_ref(),
                    functions,
                    outer_parameters,
                    resolve,
                )?;
                (body, ty, captures, true)
            }
        } else {
            let (body, ty, captures) = inline_body(
                callback,
                &parameter_types,
                expected_result.as_ref(),
                functions,
                outer_parameters,
                resolve,
            )?;
            (body, ty, captures, true)
        }
    } else {
        let (body, ty, captures) = inline_body(
            callback,
            &parameter_types,
            expected_result.as_ref(),
            functions,
            outer_parameters,
            resolve,
        )?;
        (body, ty, captures, true)
    };
    if expected_result
        .as_ref()
        .is_some_and(|expected| *expected != result_type)
    {
        return Err(fail(
            "The callback must return boolean for a predicate, the seed's type for fold, or the element type for reduce",
        ));
    }
    let output = match name.as_str() {
        "map" => Type::List(Box::new(result_type)),
        "filter" => checked[0].1.clone(),
        "fold" => checked[1].1.clone(),
        "find" | "reduce" => {
            if matches!(element.as_ref(), Type::Optional(_)) {
                return Err(fail(
                    "This operation cannot produce a directly nested Optional type",
                ));
            }
            Type::Optional(element.clone())
        }
        _ => Type::Boolean,
    };
    let args = checked
        .into_iter()
        .map(|(expression, _)| expression)
        .collect();
    let kind = if inline {
        Kind::InlineTransform(name, Box::new(body), args, captures, output.clone())
    } else {
        Kind::Transform(name, Box::new(body), args, output.clone())
    };
    let expression = Expr {
        kind,
        span: span.clone(),
    };
    if !functional::within_limits(&expression) {
        return Err(fail(
            "Pure expression expansion exceeds 4096 nodes or 24 levels",
        ));
    }
    Ok((expression, output))
}

/// Resolve a contextual lambda body into local parameters plus explicit, deduplicated captures.
fn inline_body<R: Clone>(
    expression: Expr<Vec<String>>,
    types: &[Type],
    expected: Option<&Type>,
    functions: &functional::Functions,
    outer_parameters: &[(String, Type)],
    resolve: &dyn Fn(&[String], Span) -> Result<(R, Type), Diagnostic>,
) -> Result<(Expr<R>, Type, Vec<Expr<R>>), Diagnostic> {
    let span = expression.span.clone();
    let (names, body) = match expression.kind {
        Kind::Lambda(names, body) => {
            if names
                .iter()
                .any(|name| matches!(name.as_str(), "_" | "true" | "false"))
            {
                return Err(Diagnostic::error("E003", "Use distinct parameter names in a named lambda; use _ directly for placeholder syntax", span));
            }
            (names, *body)
        }
        kind => {
            let expression = Expr {
                kind,
                span: span.clone(),
            };
            let mut spans = vec![];
            placeholders(&expression, functions, &mut spans);
            spans.sort_by_key(|span| span.start);
            let names: Vec<_> = (0..spans.len())
                .map(|index| format!("$placeholder{index}"))
                .collect();
            let body = lower_references(expression, &|mut path: Vec<String>, span: Span| {
                if let Some(index) = spans.iter().position(|found| *found == span) {
                    path[0] = names[index].clone();
                }
                Expr {
                    kind: Kind::Reference(path),
                    span,
                }
            });
            (names, body)
        }
    };
    if names.len() != types.len()
        || names
            .iter()
            .enumerate()
            .any(|(index, name)| names[..index].contains(name))
    {
        return Err(Diagnostic::error("E003", format!("Expected {} distinct lambda parameter(s); each _ is a separate parameter. Use a named outer lambda for nested transforms", types.len()), span));
    }
    let parameters: Vec<_> = names.into_iter().zip(types.iter().cloned()).collect();
    let captures = RefCell::new(Vec::<(Vec<String>, Expr<R>, Type)>::new());
    let capture = |path: &[String], span: Span| {
        if let Some((index, (_, _, ty))) = captures
            .borrow()
            .iter()
            .enumerate()
            .find(|(_, (key, _, _))| key == path)
        {
            return Ok((index, ty.clone()));
        }
        let (kind, ty) = if let Some((index, (_, ty))) = outer_parameters
            .iter()
            .enumerate()
            .find(|(_, (name, _))| path.first() == Some(name))
        {
            let ty = functional::field_type(ty, &path[1..]).ok_or_else(|| {
                Diagnostic::error("E003", "Unknown captured parameter field", span.clone())
            })?;
            (Kind::Parameter(index, path[1..].into(), ty.clone()), ty)
        } else {
            let (reference, ty) = resolve(path, span.clone())?;
            (Kind::Reference(reference), ty)
        };
        let mut captures = captures.borrow_mut();
        let index = captures.len();
        captures.push((path.into(), Expr { kind, span }, ty.clone()));
        Ok((index, ty))
    };
    let (body, ty) = check_inner_expected(body, functions, &parameters, &capture, expected)?;
    let captures = captures.into_inner();
    let body = lower_references(body, &|index: usize, span| Expr {
        kind: Kind::Parameter(types.len() + index, vec![], captures[index].2.clone()),
        span,
    });
    Ok((
        body,
        ty,
        captures
            .into_iter()
            .map(|(_, expression, _)| expression)
            .collect(),
    ))
}
