//! Participant-reviewed text refinement lowered to ordinary body instructions.
use super::*;

#[derive(Clone, Debug)]
pub(super) struct CheckedRefinement {
    pub binding: String,
    pub alias: String,
    pub initial: CheckedExpr,
    pub config: crate::refine::Config,
    pub steps: Vec<(CheckedStep, Span)>,
    pub locals: Scope,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub(crate) struct Refinement {
    pub binding: BindingId,
    pub alias: BindingId,
    pub initial: CompiledExpr,
    pub config: crate::refine::Config,
    pub nodes: Vec<Node>,
    pub locals: Vec<BindingId>,
}

/// Describe a kept or unfinished candidate without claiming that its proposition is true.
fn result_type() -> Type {
    Type::Record(BTreeMap::from([
        ("value".into(), Type::Text),
        ("outcome".into(), Type::Choice),
        ("rounds".into(), Type::Number),
    ]))
}

/// Check a fresh immutable revision scope and require one final text proposal.
pub(super) fn check(
    b: Block,
    outer: &mut Scope,
    reserved: &BTreeSet<String>,
    dependencies: &BTreeMap<String, Dependency>,
) -> Check<CheckedStep> {
    let attrs = attributes(&b, &["initial", "as", "rounds", "renewable", "next"])?;
    let binding = required_binding(&b)?;
    let required = |key| {
        attrs
            .get(key)
            .copied()
            .ok_or_else(|| err(format!("Refinement requires :{key}"), b.span.clone()))
    };
    let initial_attr = required("initial")?;
    let (initial, ty) = check_expression(&initial_attr.raw, initial_attr.raw_offset, outer)?;
    if ty != Type::Text {
        return Err(err(
            "Refinement requires a text initial candidate",
            initial.span,
        ));
    }
    let rounds_attr = required("rounds")?;
    let rounds = collection_limit(&rounds_attr)?;
    if rounds == 0 {
        return Err(err(
            "Refinement rounds must be positive",
            rounds_attr.span.clone(),
        ));
    }
    let renewable = match attrs.get("renewable") {
        None => false,
        Some(attr) => match arity(attr, 1)?[0].text.as_str() {
            "true" => true,
            "false" => false,
            _ => return Err(err("Expected true or false", attr.span.clone())),
        },
    };
    let alias_word = &arity(required("as")?, 1)?[0];
    let alias = name(alias_word)?;
    if reserved.contains(&alias) || alias == binding {
        return Err(err(
            "Refinement alias cannot shadow an enclosing binding or its result",
            alias_word.span.clone(),
        ));
    }
    let mut scope = outer.clone();
    declare(
        &mut scope,
        alias.clone(),
        Type::Text,
        alias_word.span.clone(),
    )?;
    let steps = check_body(
        &b,
        attrs.get("next").copied(),
        &mut scope,
        outer,
        reserved,
        &binding,
        dependencies,
    )?;
    let locals = scope
        .into_iter()
        .filter(|(key, _)| !outer.contains_key(key))
        .collect();
    declare(
        outer,
        binding.clone(),
        result_type(),
        b.binding.unwrap().span,
    )?;
    Ok(CheckedStep::Refine(Box::new(CheckedRefinement {
        binding,
        alias,
        initial,
        config: crate::refine::Config {
            rounds: rounds as u32,
            renewable,
        },
        steps,
        locals,
    })))
}

/// Validate the straight-line revision body, keeping its locals separate from the result.
fn check_body(
    b: &Block,
    legacy_next: Option<&Attribute>,
    scope: &mut Scope,
    outer: &Scope,
    reserved: &BTreeSet<String>,
    binding: &str,
    dependencies: &BTreeMap<String, Dependency>,
) -> Check<Vec<(CheckedStep, Span)>> {
    let count = b.statements.len();
    let mut steps = vec![];
    for (index, statement) in b.statements.iter().cloned().enumerate() {
        let span = statement.span();
        let step = match statement {
            Statement::Propose { expression, expression_offset, .. } if index + 1 == count && legacy_next.is_none() => {
                let (expression, ty) = check_expression(&expression, expression_offset, scope)?;
                if ty != Type::Text { return Err(err("Proposed candidate must be text", span)); }
                CheckedStep::Propose(expression)
            }
            Statement::Block(child) if !child.kind.starts_with('?') && !matches!(child.kind.as_str(), "collect" | "refine") => check_block(child, scope, dependencies)?,
            Statement::Derive { binding, expression, expression_offset, .. } => {
                let key = name(&binding)?;
                let (expression, ty) = check_expression(&expression, expression_offset, scope)?;
                declare(scope, key.clone(), ty, binding.span)?;
                CheckedStep::Derive { binding: key, expression }
            }
            _ => return Err(err("Refinement bodies are straight-line and end with -> propose text; use a child Pattern for nested control flow", span)),
        };
        if scope
            .keys()
            .any(|key| !outer.contains_key(key) && (reserved.contains(key) || key == binding))
        {
            return Err(err(
                "Refinement locals cannot shadow enclosing or result bindings",
                span,
            ));
        }
        steps.push((step, span));
    }
    if let Some(next) = legacy_next {
        let (expression, ty) = check_expression(&next.raw, next.raw_offset, scope)?;
        if ty != Type::Text {
            return Err(err("Proposed candidate must be text", next.span.clone()));
        }
        steps.push((CheckedStep::Propose(expression), next.span.clone()));
    }
    if !matches!(steps.last(), Some((CheckedStep::Propose(_), _))) {
        return Err(err(
            "Refinement body must end with -> propose text",
            b.span.clone(),
        ));
    }
    Ok(steps)
}

/// Allocate body-local slots and preserve the public result in the enclosing scope.
pub(super) fn lower(
    body: CheckedRefinement,
    symbols: &Scope,
    next_binding: &mut usize,
    next_node: &mut usize,
) -> Instruction {
    let initial = expression::lower(body.initial, &|(name, field): (String, Option<Field>)| {
        (symbols[&name].id, field)
    });
    let mut scope = symbols.clone();
    let mut locals = vec![];
    for (name, mut symbol) in body.locals {
        symbol.id = BindingId(*next_binding);
        *next_binding += 1;
        locals.push(symbol.id);
        scope.insert(name, symbol);
    }
    let nodes = body
        .steps
        .into_iter()
        .map(|(step, span)| {
            let id = NodeId(*next_node);
            *next_node += 1;
            Node {
                id,
                span,
                instruction: lower_step(step, &scope, next_binding, next_node),
            }
        })
        .collect();
    Instruction::Refine(Box::new(Refinement {
        binding: symbols[&body.binding].id,
        alias: scope[&body.alias].id,
        initial,
        config: body.config,
        nodes,
        locals,
    }))
}
