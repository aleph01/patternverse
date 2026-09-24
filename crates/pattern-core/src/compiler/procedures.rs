//! Local effectful procedures reuse the isolated child-run contract and retain source spans.
use super::*;

/// Compile every local flow in dependency order, rejecting recursion and excessive declarations.
pub(super) fn compile(
    parsed: &ParsedPattern,
    dependencies: &mut BTreeMap<String, Dependency>,
) -> Check<BTreeMap<String, CompiledPattern>> {
    if parsed.flows.len() > 32 {
        return Err(err("At most 32 local flows may be declared", 0..0));
    }
    let mut sources = BTreeMap::new();
    for flow in &parsed.flows {
        let name = &flow.argument.as_ref().unwrap().0;
        if sources.insert(name.clone(), source(parsed, flow)).is_some() {
            return Err(err(format!("Duplicate flow '{name}'"), flow.span.clone()));
        }
    }
    let mut compiled = BTreeMap::new();
    for name in sources.keys() {
        visit(
            name,
            &sources,
            dependencies,
            &mut compiled,
            &mut BTreeSet::new(),
        )?;
    }
    Ok(compiled)
}

/// Preserve byte positions while exposing only shared declarations and this flow's body.
fn source(parsed: &ParsedPattern, flow: &Block) -> String {
    let original = parsed.source.as_bytes();
    let mut bytes: Vec<u8> = original
        .iter()
        .map(|b| if matches!(b, b'\n' | b'\r') { *b } else { b' ' })
        .collect();
    let shared = parsed
        .declarations
        .iter()
        .filter(|a| matches!(a.name.as_str(), "language" | "function" | "enum" | "import"))
        .map(|a| a.span.clone())
        .chain(parsed.classifiers.iter().map(|b| b.span.clone()));
    let start = flow.span.start + parsed.source[flow.span.clone()].find('{').unwrap() + 1;
    for span in shared.chain(std::iter::once(start..flow.span.end - 1)) {
        bytes[span.clone()].copy_from_slice(&original[span]);
    }
    String::from_utf8(bytes).expect("Copied complete UTF-8 spans")
}

/// Resolve sibling calls before compiling a flow; locals never capture the caller's bindings.
fn visit(
    name: &str,
    sources: &BTreeMap<String, String>,
    dependencies: &mut BTreeMap<String, Dependency>,
    compiled: &mut BTreeMap<String, CompiledPattern>,
    stack: &mut BTreeSet<String>,
) -> Check<()> {
    if compiled.contains_key(name) {
        return Ok(());
    }
    if !stack.insert(name.into()) {
        return Err(err(format!("Recursive flow '{name}'"), 0..0));
    }
    let parsed = syntax::parse(&sources[name]).map_err(|e| e[0].clone())?;
    let mut calls = BTreeMap::new();
    crate::snapshot::dependencies(&parsed.statements, &mut calls);
    for child in calls.keys().filter(|child| sources.contains_key(*child)) {
        visit(child, sources, dependencies, compiled, stack)?;
    }
    // Only referenced interfaces are retained, avoiding dependency cycles through unrelated flows.
    for import in syntax::imports(&parsed.declarations)? {
        calls.insert(import.alias, import.span);
    }
    let interfaces = dependencies
        .iter()
        .filter(|(name, _)| calls.contains_key(*name))
        .map(|(name, value)| (name.clone(), value.clone()))
        .collect();
    let pattern =
        compile_with_dependencies(&sources[name], interfaces).map_err(|e| e[0].clone())?;
    dependencies.insert(name.into(), pattern.interface());
    compiled.insert(name.into(), pattern);
    stack.remove(name);
    Ok(())
}

/// Validate the sole active-pattern event hook and its narrow, explicit data contract.
pub(super) fn handler(
    parsed: &ParsedPattern,
    flows: &BTreeMap<String, CompiledPattern>,
) -> Check<Option<String>> {
    if parsed.events.is_empty() {
        return Ok(None);
    }
    if parsed.events.len() != 1 {
        return Err(err(
            "Declare only one events block",
            parsed.events[1].span.clone(),
        ));
    }
    let block = &parsed.events[0];
    let lines: Vec<_> = block
        .body
        .iter()
        .filter(|l| !l.text.trim().is_empty())
        .collect();
    if !block.attributes.is_empty() || lines.len() != 1 {
        return Err(err(
            "Expected on user.message -> flow_name",
            block.span.clone(),
        ));
    }
    let name = lines[0]
        .text
        .trim()
        .strip_prefix("on user.message -> ")
        .map(str::trim)
        .filter(|s| syntax::is_identifier(s))
        .ok_or_else(|| {
            err(
                "Only on user.message -> flow_name is supported; cancellation stays in the UI",
                lines[0].span.clone(),
            )
        })?;
    let flow = flows.get(name).ok_or_else(|| {
        err(
            "The message handler must name a local flow",
            lines[0].span.clone(),
        )
    })?;
    let valid_output = flow.output_types.len() == 1
        && match flow.output_types.get("disposition") {
            Some(Type::Text) => true,
            Some(Type::Enum(schema)) => {
                schema
                    .variants
                    .iter()
                    .map(String::as_str)
                    .collect::<BTreeSet<_>>()
                    == BTreeSet::from(["pass", "handled"])
            }
            _ => false,
        };
    if flow.input_types()
        != BTreeMap::from([
            ("message".into(), Type::Text),
            ("prompt".into(), Type::Text),
        ])
        || !valid_output
    {
        return Err(err("A message handler requires :input message text, :input prompt text, and only :output disposition (pass | handled enum, or checked text)", block.span.clone()));
    }
    Ok(Some(name.into()))
}
