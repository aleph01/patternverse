//! Restricted named pure helpers: no captures, effects, recursion, or first-class closures.
use super::*;
use crate::syntax::{self, Attribute};

#[derive(Clone, Debug)]
pub struct Function {
    pub(super) parameters: Vec<(String, Type)>,
    pub(super) output: Type,
    pub(super) body: Expr<()>,
}
pub type Functions = BTreeMap<String, Function>;

/// Built-in call names exposed by the language reference and editor.
pub const BUILTIN_FUNCTIONS: &[&str] = &[
    "lookup",
    "records",
    "count",
    "trim",
    "lowercase",
    "normalize_whitespace",
    "concat",
    "clamp",
    "map",
    "filter",
    "shuffle",
    "flatten",
    "fold",
    "reduce",
    "join",
    "split",
    "contains",
    "starts_with",
    "ends_with",
    "sum",
    "min",
    "max",
    "first",
    "last",
    "find",
    "any",
    "all",
    "distinct",
];

/// Parse concrete scalar, list and structural record types, never callable values.
pub(super) fn type_parser(
    language: u32,
    enums: BTreeMap<String, crate::value::EnumType>,
) -> impl Parser<char, Type, Error = Simple<char>> + Clone {
    type_parser_with_references(language, enums, BTreeMap::new())
}
/// Extend the structural type grammar with aliases for frozen catalogue references.
fn type_parser_with_references(
    _language: u32,
    enums: BTreeMap<String, crate::value::EnumType>,
    references: BTreeMap<String, crate::data::ReferenceType>,
) -> impl Parser<char, Type, Error = Simple<char>> + Clone {
    recursive(move |ty| {
        let list = just("list")
            .padded()
            .ignore_then(
                ty.clone()
                    .delimited_by(just('<').padded(), just('>').padded())
                    .or(ty
                        .clone()
                        .delimited_by(just('[').padded(), just(']').padded())),
            )
            .map(|ty| Type::List(Box::new(ty)));
        let optional = just("Optional")
            .padded()
            .ignore_then(
                ty.clone()
                    .delimited_by(just('[').padded(), just(']').padded()),
            )
            .try_map(move |inner, span| {
                if matches!(inner, Type::Optional(_)) {
                    Err(Simple::custom(
                        span,
                        "Optional[T] cannot be nested directly",
                    ))
                } else {
                    Ok(Type::Optional(Box::new(inner)))
                }
            });
        let record = identifier()
            .padded()
            .then_ignore(just(':').padded())
            .then(ty.clone())
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
        let enums = enums.clone();
        let scalar = identifier().try_map(move |name: String, span| match name.as_str() {
            "text" => Ok(Type::Text),
            "number" => Ok(Type::Number),
            "boolean" => Ok(Type::Boolean),
            "choice" => Ok(Type::Choice),
            "choices" => Ok(Type::Choices),
            _ => enums
                .get(&name)
                .cloned()
                .map(Type::Enum)
                .ok_or_else(|| Simple::custom(span, "Unknown value type")),
        });
        let references = references.clone();
        let reference = just("ref")
            .padded()
            .ignore_then(
                identifier()
                    .padded()
                    .delimited_by(just('[').padded(), just(']').padded()),
            )
            .try_map(move |alias, span| {
                references
                    .get(&alias)
                    .cloned()
                    .map(Type::Reference)
                    .ok_or_else(|| Simple::custom(span, "ref[T] requires an imported data library"))
            });
        reference
            .or(optional)
            .or(list)
            .or(record)
            .or(scalar)
            .padded()
    })
}

/// Parse explicit helper parameter/result types without guessing from runtime values.
///
/// # Errors
/// Rejects unknown types and deeply nested list types.
pub fn parse_type(source: &str, span: Span) -> Result<Type, Diagnostic> {
    parse_type_version(source, span, 1, &BTreeMap::new())
}

/// Parse bounded versioned types using only the supplied closed enum declarations.
pub(crate) fn parse_type_version(
    source: &str,
    span: Span,
    language: u32,
    enums: &BTreeMap<String, crate::value::EnumType>,
) -> Result<Type, Diagnostic> {
    parse_type_with_references(source, span, language, enums, &BTreeMap::new())
}
/// Parse a complete type annotation in its enum and data-reference environment.
pub(crate) fn parse_type_with_references(
    source: &str,
    span: Span,
    language: u32,
    enums: &BTreeMap<String, crate::value::EnumType>,
    references: &BTreeMap<String, crate::data::ReferenceType>,
) -> Result<Type, Diagnostic> {
    let error = || {
        Diagnostic::error(
            "E003",
            "Expected a known scalar, bounded list[T], Optional[T], or {field: type}",
            span.clone(),
        )
    };
    let mut depth = 0usize;
    if source.len() > 4096 {
        return Err(error());
    }
    for c in source.chars() {
        if matches!(c, '<' | '{' | '[') {
            depth += 1;
        } else if matches!(c, '>' | '}' | ']') {
            depth = depth.saturating_sub(1);
        }
        if depth > 16 {
            return Err(error());
        }
    }
    type_parser_with_references(language, enums.clone(), references.clone())
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
            '<' | '{' | '[' => depth += 1,
            '>' | '}' | ']' => depth = depth.saturating_sub(1),
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
/// Rejects unsupported versions, duplicate names, effects, captures, recursion and invalid contracts.
pub fn definitions(declarations: &[Attribute], language: u32) -> Result<Functions, Diagnostic> {
    definitions_with_enums(declarations, language, &BTreeMap::new())
}

/// Validate pure helper contracts and bodies using the versioned type grammar.
pub(crate) fn definitions_with_enums(
    declarations: &[Attribute],
    language: u32,
    enums: &BTreeMap<String, crate::value::EnumType>,
) -> Result<Functions, Diagnostic> {
    definitions_with_references(declarations, language, enums, &BTreeMap::new())
}
/// Check pure helper signatures and bodies using the resolved reference schemas.
pub(crate) fn definitions_with_references(
    declarations: &[Attribute],
    language: u32,
    enums: &BTreeMap<String, crate::value::EnumType>,
    references: &BTreeMap<String, crate::data::ReferenceType>,
) -> Result<Functions, Diagnostic> {
    let mut functions = Functions::new();
    for declaration in declarations.iter().filter(|a| a.name == "function") {
        let fail = || {
            Diagnostic::error("E003", "Expected fn name(arg: type) -> type => pure_expression; helpers must precede flow steps", declaration.span.clone())
        };
        if !matches!(language, 1..=3) || functions.len() >= 32 {
            return Err(fail());
        }
        let (signature, source) = declaration.raw.split_once("=>").ok_or_else(fail)?;
        let (name, tail) = signature.split_once('(').ok_or_else(fail)?;
        let name = name.trim();
        if !syntax::is_identifier(name) || is_builtin(name) || functions.contains_key(name) {
            return Err(fail());
        }
        let (args, output) = tail.split_once(')').ok_or_else(fail)?;
        let type_of = |source: &str| {
            if language < 3 && enums.is_empty() && references.is_empty() {
                parse_type(source, declaration.span.clone())
            } else {
                parse_type_with_references(
                    source,
                    declaration.span.clone(),
                    language,
                    enums,
                    references,
                )
            }
        };
        let output = type_of(output.trim().strip_prefix("->").ok_or_else(fail)?)?;
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
            parameters.push((key.to_string(), type_of(ty)?));
        }
        if parameters.len() > 8 {
            return Err(fail());
        }
        let offset = declaration.raw_offset + signature.len() + 2;
        let expression = parse_with_enums(source, offset, language, enums)?;
        let (body, ty) = check_inner_expected(
            expression,
            &functions,
            &parameters,
            &|path, span| {
                Err::<((), Type), _>(Diagnostic::error(
                    "E003",
                    format!("Pure helpers cannot capture '{}'", path.join(".")),
                    span,
                ))
            },
            Some(&output),
        )?;
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
        Kind::Coerce(_, _) | Kind::Absent => true,
        Kind::Binary(Binary::Coalesce, _, _) => true,
        Kind::Binary(_, a, b) => requires_v2(a) || requires_v2(b),
        _ => true,
    }
}

/// Count expanded syntax nodes, including helper bodies, before allowing execution.
pub(super) fn node_count<R>(expression: &Expr<R>) -> usize {
    1 + match &expression.kind {
        Kind::List(args, _) | Kind::Call(_, args) | Kind::MapPipe(_, args) => {
            args.iter().map(node_count).sum()
        }
        Kind::Record(fields) => fields.values().map(node_count).sum(),
        Kind::Unary(_, e) | Kind::Coerce(e, _) => node_count(e),
        Kind::Binary(_, a, b) => node_count(a) + node_count(b),
        Kind::Invoke(body, args) | Kind::Transform(_, body, args, _) => {
            node_count(body) + args.iter().map(node_count).sum::<usize>()
        }
        Kind::Lambda(_, body) => node_count(body),
        Kind::InlineTransform(_, body, args, captures, _) => {
            node_count(body) + args.iter().chain(captures).map(node_count).sum::<usize>()
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
        Kind::List(args, _) | Kind::Call(_, args) | Kind::MapPipe(_, args) => {
            args.iter().map(depth).max().unwrap_or(0)
        }
        Kind::Record(fields) => fields.values().map(depth).max().unwrap_or(0),
        Kind::Unary(_, e) | Kind::Coerce(e, _) => depth(e),
        Kind::Binary(_, a, b) => depth(a).max(depth(b)),
        Kind::Invoke(body, args) | Kind::Transform(_, body, args, _) => {
            depth(body).max(args.iter().map(depth).max().unwrap_or(0))
        }
        Kind::Lambda(_, body) => depth(body),
        Kind::InlineTransform(_, body, args, captures, _) => {
            depth(body).max(args.iter().chain(captures).map(depth).max().unwrap_or(0))
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

/// Keep historically reserved names; added built-ins allow older same-named helpers to win.
fn is_builtin(name: &str) -> bool {
    matches!(
        name,
        "lookup"
            | "records"
            | "count"
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
    args: Vec<Expr<Vec<String>>>,
    span: Span,
    functions: &Functions,
    parameters: &[(String, Type)],
    resolve: &dyn Fn(&[String], Span) -> Result<(R, Type), Diagnostic>,
) -> Result<(Expr<R>, Type), Diagnostic> {
    let fail = || {
        Diagnostic::error(
            "E003",
            if name == "shuffle" {
                "Use shuffle(items) as a whole binding, or shuffle(items, text_seed) in pure expressions".into()
            } else {
                format!("Invalid pure call '{name}': check its name, argument count and types")
            },
            span.clone(),
        )
    };
    if super::lambda::is_transform(&name, functions) {
        return super::lambda::check_transform(name, args, span, functions, parameters, resolve);
    }
    let helper = functions.get(&name);
    let checked = args
        .into_iter()
        .enumerate()
        .map(|(index, expression)| {
            check_inner_expected(
                expression,
                functions,
                parameters,
                resolve,
                helper.and_then(|helper| helper.parameters.get(index).map(|(_, ty)| ty)),
            )
        })
        .collect::<Result<Vec<_>, _>>()?;
    let types: Vec<_> = checked.iter().map(|(_, ty)| ty.clone()).collect();
    let args: Vec<_> = checked
        .into_iter()
        .map(|(expression, _)| expression)
        .collect();
    let (kind, ty) = if let Some(helper) = helper {
        let expected: Vec<_> = helper.parameters.iter().map(|(_, ty)| ty.clone()).collect();
        if types != expected {
            return Err(fail());
        }
        let body = lower(helper.body.clone(), &|()| {
            unreachable!("Pure helpers never contain ambient references")
        });
        (Kind::Invoke(Box::new(body), args), helper.output.clone())
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
    if !BUILTIN_FUNCTIONS.contains(&name) {
        return None;
    }
    match (name, types) {
        ("records", [Type::Catalog(schema)]) => Some(Type::List(schema.record_type.clone())),
        ("lookup", [Type::Catalog(schema), Type::Reference(reference)])
            if &schema.reference == reference =>
        {
            Some(*schema.record_type.clone())
        }
        ("lookup", [Type::Catalog(schema), Type::Text]) => {
            Some(Type::Optional(schema.record_type.clone()))
        }
        ("trim" | "lowercase" | "normalize_whitespace", [Type::Text]) => Some(Type::Text),
        ("clamp", [Type::Number, Type::Number, Type::Number]) => Some(Type::Number),
        ("count", [Type::List(_) | Type::Choices]) => Some(Type::Number),
        ("join", [Type::List(element), Type::Text]) if **element == Type::Text => Some(Type::Text),
        ("split", [Type::Text, Type::Text]) => Some(Type::List(Box::new(Type::Text))),
        ("contains" | "starts_with" | "ends_with", [Type::Text, Type::Text]) => Some(Type::Boolean),
        ("contains", [Type::List(element), item]) if element.as_ref() == item => {
            Some(Type::Boolean)
        }
        ("sum", [Type::List(element)]) if **element == Type::Number => Some(Type::Number),
        ("min" | "max", [Type::List(element)]) if **element == Type::Number => {
            Some(Type::Optional(element.clone()))
        }
        ("first" | "last", [Type::List(element)])
            if !matches!(element.as_ref(), Type::Optional(_)) =>
        {
            Some(Type::Optional(element.clone()))
        }
        ("distinct", [ty @ Type::List(_)]) => Some(ty.clone()),
        ("concat", [a, b]) if a == b && matches!(a, Type::Text | Type::List(_)) => Some(a.clone()),
        ("shuffle", [ty @ (Type::List(_) | Type::Choices), Type::Text]) => Some(ty.clone()),
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
            Value::Catalog { records, .. } => records.iter().try_for_each(|v| self.value(v)),
            Value::Reference { id, .. } => self.text(id),
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
            Value::Optional { value, .. } => value.as_ref().map_or(Ok(()), |v| self.value(v)),
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

/// Normalize only equality-insignificant labels and signed zero, preserving structural types.
fn canonicalize_equality(value: &mut Value, fuel: &mut Budget) -> Result<(), String> {
    fuel.work(1)?;
    match value {
        Value::Number(number) if *number == 0. => *number = 0.,
        Value::Choice(choice) => choice.label.clear(),
        Value::Choices(choices) => {
            fuel.work(choices.len())?;
            for choice in choices {
                choice.label.clear();
            }
        }
        Value::List { items, .. } => {
            for item in items {
                canonicalize_equality(item, fuel)?;
            }
        }
        Value::Record(fields) => {
            for item in fields.values_mut() {
                canonicalize_equality(item, fuel)?;
            }
        }
        Value::Optional {
            value: Some(item), ..
        } => canonicalize_equality(item, fuel)?,
        _ => {}
    }
    Ok(())
}

/// Build a bounded, ordered key matching language equality, including nested choice identities.
fn equality_key(value: &Value, fuel: &mut Budget) -> Result<Vec<u8>, String> {
    let mut canonical = value.clone();
    canonicalize_equality(&mut canonical, fuel)?;
    fuel.value(&canonical)?;
    let key = serde_json::to_vec(&canonical).map_err(|error| error.to_string())?;
    fuel.bytes = fuel
        .bytes
        .checked_sub(key.len())
        .ok_or("Pure evaluation exceeded its value budget")?;
    Ok(key)
}

/// Run a checked built-in deterministically with bounded collection expansion.
pub(super) fn builtin(name: &str, args: Vec<Value>, fuel: &mut Budget) -> Result<Value, String> {
    if name == "shuffle" {
        if let [value, Value::Text(seed)] = args.as_slice() {
            let count = match value {
                Value::List { items, .. } => items.len(),
                Value::Choices(items) => items.len(),
                _ => return Err("shuffle expects a list or choices catalogue".into()),
            };
            fuel.work(count)?;
            return crate::shuffle::apply(value.clone(), seed.as_bytes());
        }
    }
    match (name, args.as_slice()) {
        ("join", [Value::List { items, .. }, Value::Text(separator)]) => {
            fuel.work(items.len())?;
            let mut size = separator
                .len()
                .checked_mul(items.len().saturating_sub(1))
                .ok_or("Joined text exceeds 1 MiB")?;
            let mut parts = Vec::with_capacity(items.len());
            for item in items {
                let Value::Text(text) = item else {
                    return Err("join expects text elements".into());
                };
                size = size
                    .checked_add(text.len())
                    .ok_or("Joined text exceeds 1 MiB")?;
                if size > 1_048_576 {
                    return Err("Joined text exceeds 1 MiB".into());
                }
                parts.push(text.as_str());
            }
            Ok(Value::Text(parts.join(separator)))
        }
        ("split", [Value::Text(text), Value::Text(separator)]) => {
            if separator.is_empty() {
                return Err("split requires a nonempty separator".into());
            }
            let mut items = vec![];
            for part in text.split(separator) {
                fuel.work(1)?;
                if items.len() == 10_000 {
                    return Err("Split exceeds 10000 items".into());
                }
                items.push(Value::Text(part.into()));
            }
            Ok(Value::List {
                element_type: Type::Text,
                items,
            })
        }
        ("contains" | "starts_with" | "ends_with", [Value::Text(text), Value::Text(part)]) => {
            fuel.work(text.len().saturating_div(64) + 1)?;
            Ok(Value::Boolean(match name {
                "contains" => text.contains(part),
                "starts_with" => text.starts_with(part),
                _ => text.ends_with(part),
            }))
        }
        ("contains", [Value::List { items, .. }, item]) => {
            let key = equality_key(item, fuel)?;
            for candidate in items {
                if equality_key(candidate, fuel)? == key {
                    return Ok(Value::Boolean(true));
                }
            }
            Ok(Value::Boolean(false))
        }
        ("sum" | "min" | "max", [Value::List { items, .. }]) => {
            fuel.work(items.len())?;
            let mut result: Option<f64> = None;
            for item in items {
                let Value::Number(number) = item else {
                    return Err("Expected numeric elements".into());
                };
                let next = match (name, result) {
                    ("sum", total) => total.unwrap_or(0.) + number,
                    ("min", Some(current)) => current.min(*number),
                    ("max", Some(current)) => current.max(*number),
                    _ => *number,
                };
                if !next.is_finite() {
                    return Err("Arithmetic produced a non-finite value".into());
                }
                result = Some(next);
            }
            if name == "sum" {
                Ok(Value::Number(result.unwrap_or(0.)))
            } else {
                Ok(Value::Optional {
                    element_type: Type::Number,
                    value: result.map(|n| Box::new(Value::Number(n))),
                })
            }
        }
        (
            "first" | "last",
            [Value::List {
                element_type,
                items,
            }],
        ) => Ok(Value::Optional {
            element_type: element_type.clone(),
            value: (if name == "first" {
                items.first()
            } else {
                items.last()
            })
            .cloned()
            .map(Box::new),
        }),
        (
            "distinct",
            [Value::List {
                element_type,
                items,
            }],
        ) => {
            let mut seen = std::collections::BTreeSet::new();
            let mut output = vec![];
            for item in items {
                if seen.insert(equality_key(item, fuel)?) {
                    output.push(item.clone());
                }
            }
            Ok(Value::List {
                element_type: element_type.clone(),
                items: output,
            })
        }
        ("records", [Value::Catalog { schema, records }]) => Ok(Value::List {
            element_type: *schema.record_type.clone(),
            items: records.clone(),
        }),
        (
            "lookup",
            [Value::Catalog { schema, records }, Value::Reference {
                schema: reference,
                id,
            }],
        ) if &schema.reference == reference => schema
            .reference
            .ids
            .iter()
            .position(|key| key == id)
            .and_then(|i| records.get(i))
            .cloned()
            .ok_or_else(|| "Unknown reference id".into()),
        ("lookup", [Value::Catalog { schema, records }, Value::Text(id)]) => Ok(Value::Optional {
            element_type: *schema.record_type.clone(),
            value: schema
                .reference
                .ids
                .iter()
                .position(|key| key == id)
                .and_then(|i| records.get(i))
                .cloned()
                .map(Box::new),
        }),
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
    captures: &[Expr<R>],
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
    let captured = captures
        .iter()
        .map(|expression| eval_inner(expression, resolve, parameters, fuel))
        .collect::<Result<Vec<_>, _>>()?;
    let invoke = |arguments: &[Value], fuel: &mut Budget| {
        if captured.is_empty() {
            return eval_inner(body, resolve, arguments, fuel);
        }
        // Charge copied environments even when a short-circuit skips the captured reference.
        for value in arguments.iter().chain(&captured) {
            fuel.value(value)?;
        }
        let parameters: Vec<_> = arguments.iter().chain(&captured).cloned().collect();
        eval_inner(body, resolve, &parameters, fuel)
    };
    if matches!(name, "find" | "any" | "all") {
        for item in items {
            let result = invoke(std::slice::from_ref(item), fuel)?;
            if name == "find" && result == Value::Boolean(true) {
                let Type::Optional(element_type) = ty else {
                    return Err("Invalid find output".into());
                };
                return Ok(Value::Optional {
                    element_type: *element_type.clone(),
                    value: Some(Box::new(item.clone())),
                });
            }
            if name == "any" && result == Value::Boolean(true) {
                return Ok(result);
            }
            if name == "all" && result == Value::Boolean(false) {
                return Ok(result);
            }
        }
        return if name == "find" {
            let Type::Optional(element_type) = ty else {
                return Err("Invalid find output".into());
            };
            Ok(Value::Optional {
                element_type: *element_type.clone(),
                value: None,
            })
        } else {
            Ok(Value::Boolean(name == "all"))
        };
    }
    if name == "reduce" {
        let Type::Optional(element_type) = ty else {
            return Err("Invalid reduce output".into());
        };
        let value = match items.split_first() {
            None => None,
            Some((first, rest)) => Some(Box::new(
                rest.iter().try_fold(first.clone(), |acc, item| {
                    invoke(&[acc, item.clone()], fuel)
                })?,
            )),
        };
        return Ok(Value::Optional {
            element_type: *element_type.clone(),
            value,
        });
    }
    if name == "fold" {
        return items.iter().try_fold(
            values.get(1).ok_or("Missing fold seed")?.clone(),
            |acc, item| invoke(&[acc, item.clone()], fuel),
        );
    }
    let mut output = vec![];
    for item in items {
        let result = invoke(std::slice::from_ref(item), fuel)?;
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
