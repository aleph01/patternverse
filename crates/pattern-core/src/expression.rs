//! Pure, typed expressions. There is no dynamic evaluation or Host access.
use crate::{
    syntax::{identifier, Diagnostic, Span},
    value::{Type, Value},
};
use chumsky::{prelude::*, Stream};
use serde::{Deserialize, Serialize};
pub mod functional;
use std::collections::BTreeMap;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Unary {
    Negate,
    Not,
    Count,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Binary {
    Add,
    Subtract,
    Multiply,
    Less,
    LessEqual,
    Greater,
    GreaterEqual,
    Equal,
    NotEqual,
    And,
    Or,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Expr<R> {
    pub kind: Kind<R>,
    pub span: Span,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum Kind<R> {
    List(Vec<Expr<R>>, Option<Type>),
    Record(BTreeMap<String, Expr<R>>),
    Call(String, Vec<Expr<R>>),
    Parameter(usize, Vec<String>, Type),
    Invoke(Box<Expr<R>>, Vec<Expr<R>>),
    Transform(String, Box<Expr<R>>, Vec<Expr<R>>, Type),
    Literal(Value),
    Reference(R),
    Unary(Unary, Box<Expr<R>>),
    Binary(Binary, Box<Expr<R>>, Box<Expr<R>>),
}

/// Join two operands into a binary expression whose span covers both operands.
fn binary<R>(left: Expr<R>, (op, right): (Binary, Expr<R>)) -> Expr<R> {
    let span = left.span.start..right.span.end;
    Expr {
        kind: Kind::Binary(op, Box::new(left), Box::new(right)),
        span,
    }
}
/// Match a complete reserved word, consuming surrounding whitespace.
fn keyword(word: &'static str) -> impl Parser<char, (), Error = Simple<char>> + Clone {
    identifier()
        .try_map(move |s, span| {
            if s == word {
                Ok(())
            } else {
                Err(Simple::custom(span, format!("Expected {word}")))
            }
        })
        .padded()
}
/// Build the precedence-aware expression grammar with non-associative comparisons.
fn parser() -> impl Parser<char, Expr<Vec<String>>, Error = Simple<char>> {
    recursive(|expression| {
        let number = text::int(10)
            .chain::<char, _, _>(just('.').chain(text::digits(10)).or_not().flatten())
            .chain::<char, _, _>(
                one_of("eE")
                    .chain(one_of("+-").or_not())
                    .chain::<char, _, _>(text::digits(10))
                    .or_not()
                    .flatten(),
            )
            .collect::<String>()
            .try_map(|s, span| {
                s.parse::<f64>()
                    .ok()
                    .filter(|n| n.is_finite())
                    .map(Value::Number)
                    .ok_or_else(|| Simple::custom(span, "Expected a finite number"))
            });
        let string = just('"')
            .chain(
                just('\\')
                    .chain(any())
                    .or(filter(|c| *c != '"' && *c != '\\').map(|c| vec![c]))
                    .repeated()
                    .flatten(),
            )
            .chain(just('"'))
            .collect::<String>()
            .try_map(|s, span| {
                serde_json::from_str::<String>(&s)
                    .map(Value::Text)
                    .map_err(|e| Simple::custom(span, e.to_string()))
            });
        let literal = number
            .or(string)
            .map(Kind::Literal)
            .map_with_span(|kind, span| Expr { kind, span });
        let reference = identifier()
            .separated_by(just('.'))
            .at_least(1)
            .map(|path: Vec<String>| match path.as_slice() {
                [v] if v == "true" => Kind::Literal(Value::Boolean(true)),
                [v] if v == "false" => Kind::Literal(Value::Boolean(false)),
                _ => Kind::Reference(path),
            })
            .map_with_span(|kind, span| Expr { kind, span });
        let count = keyword("count")
            .ignore_then(
                expression
                    .clone()
                    .delimited_by(just('(').padded(), just(')').padded()),
            )
            .map_with_span(|e, span| Expr {
                kind: Kind::Unary(Unary::Count, Box::new(e)),
                span,
            });
        let list = expression
            .clone()
            .separated_by(just(',').padded())
            .allow_trailing()
            .delimited_by(just('[').padded(), just(']').padded())
            .then(
                just(':')
                    .padded()
                    .ignore_then(functional::type_parser())
                    .or_not(),
            )
            .map_with_span(|(items, annotation), span| Expr {
                kind: Kind::List(items, annotation),
                span,
            });
        let record = identifier()
            .padded()
            .then_ignore(just(':').padded())
            .then(expression.clone())
            .separated_by(just(',').padded())
            .allow_trailing()
            .delimited_by(just('{').padded(), just('}').padded())
            .try_map(|fields: Vec<(String, Expr<Vec<String>>)>, span| {
                let count = fields.len();
                let fields: BTreeMap<_, _> = fields.into_iter().collect();
                if count != fields.len() {
                    return Err(Simple::custom(span, "Duplicate record field"));
                }
                Ok(Expr {
                    kind: Kind::Record(fields),
                    span,
                })
            });
        let call = identifier()
            .padded()
            .then(
                expression
                    .clone()
                    .separated_by(just(',').padded())
                    .allow_trailing()
                    .delimited_by(just('(').padded(), just(')').padded()),
            )
            .map_with_span(|(name, args), span| Expr {
                kind: Kind::Call(name, args),
                span,
            });
        let atom = count
            .or(call)
            .or(list)
            .or(record)
            .or(literal)
            .or(reference)
            .or(expression
                .clone()
                .delimited_by(just('(').padded(), just(')').padded()))
            .padded();
        let negate = just('-')
            .map_with_span(|_, span| span)
            .padded()
            .repeated()
            .then(atom)
            .foldr(|span: Span, e| Expr {
                span: span.start..e.span.end,
                kind: Kind::Unary(Unary::Negate, Box::new(e)),
            });
        let product = negate
            .clone()
            .then(
                just('*')
                    .padded()
                    .to(Binary::Multiply)
                    .then(negate)
                    .repeated(),
            )
            .foldl(binary);
        let sum = product
            .clone()
            .then(
                just('+')
                    .to(Binary::Add)
                    .or(just('-').to(Binary::Subtract))
                    .padded()
                    .then(product)
                    .repeated(),
            )
            .foldl(binary);
        let comparison = choice((
            just("<=").to(Binary::LessEqual),
            just(">=").to(Binary::GreaterEqual),
            just("==").to(Binary::Equal),
            just("!=").to(Binary::NotEqual),
            just("<").to(Binary::Less),
            just(">").to(Binary::Greater),
        ))
        .padded();
        // Comparisons are non-associative: a < b < c needs explicit boolean clauses.
        let compare = sum
            .clone()
            .then(comparison.then(sum).or_not())
            .map(|(left, right)| match right {
                Some(pair) => binary(left, pair),
                None => left,
            });
        let not = keyword("not")
            .map_with_span(|_, span| span)
            .repeated()
            .then(compare)
            .foldr(|span: Span, e| Expr {
                span: span.start..e.span.end,
                kind: Kind::Unary(Unary::Not, Box::new(e)),
            });
        let and = not
            .clone()
            .then(keyword("and").to(Binary::And).then(not).repeated())
            .foldl(binary);
        let boolean = and
            .clone()
            .then(keyword("or").to(Binary::Or).then(and).repeated())
            .foldl(binary);
        let stage = identifier()
            .padded()
            .then(
                expression
                    .separated_by(just(',').padded())
                    .delimited_by(just('(').padded(), just(')').padded())
                    .or_not(),
            )
            .map_with_span(|(name, args), span| (name, args.unwrap_or_default(), span));
        boolean
            .then(just("|>").padded().ignore_then(stage).repeated())
            .foldl(
                |value, (name, mut args, span): (String, Vec<Expr<Vec<String>>>, Span)| {
                    let start = value.span.start;
                    args.insert(0, value);
                    Expr {
                        kind: Kind::Call(name, args),
                        span: start..span.end,
                    }
                },
            )
    })
    .then_ignore(end())
}
/// Parse an expression using byte spans relative to `offset` in the enclosing source.
///
/// # Errors
/// Returns a syntax diagnostic for invalid input or exceeded authoring complexity limits.
pub fn parse(source: &str, offset: usize) -> Result<Expr<Vec<String>>, Diagnostic> {
    parse_version(source, offset, 1)
}

/// Parse functional expressions under language one or the earlier language-two compatibility spelling.
///
/// # Errors
/// Rejects unknown syntax and complexity excesses; declaration validation owns language versions.
pub fn parse_version(
    source: &str,
    offset: usize,
    language: u32,
) -> Result<Expr<Vec<String>>, Diagnostic> {
    // Bound recursive parser work for authoring input (not a production import quota).
    let mut quoted = false;
    let mut escaped = false;
    let mut depth = 0usize;
    let mut type_depth = 0usize;
    let mut operators = 0;
    let mut outside = String::new();
    let mut too_complex = source.len() > 16384;
    for c in source.chars() {
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
        outside.push(if c == '"' { ' ' } else { c });
        if matches!(language, 1 | 2) {
            if c == '<' {
                type_depth += 1;
            } else if c == '>' {
                type_depth = type_depth.saturating_sub(1);
            }
            too_complex |= type_depth > 16;
        }
        match c {
            '"' => quoted = true,
            '(' | '[' | '{' => {
                depth += 1;
                too_complex |= depth > 16;
            }
            ')' | ']' | '}' => depth = depth.saturating_sub(1),
            '+' | '-' | '*' | '<' | '>' | '=' | '!' => operators += 1,
            _ => {}
        }
    }
    // Also bound keyword chains (including adjacent parentheses), not words in literals.
    operators += outside
        .split(|c: char| !c.is_ascii_alphanumeric() && c != '_' && c != '-')
        .filter(|s| matches!(*s, "not" | "and" | "or"))
        .count();
    if too_complex || operators > 128 {
        return Err(Diagnostic::error(
            "E001",
            "Expression exceeds the authoring complexity limit",
            offset..offset + source.len(),
        ));
    }
    let parsed = parser()
        .parse(Stream::from_iter(
            offset + source.len()..offset + source.len(),
            source
                .char_indices()
                .map(|(i, c)| (c, offset + i..offset + i + c.len_utf8())),
        ))
        .map_err(|errors| {
            let e = &errors[0];
            Diagnostic::error("E001", e.to_string(), e.span())
        })?;
    Ok(parsed)
}
/// Resolve reference paths and type-check operands without implicit coercion.
///
/// # Errors
/// Returns resolver diagnostics or an incompatible-operand diagnostic.
pub fn check<R: Clone>(
    expr: Expr<Vec<String>>,
    resolve: &impl Fn(&[String], Span) -> Result<(R, Type), Diagnostic>,
) -> Result<(Expr<R>, Type), Diagnostic> {
    check_with_functions(expr, &BTreeMap::new(), resolve)
}

/// Resolve pure helpers and values without granting helpers access to ambient bindings.
///
/// # Errors
/// Returns precise type, unknown-function, and bounded-expansion diagnostics.
pub fn check_with_functions<R: Clone>(
    expr: Expr<Vec<String>>,
    functions: &functional::Functions,
    resolve: &impl Fn(&[String], Span) -> Result<(R, Type), Diagnostic>,
) -> Result<(Expr<R>, Type), Diagnostic> {
    let checked = check_inner(expr, functions, &[], resolve)?;
    if functional::requires_v2(&checked.0) && !functional::within_limits(&checked.0) {
        return Err(Diagnostic::error(
            "E002",
            "Pure expression expansion exceeds 4096 nodes or 24 levels",
            checked.0.span.clone(),
        ));
    }
    Ok(checked)
}

/// Type-check a pure expression with lexical parameters and a fixed helper environment.
fn check_inner<R: Clone>(
    expr: Expr<Vec<String>>,
    functions: &functional::Functions,
    parameters: &[(String, Type)],
    resolve: &impl Fn(&[String], Span) -> Result<(R, Type), Diagnostic>,
) -> Result<(Expr<R>, Type), Diagnostic> {
    let span = expr.span;
    let fail = || {
        Diagnostic::error(
            "E002",
            "Expression operands have incompatible types (no implicit coercion)",
            span.clone(),
        )
    };
    let (kind, ty) = match expr.kind {
        Kind::Call(name, args) => {
            return functional::check_call(name, args, span, functions, parameters, resolve)
        }
        Kind::List(items, annotation) => {
            let checked = items
                .into_iter()
                .map(|item| check_inner(item, functions, parameters, resolve))
                .collect::<Result<Vec<_>, _>>()?;
            let ty = annotation
                .or_else(|| checked.first().map(|(_, ty)| ty.clone()))
                .ok_or_else(|| {
                    Diagnostic::error(
                        "E002",
                        "Empty lists need an element annotation, e.g. []:text",
                        span.clone(),
                    )
                })?;
            if checked.iter().any(|(_, item_ty)| item_ty != &ty) {
                return Err(fail());
            }
            (
                Kind::List(
                    checked.into_iter().map(|(expr, _)| expr).collect(),
                    Some(ty.clone()),
                ),
                Type::List(Box::new(ty)),
            )
        }
        Kind::Record(fields) => {
            let fields = fields
                .into_iter()
                .map(|(name, expr)| {
                    check_inner(expr, functions, parameters, resolve).map(|value| (name, value))
                })
                .collect::<Result<BTreeMap<_, _>, _>>()?;
            let ty = Type::Record(
                fields
                    .iter()
                    .map(|(n, (_, t))| (n.clone(), t.clone()))
                    .collect(),
            );
            (
                Kind::Record(fields.into_iter().map(|(n, (e, _))| (n, e)).collect()),
                ty,
            )
        }
        Kind::Parameter(..) | Kind::Invoke(..) | Kind::Transform(..) => return Err(fail()),
        Kind::Literal(v) => {
            let ty = v.value_type();
            (Kind::Literal(v), ty)
        }
        Kind::Reference(path) => {
            if let Some((index, (_, ty))) = parameters
                .iter()
                .enumerate()
                .find(|(_, (name, _))| path.first() == Some(name))
            {
                let ty = functional::field_type(ty, &path[1..]).ok_or_else(fail)?;
                return Ok((
                    Expr {
                        kind: Kind::Parameter(index, path[1..].into(), ty.clone()),
                        span,
                    },
                    ty,
                ));
            }
            let (r, ty) = resolve(&path, span.clone())?;
            (Kind::Reference(r), ty)
        }
        Kind::Unary(op, expr) => {
            let (e, ty) = check_inner(*expr, functions, parameters, resolve)?;
            let out = match (&op, &ty) {
                (Unary::Negate, Type::Number) => Type::Number,
                (Unary::Not, Type::Boolean) => Type::Boolean,
                (Unary::Count, Type::Choices | Type::List(_)) => Type::Number,
                _ => return Err(fail()),
            };
            (Kind::Unary(op, Box::new(e)), out)
        }
        Kind::Binary(op, a, b) => {
            let (a, ta) = check_inner(*a, functions, parameters, resolve)?;
            let (b, tb) = check_inner(*b, functions, parameters, resolve)?;
            let ty = match op {
                Binary::Add | Binary::Subtract | Binary::Multiply
                    if ta == Type::Number && tb == ta =>
                {
                    Type::Number
                }
                Binary::Less | Binary::LessEqual | Binary::Greater | Binary::GreaterEqual
                    if ta == Type::Number && tb == ta =>
                {
                    Type::Boolean
                }
                Binary::Equal | Binary::NotEqual if ta == tb => Type::Boolean,
                Binary::And | Binary::Or if ta == Type::Boolean && tb == ta => Type::Boolean,
                _ => return Err(fail()),
            };
            (Kind::Binary(op, Box::new(a), Box::new(b)), ty)
        }
    };
    Ok((Expr { kind, span }, ty))
}
/// Replace resolved reference representations while preserving operators and source spans.
pub fn lower<R, S>(expr: Expr<R>, resolve: &impl Fn(R) -> S) -> Expr<S> {
    Expr {
        span: expr.span,
        kind: match expr.kind {
            Kind::List(items, ty) => {
                Kind::List(items.into_iter().map(|e| lower(e, resolve)).collect(), ty)
            }
            Kind::Record(fields) => Kind::Record(
                fields
                    .into_iter()
                    .map(|(n, e)| (n, lower(e, resolve)))
                    .collect(),
            ),
            Kind::Call(name, args) => {
                Kind::Call(name, args.into_iter().map(|e| lower(e, resolve)).collect())
            }
            Kind::Parameter(index, path, ty) => Kind::Parameter(index, path, ty),
            Kind::Invoke(body, args) => Kind::Invoke(
                Box::new(lower(*body, resolve)),
                args.into_iter().map(|e| lower(e, resolve)).collect(),
            ),
            Kind::Transform(name, body, args, ty) => Kind::Transform(
                name,
                Box::new(lower(*body, resolve)),
                args.into_iter().map(|e| lower(e, resolve)).collect(),
                ty,
            ),
            Kind::Literal(v) => Kind::Literal(v),
            Kind::Reference(r) => Kind::Reference(resolve(r)),
            Kind::Unary(op, e) => Kind::Unary(op, Box::new(lower(*e, resolve))),
            Kind::Binary(op, a, b) => Kind::Binary(
                op,
                Box::new(lower(*a, resolve)),
                Box::new(lower(*b, resolve)),
            ),
        },
    }
}
/// Compare values recursively; choice equality uses stable values rather than display labels.
fn equal(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Choice(a), Value::Choice(b)) => a.value == b.value,
        (Value::Choices(a), Value::Choices(b)) => {
            a.iter().map(|c| &c.value).eq(b.iter().map(|c| &c.value))
        }
        (Value::Record(a), Value::Record(b)) => {
            a.len() == b.len()
                && a.iter()
                    .all(|(k, v)| b.get(k).is_some_and(|other| equal(v, other)))
        }
        (
            Value::List {
                element_type: ta,
                items: a,
            },
            Value::List {
                element_type: tb,
                items: b,
            },
        ) => ta == tb && a.len() == b.len() && a.iter().zip(b).all(|(a, b)| equal(a, b)),
        _ => a == b,
    }
}
/// Evaluate using only supplied bindings, short-circuiting boolean operations.
///
/// # Errors
/// Returns binding errors, invalid operand errors, or non-finite arithmetic errors.
pub fn eval<R>(
    expr: &Expr<R>,
    resolve: &impl Fn(&R) -> Result<Value, String>,
) -> Result<Value, String> {
    eval_inner(
        expr,
        resolve,
        &[],
        &mut functional::Budget::new(functional::requires_v2(expr)),
    )
}

/// Evaluate one node with a shared work budget and explicit pure-function parameters.
fn eval_inner<R>(
    expr: &Expr<R>,
    resolve: &impl Fn(&R) -> Result<Value, String>,
    parameters: &[Value],
    fuel: &mut functional::Budget,
) -> Result<Value, String> {
    fuel.work(1)?;
    let invalid = || "Invalid typed expression".to_string();
    let value = match &expr.kind {
        Kind::List(items, Some(ty)) => Value::List {
            element_type: ty.clone(),
            items: items
                .iter()
                .map(|e| eval_inner(e, resolve, parameters, fuel))
                .collect::<Result<_, _>>()?,
        },
        Kind::List(_, None) => return Err(invalid()),
        Kind::Record(fields) => Value::Record(
            fields
                .iter()
                .map(|(n, e)| eval_inner(e, resolve, parameters, fuel).map(|v| (n.clone(), v)))
                .collect::<Result<_, _>>()?,
        ),
        Kind::Parameter(index, path, _) => parameters
            .get(*index)
            .and_then(|value| value.field_path(path))
            .ok_or_else(invalid)?,
        Kind::Invoke(body, args) => {
            let args = args
                .iter()
                .map(|e| eval_inner(e, resolve, parameters, fuel))
                .collect::<Result<Vec<_>, _>>()?;
            eval_inner(body, resolve, &args, fuel)?
        }
        Kind::Call(name, args) => {
            let args = args
                .iter()
                .map(|e| eval_inner(e, resolve, parameters, fuel))
                .collect::<Result<Vec<_>, _>>()?;
            functional::builtin(name, args, fuel)?
        }
        Kind::Transform(name, body, args, ty) => {
            functional::transform(name, body, args, ty, resolve, parameters, fuel)?
        }
        Kind::Literal(v) => v.clone(),
        Kind::Reference(r) => resolve(r)?,
        Kind::Unary(op, e) => match (op, eval_inner(e, resolve, parameters, fuel)?) {
            (Unary::Negate, Value::Number(n)) => Value::Number(-n),
            (Unary::Not, Value::Boolean(v)) => Value::Boolean(!v),
            (Unary::Count, Value::Choices(v)) => Value::Number(v.len() as f64),
            (Unary::Count, Value::List { items, .. }) => Value::Number(items.len() as f64),
            _ => return Err(invalid()),
        },
        Kind::Binary(op, a, b) => {
            let a = eval_inner(a, resolve, parameters, fuel)?;
            if *op == Binary::And && a == Value::Boolean(false) {
                return Ok(a);
            }
            if *op == Binary::Or && a == Value::Boolean(true) {
                return Ok(a);
            }
            let b = eval_inner(b, resolve, parameters, fuel)?;
            match (op, &a, &b) {
                (Binary::Equal, _, _) => Value::Boolean(equal(&a, &b)),
                (Binary::NotEqual, _, _) => Value::Boolean(!equal(&a, &b)),
                (op, Value::Number(a), Value::Number(b)) => match op {
                    Binary::Add => Value::Number(a + b),
                    Binary::Subtract => Value::Number(a - b),
                    Binary::Multiply => Value::Number(a * b),
                    Binary::Less => Value::Boolean(a < b),
                    Binary::LessEqual => Value::Boolean(a <= b),
                    Binary::Greater => Value::Boolean(a > b),
                    Binary::GreaterEqual => Value::Boolean(a >= b),
                    _ => return Err(invalid()),
                },
                (Binary::And, Value::Boolean(a), Value::Boolean(b)) => Value::Boolean(*a && *b),
                (Binary::Or, Value::Boolean(a), Value::Boolean(b)) => Value::Boolean(*a || *b),
                _ => return Err(invalid()),
            }
        }
    };
    if !value.is_valid() {
        return Err("Arithmetic produced a non-finite value".into());
    }
    fuel.value(&value)?;
    Ok(value)
}
