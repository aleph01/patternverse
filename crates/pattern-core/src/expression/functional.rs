//! Restricted named pure helpers: no captures, effects, recursion, or first-class closures.
use super::*;
use crate::syntax::{self, Attribute};

#[derive(Clone, Debug)]
pub struct Function {
    parameters: Vec<(String, Type)>,
    output: Type,
    body: Expr<()>,
}
pub type Functions = BTreeMap<String, Function>;

/// Parse concrete scalar, list and structural record types, never callable values.
pub(super) fn type_parser() -> impl Parser<char, Type, Error = Simple<char>> + Clone {
    recursive(|ty| {
        let list = just("list")
            .padded()
            .ignore_then(
                ty.clone()
                    .delimited_by(just('<').padded(), just('>').padded()),
            )
            .map(|ty| Type::List(Box::new(ty)));
        let record = identifier()
            .padded()
            .then_ignore(just(':').padded())
            .then(ty)
            .separated_by(just(',').padded())
            .allow_trailing()
            .delimited_by(just('{').padded(), just('}').padded())
            .try_map(|fields: Vec<(String, Type)>, span| {
                let count = fields.len();
                let fields: BTreeMap<_, _> = fields.into_iter().collect();
                if fields.len() != count {
                    Err(Simple::custom(span, "Duplicate type field"))
                } else {
                    Ok(Type::Record(fields))
                }
            });
        let scalar = identifier().try_map(|name: String, span| match name.as_str() {
            "text" => Ok(Type::Text),
            "number" => Ok(Type::Number),
            "boolean" => Ok(Type::Boolean),
            "choice" => Ok(Type::Choice),
            "choices" => Ok(Type::Choices),
            _ => Err(Simple::custom(span, "Unknown value type")),
        });
        list.or(record).or(scalar).padded()
    })
}

/// Parse explicit helper parameter/result types without guessing from runtime values.
///
/// # Errors
/// Rejects unknown types and deeply nested list types.
pub fn parse_type(source: &str, span: Span) -> Result<Type, Diagnostic> {
    let error = || {
        Diagnostic::error(
            "E003",
            "Expected a bounded scalar, list<type> or {field: type} type",
            span.clone(),
        )
    };
    let mut depth = 0usize;
    if source.len() > 4096 {
        return Err(error());
    }
    for c in source.chars() {
        if matches!(c, '<' | '{') {
            depth += 1;
        } else if matches!(c, '>' | '}') {
            depth = depth.saturating_sub(1);
        }
        if depth > 16 {
            return Err(error());
        }
    }
    type_parser()
        .then_ignore(end())
        .parse(source.trim())
        .map_err(|_| error())
}

/// Split helper parameters only at commas outside nested structural types.
fn parameter_parts(source: &str) -> Vec<&str> {
    let mut depth = 0usize;
    let mut start = 0;
    let mut parts = vec![];
    for (i, c) in source.char_indices() {
        match c {
            '<' | '{' => depth += 1,
            '>' | '}' => depth = depth.saturating_sub(1),
            ',' if depth == 0 => {
                parts.push(&source[start..i]);
                start = i + 1;
            }
            _ => {}
        }
    }
    parts.push(&source[start..]);
    parts
}

/// Validate helpers in declaration order; only parameters and previously defined helpers are visible.
///
/// # Errors
/// Rejects version-one declarations, duplicate names, effects, captures, recursion and invalid contracts.
pub fn definitions(declarations: &[Attribute], language: u32) -> Result<Functions, Diagnostic> {
    let mut functions = Functions::new();
    for declaration in declarations.iter().filter(|a| a.name == "function") {
        let fail = || {
            Diagnostic::error("E003", "Expected fn name(arg: type) -> type => pure_expression; helpers must precede flow steps", declaration.span.clone())
        };
        if !matches!(language, 1 | 2) || functions.len() >= 32 {
            return Err(fail());
        }
        let (signature, source) = declaration.raw.split_once("=>").ok_or_else(fail)?;
        let (name, tail) = signature.split_once('(').ok_or_else(fail)?;
        let name = name.trim();
        if !syntax::is_identifier(name) || is_builtin(name) || functions.contains_key(name) {
            return Err(fail());
        }
        let (args, output) = tail.split_once(')').ok_or_else(fail)?;
        let output = parse_type(
            output.trim().strip_prefix("->").ok_or_else(fail)?,
            declaration.span.clone(),
        )?;
        let mut parameters = vec![];
        for arg in parameter_parts(args)
            .into_iter()
            .filter(|arg| !arg.trim().is_empty())
        {
            let (key, ty) = arg.split_once(':').ok_or_else(fail)?;
            let key = key.trim();
            if !syntax::is_identifier(key) || parameters.iter().any(|(n, _)| n == key) {
                return Err(fail());
            }
            parameters.push((key.to_string(), parse_type(ty, declaration.span.clone())?));
        }
        if parameters.len() > 8 {
            return Err(fail());
        }
        let offset = declaration.raw_offset + signature.len() + 2;
        let expression = parse_version(source, offset, 2)?;
        let (body, ty) = check_inner(expression, &functions, &parameters, &|path, span| {
            Err::<((), Type), _>(Diagnostic::error(
                "E003",
                format!("Pure helpers cannot capture '{}'", path.join(".")),
                span,
            ))
        })?;
        if ty != output || !within_limits(&body) {
            return Err(fail());
        }
        functions.insert(
            name.into(),
            Function {
                parameters,
                output,
                body,
            },
        );
    }
    Ok(functions)
}

/// Identify added forms so legacy source cannot change interpretation after an upgrade.
pub(super) fn requires_v2<R>(expression: &Expr<R>) -> bool {
    match &expression.kind {
        Kind::Literal(_) | Kind::Reference(_) => false,
        Kind::Unary(_, e) => requires_v2(e),
        Kind::Binary(_, a, b) => requires_v2(a) || requires_v2(b),
        _ => true,
    }
}

/// Count expanded syntax nodes, including helper bodies, before allowing execution.
pub(super) fn node_count<R>(expression: &Expr<R>) -> usize {
    1 + match &expression.kind {
        Kind::List(args, _) | Kind::Call(_, args) => args.iter().map(node_count).sum(),
        Kind::Record(fields) => fields.values().map(node_count).sum(),
        Kind::Unary(_, e) => node_count(e),
        Kind::Binary(_, a, b) => node_count(a) + node_count(b),
        Kind::Invoke(body, args) | Kind::Transform(_, body, args, _) => {
            node_count(body) + args.iter().map(node_count).sum::<usize>()
        }
        _ => 0,
    }
}

/// Bound expanded helpers in both size and depth so saved JSON remains safely reloadable.
pub(super) fn within_limits<R>(expression: &Expr<R>) -> bool {
    node_count(expression) <= 4096 && depth(expression) <= 24
}

/// Measure recursive syntax nesting, including inlined helper bodies and their arguments.
fn depth<R>(expression: &Expr<R>) -> usize {
    1 + match &expression.kind {
        Kind::List(args, _) | Kind::Call(_, args) => args.iter().map(depth).max().unwrap_or(0),
        Kind::Record(fields) => fields.values().map(depth).max().unwrap_or(0),
        Kind::Unary(_, e) => depth(e),
        Kind::Binary(_, a, b) => depth(a).max(depth(b)),
        Kind::Invoke(body, args) | Kind::Transform(_, body, args, _) => {
            depth(body).max(args.iter().map(depth).max().unwrap_or(0))
        }
        _ => 0,
    }
}

/// Resolve a parameter field path with the same record/choice rules as ordinary bindings.
pub(super) fn field_type(ty: &Type, path: &[String]) -> Option<Type> {
    path.iter().try_fold(ty.clone(), |ty, key| match ty {
        Type::Record(fields) => fields.get(key).cloned(),
        Type::Choice if matches!(key.as_str(), "value" | "label") => Some(Type::Text),
        _ => None,
    })
}

/// Reserve built-in names rather than allowing helpers to replace their semantics.
fn is_builtin(name: &str) -> bool {
    matches!(
        name,
        "count"
            | "trim"
            | "lowercase"
            | "normalize_whitespace"
            | "concat"
            | "clamp"
            | "map"
            | "filter"
            | "flatten"
            | "fold"
    )
}

/// Validate a named call, lowering helpers to explicit argument-local pure invocation nodes.
pub(super) fn check_call<R: Clone>(
    name: String,
    mut args: Vec<Expr<Vec<String>>>,
    span: Span,
    functions: &Functions,
    parameters: &[(String, Type)],
    resolve: &impl Fn(&[String], Span) -> Result<(R, Type), Diagnostic>,
) -> Result<(Expr<R>, Type), Diagnostic> {
    let fail = || {
        Diagnostic::error(
            "E003",
            format!("Invalid pure call '{name}': check its name, argument count and types"),
            span.clone(),
        )
    };
    let higher = matches!(name.as_str(), "map" | "filter" | "fold");
    let helper = if higher {
        let last = args.pop().ok_or_else(fail)?;
        let Kind::Reference(path) = last.kind else {
            return Err(fail());
        };
        if path.len() != 1 {
            return Err(fail());
        }
        Some(functions.get(&path[0]).ok_or_else(fail)?)
    } else {
        functions.get(&name)
    };
    let checked = args
        .into_iter()
        .map(|e| check_inner(e, functions, parameters, resolve))
        .collect::<Result<Vec<_>, _>>()?;
    let types: Vec<_> = checked.iter().map(|(_, ty)| ty.clone()).collect();
    let args: Vec<_> = checked.into_iter().map(|(e, _)| e).collect();
    let (kind, ty) = if let Some(helper) = helper {
        let expected: Vec<_> = helper.parameters.iter().map(|(_, ty)| ty.clone()).collect();
        let body = Box::new(lower(helper.body.clone(), &|()| {
            unreachable!("Pure helpers never contain ambient references")
        }));
        if higher {
            let Some(Type::List(element)) = types.first() else {
                return Err(fail());
            };
            let ty = match name.as_str() {
                "map" if types.len() == 1 && expected == vec![*element.clone()] => {
                    Type::List(Box::new(helper.output.clone()))
                }
                "filter"
                    if types.len() == 1
                        && expected == vec![*element.clone()]
                        && helper.output == Type::Boolean =>
                {
                    types[0].clone()
                }
                "fold"
                    if types.len() == 2
                        && expected == vec![types[1].clone(), *element.clone()]
                        && helper.output == types[1] =>
                {
                    types[1].clone()
                }
                _ => return Err(fail()),
            };
            (Kind::Transform(name, body, args, ty.clone()), ty)
        } else {
            if types != expected {
                return Err(fail());
            }
            (Kind::Invoke(body, args), helper.output.clone())
        }
    } else {
        let ty = builtin_type(&name, &types).ok_or_else(fail)?;
        (Kind::Call(name, args), ty)
    };
    let expression = Expr { kind, span };
    if !within_limits(&expression) {
        return Err(Diagnostic::error(
            "E003",
            "Pure expression expansion exceeds 4096 nodes or 24 levels",
            expression.span,
        ));
    }
    Ok((expression, ty))
}

/// Describe monomorphic built-ins; no coercion or overloaded arithmetic is inferred.
fn builtin_type(name: &str, types: &[Type]) -> Option<Type> {
    match (name, types) {
        ("trim" | "lowercase" | "normalize_whitespace", [Type::Text]) => Some(Type::Text),
        ("clamp", [Type::Number, Type::Number, Type::Number]) => Some(Type::Number),
        ("count", [Type::List(_) | Type::Choices]) => Some(Type::Number),
        ("concat", [a, b]) if a == b && matches!(a, Type::Text | Type::List(_)) => Some(a.clone()),
        ("flatten", [Type::List(inner)]) => match inner.as_ref() {
            Type::List(_) => Some(*inner.clone()),
            _ => None,
        },
        _ => None,
    }
}

/// Bound intermediate values as well as final results to prevent pure expansion from exhausting memory.
pub(super) struct Budget {
    work: usize,
    bytes: usize,
    bounded: bool,
}

/// Bound combined traversal outputs or semantic candidates before committing another item.
pub(crate) fn validate_values<'a>(
    values: impl IntoIterator<Item = &'a Value>,
) -> Result<(), String> {
    let mut budget = Budget::new(true);
    values.into_iter().try_for_each(|value| budget.value(value))
}
impl Budget {
    /// Leave legacy values unchanged while bounding all work and new intermediate copies.
    pub fn new(bounded: bool) -> Self {
        Self {
            work: 100_000,
            bytes: 16 * 1024 * 1024,
            bounded,
        }
    }
    /// Charge deterministic traversal work before entering another computation.
    pub(super) fn work(&mut self, count: usize) -> Result<(), String> {
        self.work = self
            .work
            .checked_sub(count)
            .ok_or("Pure evaluation exceeded its work budget")?;
        Ok(())
    }
    /// Charge the aggregate size of every produced value, including nested fields and lists.
    pub(super) fn value(&mut self, value: &Value) -> Result<(), String> {
        if !self.bounded {
            return Ok(());
        }
        self.bytes = self
            .bytes
            .checked_sub(32)
            .ok_or("Pure evaluation exceeded its value budget")?;
        match value {
            Value::Enum { schema, variant } => {
                self.text(&schema.name)?;
                self.text(variant)
            }
            Value::Text(text) => self.text(text),
            Value::List { items, .. } if items.len() <= 10_000 => {
                items.iter().try_for_each(|v| self.value(v))
            }
            Value::Record(fields) if fields.len() <= 256 => fields.iter().try_for_each(|(k, v)| {
                self.text(k)?;
                self.value(v)
            }),
            Value::Choice(c) => {
                self.text(&c.value)?;
                self.text(&c.label)
            }
            Value::Choices(items) if items.len() <= 10_000 => items.iter().try_for_each(|c| {
                self.text(&c.value)?;
                self.text(&c.label)
            }),
            Value::Number(_) | Value::Boolean(_) => Ok(()),
            _ => Err("Pure value exceeds its collection size limit".into()),
        }
    }
    /// Bound individual strings and cumulative copies within a pure evaluation.
    fn text(&mut self, text: &str) -> Result<(), String> {
        if text.len() > 1_048_576 {
            return Err("Pure text exceeds 1 MiB".into());
        }
        self.bytes = self
            .bytes
            .checked_sub(text.len())
            .ok_or("Pure evaluation exceeded its value budget")?;
        Ok(())
    }
}

/// Run a checked built-in deterministically with bounded collection expansion.
pub(super) fn builtin(name: &str, args: Vec<Value>, fuel: &mut Budget) -> Result<Value, String> {
    match (name, args.as_slice()) {
        ("trim", [Value::Text(text)]) => Ok(Value::Text(text.trim().into())),
        ("lowercase", [Value::Text(text)]) => Ok(Value::Text(text.to_lowercase())),
        ("normalize_whitespace", [Value::Text(text)]) => Ok(Value::Text(
            text.split_whitespace().collect::<Vec<_>>().join(" "),
        )),
        ("clamp", [Value::Number(value), Value::Number(min), Value::Number(max)]) if min <= max => {
            Ok(Value::Number(value.clamp(*min, *max)))
        }
        ("count", [Value::List { items, .. }]) => Ok(Value::Number(items.len() as f64)),
        ("count", [Value::Choices(items)]) => Ok(Value::Number(items.len() as f64)),
        ("concat", [Value::Text(a), Value::Text(b)]) if a.len() + b.len() <= 1_048_576 => {
            Ok(Value::Text(format!("{a}{b}")))
        }
        (
            "concat",
            [Value::List {
                element_type,
                items: a,
            }, Value::List { items: b, .. }],
        ) if a.len() + b.len() <= 10_000 => Ok(Value::List {
            element_type: element_type.clone(),
            items: a.iter().chain(b).cloned().collect(),
        }),
        (
            "flatten",
            [Value::List {
                element_type: Type::List(element),
                items,
            }],
        ) => {
            let mut flattened = vec![];
            for item in items {
                let Value::List { items, .. } = item else {
                    return Err("Invalid flatten input".into());
                };
                fuel.work(items.len())?;
                if flattened.len() + items.len() > 10_000 {
                    return Err("Flatten exceeds 10000 items".into());
                }
                flattened.extend(items.iter().cloned());
            }
            Ok(Value::List {
                element_type: *element.clone(),
                items: flattened,
            })
        }
        _ => Err("Invalid pure call or value limit exceeded".into()),
    }
}

/// Execute sequential pure collection transforms; each helper receives fresh explicit parameters.
pub(super) fn transform<R>(
    name: &str,
    body: &Expr<R>,
    args: &[Expr<R>],
    ty: &Type,
    resolve: &impl Fn(&R) -> Result<Value, String>,
    parameters: &[Value],
    fuel: &mut Budget,
) -> Result<Value, String> {
    let values = args
        .iter()
        .map(|e| eval_inner(e, resolve, parameters, fuel))
        .collect::<Result<Vec<_>, _>>()?;
    let Some(Value::List { items, .. }) = values.first() else {
        return Err("Invalid transform input".into());
    };
    if name == "fold" {
        return items.iter().try_fold(
            values.get(1).ok_or("Missing fold seed")?.clone(),
            |acc, item| eval_inner(body, resolve, &[acc, item.clone()], fuel),
        );
    }
    let mut output = vec![];
    for item in items {
        let result = eval_inner(body, resolve, std::slice::from_ref(item), fuel)?;
        if name == "map" {
            output.push(result);
        } else if result == Value::Boolean(true) {
            output.push(item.clone());
        }
    }
    let Type::List(element) = ty else {
        return Err("Invalid transform output".into());
    };
    Ok(Value::List {
        element_type: *element.clone(),
        items: output,
    })
}
