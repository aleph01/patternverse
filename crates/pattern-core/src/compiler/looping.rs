//! Functional iteration scopes; no mutation of enclosing bindings or hidden counters in source.
use super::*;

#[derive(Clone, Debug)]
pub(super) struct CheckedLoop {
    pub binding: String,
    pub initial: CheckedExpr,
    pub max: Option<usize>,
    pub steps: Vec<(CheckedStep, Span)>,
    pub locals: Scope,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub(crate) struct Loop {
    pub binding: BindingId,
    pub initial: CompiledExpr,
    pub max: Option<usize>,
    pub nodes: Vec<Node>,
    pub locals: Vec<BindingId>,
}

/// Validate a straight-line iteration with immutable locals and an optional final repeat/break.
pub(super) fn check(
    b: Block,
    outer: &Scope,
    reserved: &BTreeSet<String>,
    dependencies: &BTreeMap<String, Dependency>,
) -> Check<CheckedStep> {
    let attrs = attributes(&b, &["max"])?;
    let max = attrs.get("max").map(collection_limit).transpose()?;
    let binding = required_binding(&b)?;
    if reserved.contains(&binding) {
        return Err(err("Loop state cannot shadow an enclosing binding", b.span));
    }
    let (source, span) = b
        .argument
        .as_ref()
        .ok_or_else(|| err("Loop requires an initial value", b.span.clone()))?;
    let (initial, state_type) = check_expression(source, span.start, outer)?;
    let mut scope = outer.clone();
    declare(
        &mut scope,
        binding.clone(),
        state_type.clone(),
        b.binding.as_ref().unwrap().span.clone(),
    )?;
    let count = b.statements.len();
    let mut steps = vec![];
    let mut yields_to_user = false;
    for (index, statement) in b.statements.into_iter().enumerate() {
        let span = statement.span();
        let step = match statement {
            Statement::Block(child) if !child.kind.starts_with('?') && !matches!(child.kind.as_str(), "collect" | "use") => check_block(child, &mut scope, dependencies)?,
            Statement::Derive { binding, expression, expression_offset, .. } => {
                let key = name(&binding)?;
                let (expression, ty) = check_expression(&expression, expression_offset, &scope)?;
                declare(&mut scope, key.clone(), ty, binding.span)?;
                CheckedStep::Derive { binding: key, expression }
            }
            Statement::Repeat { expression, expression_offset, .. } if index + 1 == count => {
                if !yields_to_user { return Err(err("Each repeated iteration must wait for a user interaction", span)); }
                let (expression, ty) = check_expression(&expression, expression_offset, &scope)?;
                if ty != state_type { return Err(err("Repeated state must have the initial value's type", span)); }
                CheckedStep::Repeat(expression)
            }
            Statement::Jump { target, .. } if target.text == "break" && index + 1 == count => CheckedStep::Break,
            _ => return Err(err("Loop bodies are straight-line; repeat/break must be last. Nested loops, collections, calls and branch jumps are not yet supported", span)),
        };
        yields_to_user |= matches!(
            step,
            CheckedStep::Ask { .. }
                | CheckedStep::Form { .. }
                | CheckedStep::Timer { .. }
                | CheckedStep::Rate { .. }
                | CheckedStep::Choose { .. }
                | CheckedStep::Select { .. }
        );
        if let Some((_, symbol)) = scope
            .iter()
            .find(|(name, _)| !outer.contains_key(*name) && reserved.contains(*name))
        {
            return Err(err(
                "Loop locals cannot shadow enclosing bindings",
                symbol.span.clone(),
            ));
        }
        steps.push((step, span));
    }
    let locals = scope
        .into_iter()
        .filter(|(name, _)| !outer.contains_key(name))
        .collect();
    Ok(CheckedStep::Loop(Box::new(CheckedLoop {
        binding,
        initial,
        max,
        steps,
        locals,
    })))
}

/// Allocate fresh slots for loop-local bindings while leaving the enclosing symbol table intact.
pub(super) fn lower(
    body: CheckedLoop,
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
    Instruction::Loop(Box::new(Loop {
        binding: scope[&body.binding].id,
        initial,
        max: body.max,
        nodes,
        locals,
    }))
}
