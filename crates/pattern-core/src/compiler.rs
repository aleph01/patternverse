//! Parsing, semantic validation, and lowering are separate API boundaries.
use crate::{
    expression::{self, Expr, Kind, Unary},
    syntax::{
        self, Attribute, Block, Diagnostic, ParsedPattern, Severity, Span, Statement, TemplatePart,
        Word,
    },
    value::{valid_choices, Choice, Contract, Type, Value},
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

pub mod inspection;
mod procedures;
mod scope;
mod semantic;
use scope::Scope;
mod looping;
mod refinement;
use refinement::CheckedRefinement;
pub(crate) use refinement::Refinement;
mod selection;
use looping::CheckedLoop;
pub(crate) use looping::Loop;
pub use selection::{Selection, SelectionMode};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct BindingId(pub usize);
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct NodeId(pub usize);

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub(crate) struct Field(pub Vec<String>);
type CheckedExpr = Expr<(String, Option<Field>)>;
pub(crate) type CompiledExpr = Expr<(BindingId, Option<Field>)>;
#[derive(Clone, Debug)]
enum CheckedPart {
    Realize {
        specification: String,
        inputs: Vec<(String, String, Option<Field>)>,
    },
    Literal(String),
    Reference(String, Option<Field>),
}
#[derive(Clone, Debug)]
enum CheckedOptions {
    Static(Vec<Choice>),
    Dynamic(CheckedExpr),
}
#[derive(Clone, Debug)]
enum CheckedCollectionMode {
    Open { min: usize, max: usize },
    Mapped { source: CheckedExpr, alias: String },
}
#[derive(Clone, Debug)]
struct CheckedCollection {
    element_type: Type,
    binding: String,
    mode: CheckedCollectionMode,
    steps: Vec<(CheckedStep, Span)>,
    locals: Scope,
    fields: BTreeMap<String, Type>,
}
#[derive(Clone, Debug)]
enum CheckedStep {
    Realize {
        binding: String,
        prompt: Vec<CheckedPart>,
    },
    Classify {
        binding: String,
        input: CheckedExpr,
        definition: crate::semantic::Classifier,
        context: Vec<(String, CheckedExpr)>,
    },
    Suggest {
        binding: String,
        input: CheckedExpr,
        mode: crate::semantic::SuggestionMode,
        element: Type,
        criteria: Vec<CheckedPart>,
    },
    Yield(CheckedExpr),
    Refine(Box<CheckedRefinement>),
    Propose(CheckedExpr),
    Loop(Box<CheckedLoop>),
    Repeat(CheckedExpr),
    Break,
    Use {
        name: String,
        binding: String,
        dependency: String,
        inputs: Vec<(String, CheckedExpr)>,
        outputs: BTreeMap<String, Type>,
    },
    Collect(Box<CheckedCollection>),
    Ask {
        binding: String,
        prompt: Vec<CheckedPart>,
    },
    Rate {
        binding: String,
        rating: Rating,
        prompt: Vec<CheckedPart>,
    },
    Derive {
        binding: String,
        expression: CheckedExpr,
    },
    Branch {
        arms: Vec<(CheckedExpr, NodeId)>,
        otherwise: NodeId,
    },
    Match {
        subject: CheckedExpr,
        cases: Vec<(Case, NodeId)>,
        otherwise: NodeId,
        has_fallback: bool,
    },
    Jump(NodeId),
    End,
    Generate {
        binding: String,
        contract: Contract,
        prompt: Vec<CheckedPart>,
    },
    Turn {
        binding: Option<String>,
        prompt: Vec<CheckedPart>,
    },
    Choose {
        binding: String,
        options: CheckedOptions,
        prompt: Vec<CheckedPart>,
    },
    Select {
        binding: String,
        options: CheckedOptions,
        selection: Selection,
        prompt: Vec<CheckedPart>,
    },
    Show {
        body: Vec<CheckedPart>,
    },
}
#[derive(Clone, Debug)]
struct Symbol {
    value_type: Type,
    span: Span,
    id: BindingId,
}

/// Can only be obtained through validation, not assembled with unchecked fields.
#[derive(Clone, Debug)]
pub struct ValidatedPattern {
    flows: BTreeMap<String, CompiledPattern>,
    message_handler: Option<String>,
    dependencies: BTreeMap<String, Dependency>,
    source: String,
    title: Option<String>,
    symbols: Scope,
    inputs: Vec<String>,
    outputs: Vec<String>,
    steps: Vec<(CheckedStep, Span)>,
    diagnostics: Vec<Diagnostic>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub(crate) enum Part {
    Realize {
        specification: String,
        inputs: Vec<(String, BindingId, Option<Field>)>,
    },
    Literal(String),
    Reference(BindingId, Option<Field>),
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub(crate) enum Options {
    Static(Vec<Choice>),
    Dynamic(CompiledExpr),
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub(crate) enum CollectionMode {
    Open {
        min: usize,
        max: usize,
    },
    Mapped {
        source: CompiledExpr,
        alias: BindingId,
    },
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub(crate) struct Collection {
    pub binding: BindingId,
    pub mode: CollectionMode,
    pub nodes: Vec<Node>,
    pub locals: Vec<BindingId>,
    pub fields: Vec<(String, BindingId)>,
    pub record_type: Type,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Rating {
    pub min: f64,
    pub max: f64,
    pub prefer: Option<String>,
    pub low: Option<String>,
    pub high: Option<String>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub(crate) enum Case {
    Enum(String),
    Text(String),
    Number(f64),
    Boolean(bool),
    Choice(String),
}
impl Case {
    /// Match a typed scalar case; choices compare their stable value, not their label.
    pub(crate) fn matches(&self, value: &Value) -> bool {
        match (self, value) {
            (Self::Enum(a), Value::Enum { variant, .. }) => a == variant,
            (Self::Text(a), Value::Text(b)) => a == b,
            (Self::Number(a), Value::Number(b)) => a == b,
            (Self::Boolean(a), Value::Boolean(b)) => a == b,
            (Self::Choice(a), Value::Choice(b)) => a == &b.value,
            _ => false,
        }
    }
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub(crate) enum Instruction {
    Realize {
        binding: BindingId,
        prompt: Vec<Part>,
    },
    Classify {
        binding: BindingId,
        input: CompiledExpr,
        definition: crate::semantic::Classifier,
        context: Vec<(String, CompiledExpr)>,
    },
    Suggest {
        binding: BindingId,
        input: CompiledExpr,
        mode: crate::semantic::SuggestionMode,
        element: Type,
        criteria: Vec<Part>,
    },
    Yield(CompiledExpr),
    Refine(Box<Refinement>),
    Propose(CompiledExpr),
    Loop(Box<Loop>),
    Repeat(CompiledExpr),
    Break,
    Use {
        binding: BindingId,
        dependency: String,
        inputs: Vec<(String, CompiledExpr)>,
        outputs: BTreeMap<String, Type>,
    },
    Collect(Box<Collection>),
    Ask {
        binding: BindingId,
        prompt: Vec<Part>,
    },
    Rate {
        binding: BindingId,
        rating: Rating,
        prompt: Vec<Part>,
    },
    Derive {
        binding: BindingId,
        expression: CompiledExpr,
    },
    Branch {
        arms: Vec<(CompiledExpr, NodeId)>,
        otherwise: NodeId,
    },
    Match {
        subject: CompiledExpr,
        cases: Vec<(Case, NodeId)>,
        otherwise: NodeId,
    },
    Jump(NodeId),
    Generate {
        binding: BindingId,
        contract: Contract,
        prompt: Vec<Part>,
    },
    Turn {
        binding: Option<BindingId>,
        prompt: Vec<Part>,
    },
    Choose {
        binding: BindingId,
        options: Options,
        prompt: Vec<Part>,
    },
    Select {
        binding: BindingId,
        options: Options,
        selection: Selection,
        prompt: Vec<Part>,
    },
    Show {
        body: Vec<Part>,
    },
    End,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub(crate) struct Node {
    pub id: NodeId,
    pub span: Span,
    pub instruction: Instruction,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub(crate) struct Input {
    pub name: String,
    pub id: BindingId,
    pub value_type: Type,
}

/// Exact source is retained; executable identity includes the compiler schema version.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct CompiledPattern {
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub(crate) flows: BTreeMap<String, CompiledPattern>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) message_handler: Option<String>,
    pub(crate) dependencies: BTreeMap<String, Dependency>,
    pub(crate) output_types: BTreeMap<String, Type>,
    pub(crate) source: String,
    pub(crate) snapshot_id: String,
    pub(crate) title: Option<String>,
    pub(crate) inputs: Vec<Input>,
    pub(crate) outputs: Vec<(String, BindingId)>,
    pub(crate) nodes: Vec<Node>,
    pub(crate) binding_count: usize,
    pub(crate) diagnostics: Vec<Diagnostic>,
}
/// Compiler-only interface, resolved from an exact compiled child by snapshot construction.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub(crate) struct Dependency {
    pub id: String,
    pub inputs: BTreeMap<String, Type>,
    pub outputs: BTreeMap<String, Type>,
}
impl CompiledPattern {
    /// Project declared input names and types for a Host's explicit input form.
    pub fn input_types(&self) -> BTreeMap<String, Type> {
        self.inputs
            .iter()
            .map(|input| (input.name.clone(), input.value_type.clone()))
            .collect()
    }
    /// Project the pinned revision and declared input/output types used by parent compilation.
    pub(crate) fn interface(&self) -> Dependency {
        Dependency {
            id: self.snapshot_id.clone(),
            inputs: self
                .inputs
                .iter()
                .map(|i| (i.name.clone(), i.value_type.clone()))
                .collect(),
            outputs: self.output_types.clone(),
        }
    }
    /// Recompile exact source and pinned interfaces, rejecting any serialized IR mismatch.
    pub(crate) fn verify(&self) -> Result<(), Vec<Diagnostic>> {
        let rebuilt = compile_with_dependencies(&self.source, self.dependencies.clone())?;
        if &rebuilt == self {
            Ok(())
        } else {
            Err(vec![err("Compiled source mismatch", 0..0)])
        }
    }
    /// Borrow the content-derived identity of this source and its dependency interfaces.
    pub fn snapshot_id(&self) -> &str {
        &self.snapshot_id
    }
    /// Borrow the optional authored title without supplying a UI fallback.
    pub fn title(&self) -> Option<&str> {
        self.title.as_deref()
    }
    /// Return the number of top-level nodes, including the synthetic terminal node.
    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }
    /// Borrow the exact source text retained for deterministic restore and diagnostics.
    pub fn source(&self) -> &str {
        &self.source
    }
    /// Borrow nonfatal diagnostics retained from successful validation.
    pub fn diagnostics(&self) -> &[Diagnostic] {
        &self.diagnostics
    }
}

/// Parse, validate, and lower a standalone Pattern source.
///
/// ```
/// let source = ":language 1\n:output answer\n!ask answer\n  What matters today?\n-> end\n";
/// let pattern = pattern_core::compiler::compile(source).expect("valid standalone pattern");
/// assert_eq!(pattern.source(), source);
/// ```
///
/// # Errors
/// Returns syntax or semantic diagnostics; child calls require snapshot compilation.
pub fn compile(source: &str) -> Result<CompiledPattern, Vec<Diagnostic>> {
    syntax::parse(source).and_then(validate).map(lower)
}

/// Validate a parsed standalone pattern with no resolved child dependencies.
///
/// # Errors
/// Returns semantic diagnostics for unsupported constructs, invalid types, or unsafe control flow.
pub fn validate(parsed: ParsedPattern) -> Result<ValidatedPattern, Vec<Diagnostic>> {
    check(parsed, BTreeMap::new()).map_err(|e| vec![e])
}

/// Lower validated statements to executable IR and derive the pinned revision identity.
/// Accepts only the compiler's opaque validated representation; performs no Host I/O.
pub fn lower(checked: ValidatedPattern) -> CompiledPattern {
    let mut binding_count = checked.symbols.len();
    let mut next_node = checked.steps.len();
    let nodes = checked
        .steps
        .into_iter()
        .enumerate()
        .map(|(i, (step, span))| Node {
            id: NodeId(i),
            span,
            instruction: lower_step(step, &checked.symbols, &mut binding_count, &mut next_node),
        })
        .collect();
    let id = |n: &str| checked.symbols[n].id;
    let snapshot_id = format!(
        "m4-v1:{:x}",
        Sha256::digest(
            serde_json::to_vec(&("pattern-core-m4-v1", &checked.source, &checked.dependencies))
                .expect("source and interfaces serialize")
        )
    );
    CompiledPattern {
        flows: checked.flows,
        message_handler: checked.message_handler,
        output_types: checked
            .outputs
            .iter()
            .map(|n| (n.clone(), checked.symbols[n].value_type.clone()))
            .collect(),
        dependencies: checked.dependencies,
        snapshot_id,
        title: checked.title,
        inputs: checked
            .inputs
            .iter()
            .map(|n| Input {
                name: n.clone(),
                id: id(n),
                value_type: checked.symbols[n].value_type.clone(),
            })
            .collect(),
        outputs: checked.outputs.iter().map(|n| (n.clone(), id(n))).collect(),
        nodes,
        binding_count,
        source: checked.source,
        diagnostics: checked.diagnostics,
    }
}

/// Compile exact source against already pinned child interfaces, propagating source diagnostics.
pub(crate) fn compile_with_dependencies(
    source: &str,
    dependencies: BTreeMap<String, Dependency>,
) -> Result<CompiledPattern, Vec<Diagnostic>> {
    syntax::parse(source)
        .and_then(|parsed| check(parsed, dependencies).map_err(|e| vec![e]))
        .map(lower)
}

type Check<T> = Result<T, Diagnostic>;

/// Validate source in declaration, label, output, then control-flow order.
/// Keeping this order preserves which diagnostic is reported first.
fn check(
    parsed: ParsedPattern,
    mut dependencies: BTreeMap<String, Dependency>,
) -> Check<ValidatedPattern> {
    let flows = procedures::compile(&parsed, &mut dependencies)?;
    let message_handler = procedures::handler(&parsed, &flows)?;
    for import in syntax::imports(&parsed.declarations)? {
        if dependencies
            .get(&import.alias)
            .is_none_or(|dependency| dependency.id != import.revision)
        {
            return Err(err(
                format!(
                    "Import '{}' requires its exact saved revision",
                    import.alias
                ),
                import.span,
            ));
        }
    }
    let Declarations {
        mut symbols,
        inputs,
        output_words,
        title,
    } = check_declarations(&parsed.declarations)?;
    symbols.classifiers =
        std::sync::Arc::new(semantic::classifiers(&parsed.classifiers, &symbols)?);
    let indexed = index_statements(parsed.statements, parsed.source.len())?;
    let outputs = check_output_names(output_words)?;
    let CheckedBody { steps, diagnostics } = check_flow(
        indexed,
        &mut symbols,
        &inputs,
        &outputs,
        &dependencies,
        parsed.source.len(),
    )?;
    Ok(ValidatedPattern {
        flows,
        message_handler,
        dependencies,
        source: parsed.source,
        title,
        symbols,
        inputs,
        outputs,
        steps,
        diagnostics,
    })
}

struct Declarations {
    symbols: Scope,
    inputs: Vec<String>,
    output_words: Vec<Word>,
    title: Option<String>,
}

/// Validate header declarations and assign input symbols; defer output-name checks.
fn check_declarations(declarations: &[Attribute]) -> Check<Declarations> {
    let mut symbols = Scope::default();
    symbols.enums = std::sync::Arc::new(semantic::enums(declarations)?);
    let mut inputs = vec![];
    let mut output_words = vec![];
    let mut language = false;
    let mut title = None;
    for a in declarations {
        match a.name.as_str() {
            "language" => {
                let w = &arity(a, 1)?[0];
                if language || w.quoted || !matches!(w.text.as_str(), "1" | "2") {
                    return Err(err(
                        "Declare ':language 1' or ':language 2' exactly once",
                        a.span.clone(),
                    ));
                }
                language = true;
                symbols.language = if w.text == "2" { 2 } else { 1 };
            }
            "title" => {
                if title.is_some() {
                    return Err(err("Duplicate :title", a.span.clone()));
                }
                title = Some(quoted(&arity(a, 1)?[0])?);
            }
            "input" => {
                let args = arity(a, 2)?;
                let key = name(&args[0])?;
                let ty = semantic::declared_type(&args[1], &symbols)?;
                declare(&mut symbols, key.clone(), ty, args[0].span.clone())?;
                inputs.push(key);
            }
            "output" => output_words.push(arity(a, 1)?[0].clone()),
            "import" | "function" | "enum" => {}
            _ => {
                return Err(err(
                    format!("Unsupported Pattern declaration :{}", a.name),
                    a.span.clone(),
                ))
            }
        }
    }
    if !language {
        return Err(err("Missing ':language 1' declaration", 0..0));
    }
    symbols.functions = std::sync::Arc::new(expression::functional::definitions(
        declarations,
        symbols.language,
    )?);

    Ok(Declarations {
        symbols,
        inputs,
        output_words,
        title,
    })
}

struct StatementIndex {
    labels: BTreeMap<String, (usize, Span)>,
    executable: Vec<Statement>,
}

/// Resolve labels to executable positions and reject empty or dangling entry paths.
fn index_statements(statements: Vec<Statement>, source_end: usize) -> Check<StatementIndex> {
    let mut labels = BTreeMap::new();
    let mut executable = vec![];
    for statement in statements {
        if let Statement::Label(w) = statement {
            if w.text == "end" {
                return Err(err("'end' is a reserved completion target", w.span));
            }
            if let Some((_, first)) =
                labels.insert(w.text.clone(), (executable.len(), w.span.clone()))
            {
                let mut e = err("Duplicate label", w.span);
                e.secondary.push((first, "First label".into()));
                return Err(e);
            }
        } else {
            executable.push(statement);
        }
    }
    let count = executable.len();
    if let Some((_, span)) = labels.values().find(|(target, _)| *target == count) {
        return Err(err("Label has no following statement", span.clone()));
    }
    if count == 0 {
        return Err(err(
            "Pattern requires an explicit completion path",
            source_end..source_end,
        ));
    }
    Ok(StatementIndex { labels, executable })
}

/// Validate declared output names in source order, rejecting the first duplicate.
fn check_output_names(words: Vec<Word>) -> Check<Vec<String>> {
    let mut outputs = vec![];
    let mut seen = BTreeSet::new();
    for w in words {
        let key = name(&w)?;
        if !seen.insert(key.clone()) {
            return Err(err("Duplicate output", w.span));
        }
        outputs.push(key);
    }
    Ok(outputs)
}

struct CheckedBody {
    steps: Vec<(CheckedStep, Span)>,
    diagnostics: Vec<Diagnostic>,
}

/// Check assignment and completion across forward paths, allocating global symbols.
/// Dead paths are checked separately and cannot satisfy live-path output requirements.
fn check_flow(
    indexed: StatementIndex,
    symbols: &mut Scope,
    inputs: &[String],
    outputs: &[String],
    dependencies: &BTreeMap<String, Dependency>,
    source_end: usize,
) -> Check<CheckedBody> {
    let StatementIndex { labels, executable } = indexed;
    let count = executable.len();
    let input_names: BTreeSet<_> = inputs.iter().cloned().collect();
    let seed = Flow {
        definite: input_names.clone(),
        possible: input_names,
    };
    let mut incoming = vec![None; count + 1];
    // Validate disconnected dead paths without letting them contribute to live joins.
    let mut dead_incoming = vec![None; count + 1];
    incoming[0] = Some(seed.clone());
    let mut steps = vec![];
    let mut diagnostics = vec![];
    for (index, statement) in executable.into_iter().enumerate() {
        let span = statement.span();
        let reachable = incoming[index].is_some();
        let mut flow = incoming[index]
            .clone()
            .or_else(|| dead_incoming[index].clone())
            .unwrap_or_else(|| seed.clone());
        if !reachable {
            diagnostics.push(Diagnostic {
                severity: Severity::Warning,
                code: "S_UNREACHABLE".into(),
                message: "This statement cannot be reached".into(),
                primary: span.clone(),
                secondary: vec![],
                help: Some("Remove it or add a forward path to it.".into()),
            });
        }
        let mut local = symbols.visible(&flow.definite);
        let step = match statement {
            Statement::Block(b) if b.kind == "refine" => {
                refinement::check(b, &mut local, &flow.possible, dependencies)?
            }
            Statement::Block(b) if b.kind == "?loop" => {
                looping::check(b, &local, &flow.possible, dependencies)?
            }
            Statement::Block(b) if matches!(b.kind.as_str(), "collect" | "each") => {
                check_collection(b, &mut local, &flow.possible, dependencies)?
            }
            Statement::Block(b) if b.kind.starts_with('?') => {
                control(&b, &local, index, &labels, count)?
            }
            Statement::Block(b) => check_block(b, &mut local, dependencies)?,
            Statement::Derive {
                binding,
                expression,
                expression_offset,
                ..
            } => {
                let key = name(&binding)?;
                let (expression, ty) = check_expression(&expression, expression_offset, &local)?;
                declare(&mut local, key.clone(), ty, binding.span)?;
                CheckedStep::Derive {
                    binding: key,
                    expression,
                }
            }
            Statement::Jump { target: w, .. } => {
                if w.text == "end" {
                    CheckedStep::End
                } else {
                    CheckedStep::Jump(target(&w.text, w.span, index, &labels, count)?)
                }
            }
            Statement::Label(_) => unreachable!(),
            Statement::Repeat { span, .. } => {
                return Err(err("Repeat is only valid inside a loop", span))
            }
            Statement::Propose { span, .. } => {
                return Err(err("Propose is only valid at the end of refinement", span))
            }
            Statement::Yield { span, .. } => {
                return Err(err(
                    "Yield is only valid at the end of a collection or each body",
                    span,
                ))
            }
        };
        merge_statement_bindings(&local, symbols, &mut flow)?;
        if reachable {
            if matches!(step, CheckedStep::End) {
                for key in outputs {
                    if !flow.definite.contains(key) {
                        return Err(err(
                            format!("Output '{key}' is not assigned on every completion path"),
                            span.clone(),
                        ));
                    }
                }
            }
            let next = successors(&step, index);
            // Only authored jumps/branches to end may enter the synthetic terminal.
            if next.contains(&count)
                && !matches!(
                    step,
                    CheckedStep::Branch { .. } | CheckedStep::Match { .. } | CheckedStep::Jump(_)
                )
            {
                return Err(err("Execution falls off the Pattern; add '-> end'", span));
            }
            for dest in next {
                merge(&mut incoming[dest], &flow);
            }
        } else {
            for dest in successors(&step, index) {
                merge(&mut dead_incoming[dest], &flow);
            }
        }
        steps.push((step, span));
    }
    if let Some(flow) = &incoming[count] {
        for key in outputs {
            if !flow.definite.contains(key) {
                return Err(err(
                    format!("Output '{key}' is missing on a path to end"),
                    source_end..source_end,
                ));
            }
        }
    }
    // Every output must have a concrete global type even if all explicit ends were unreachable.
    for key in outputs {
        lookup(symbols, key, 0..0)?;
    }
    steps.push((CheckedStep::End, source_end..source_end));
    Ok(CheckedBody { steps, diagnostics })
}

/// Merge a checked statement's assignments into its path and the global symbol table.
/// Rejects possible reassignment and cross-branch type conflicts before advancing control flow.
fn merge_statement_bindings(local: &Scope, symbols: &mut Scope, flow: &mut Flow) -> Check<()> {
    for (key, symbol) in local {
        if flow.definite.contains(key) {
            continue;
        }
        if flow.possible.contains(key) {
            let mut e = err(
                format!("Binding '{key}' may already be assigned on this path"),
                symbol.span.clone(),
            );
            if let Some(old) = symbols.get(key) {
                e.secondary
                    .push((old.span.clone(), "Earlier assignment".into()));
            }
            return Err(e);
        }
        if let Some(old) = symbols.get(key) {
            if old.value_type != symbol.value_type {
                let mut e = err(
                    format!("Binding '{key}' has different types across branches"),
                    symbol.span.clone(),
                );
                e.secondary
                    .push((old.span.clone(), "Other branch assignment".into()));
                return Err(e);
            }
        } else {
            let mut symbol = symbol.clone();
            symbol.id = BindingId(symbols.len());
            symbols.insert(key.clone(), symbol);
        }
        flow.definite.insert(key.clone());
        flow.possible.insert(key.clone());
    }
    Ok(())
}

/// Construct a semantic diagnostic at the supplied UTF-8 byte span.
fn err(message: impl Into<String>, span: Span) -> Diagnostic {
    Diagnostic::error("S001", message, span)
}
/// Require an exact argument count and borrow the validated arguments.
fn arity(attr: &Attribute, n: usize) -> Check<&[Word]> {
    if attr.args.len() == n {
        Ok(&attr.args)
    } else {
        Err(err(
            format!(":{} expects {n} argument(s)", attr.name),
            attr.span.clone(),
        ))
    }
}
/// Require an unquoted identifier that is not an expression keyword.
fn name(word: &Word) -> Check<String> {
    if !word.quoted
        && syntax::is_identifier(&word.text)
        && !["true", "false", "not", "and", "or", "count"].contains(&word.text.as_str())
    {
        Ok(word.text.clone())
    } else {
        Err(err("Expected an unquoted binding name", word.span.clone()))
    }
}
/// Parse a supported unquoted structural type, bounding recursive list-type text.
fn value_type(word: &Word) -> Check<Type> {
    if word.quoted {
        return Err(err("Type names must not be quoted", word.span.clone()));
    }
    if let Some(inner) = word
        .text
        .strip_prefix("list<")
        .and_then(|s| s.strip_suffix('>'))
    {
        if inner.len() > 128 {
            return Err(err("List type is too deeply nested", word.span.clone()));
        }
        return value_type(&Word {
            text: inner.into(),
            quoted: false,
            span: word.span.clone(),
        })
        .map(|ty| Type::List(Box::new(ty)));
    }
    match word.text.as_str() {
        "text" => Ok(Type::Text),
        "number" => Ok(Type::Number),
        "boolean" => Ok(Type::Boolean),
        "choice" => Ok(Type::Choice),
        "choices" => Ok(Type::Choices),
        _ => Err(err(
            format!("Unsupported value type '{}'", word.text),
            word.span.clone(),
        )),
    }
}
/// Extract a quoted argument or report its source span as invalid.
fn quoted(word: &Word) -> Check<String> {
    if word.quoted {
        Ok(word.text.clone())
    } else {
        Err(err("Expected a quoted string", word.span.clone()))
    }
}
/// Allocate an immutable symbol, rejecting duplicates with the original declaration span.
fn declare(symbols: &mut Scope, key: String, ty: Type, span: Span) -> Check<()> {
    if symbols.enums.contains_key(&key) {
        return Err(err("Bindings cannot shadow an enum type name", span));
    }
    if let Some(previous) = symbols.get(&key) {
        let mut e = err(
            format!("Binding '{key}' already exists; bindings are immutable"),
            span,
        );
        e.secondary
            .push((previous.span.clone(), "First declaration".into()));
        return Err(e);
    }
    let id = BindingId(symbols.len());
    symbols.insert(
        key,
        Symbol {
            value_type: ty,
            span,
            id,
        },
    );
    Ok(())
}
/// Borrow an available symbol or diagnose the missing binding at its use site.
fn lookup<'a>(symbols: &'a Scope, key: &str, span: Span) -> Check<&'a Symbol> {
    symbols
        .get(key)
        .ok_or_else(|| err(format!("Binding '{key}' is not available here"), span))
}
/// Resolve Markdown interpolations to available bindings and typed field paths.
fn check_template(block: &Block, symbols: &Scope) -> Check<Vec<CheckedPart>> {
    if !block.statements.is_empty() || matches!(block.kind.as_str(), "realize" | "bound_realize") {
        let realization = if matches!(block.kind.as_str(), "realize" | "bound_realize") {
            block
        } else {
            match block.statements.as_slice() {
                [Statement::Block(child)] if child.kind == "realize"
                    && matches!(block.kind.as_str(), "ask" | "show")
                    && block.body.iter().all(|line| line.text.trim().is_empty()) => child,
                _ => return Err(err("Use one realization as the entire !ask or !show body; do not mix literal content and realization", block.span.clone())),
            }
        };
        if !realization.statements.is_empty() || !realization.attributes.is_empty() {
            return Err(err(
                "Realization accepts text and references only",
                realization.span.clone(),
            ));
        }
        let parts = syntax::template(&realization.body)?;
        let mut specification = String::new();
        let mut inputs = vec![];
        for part in parts {
            match part {
                TemplatePart::Literal(text) => specification.push_str(&text),
                TemplatePart::Reference { path, span } => {
                    let key = path.join(".");
                    let ((name, field), _) = resolved(&path, span, symbols)?;
                    specification.push_str(&format!("{{{{{key}}}}}"));
                    inputs.push((key, name, field));
                }
            }
        }
        if specification.trim().is_empty() {
            return Err(err(
                "Realization requires a nonempty specification",
                realization.span.clone(),
            ));
        }
        return Ok(vec![CheckedPart::Realize {
            specification,
            inputs,
        }]);
    }
    syntax::template(&block.body)?
        .into_iter()
        .map(|part| match part {
            TemplatePart::Literal(s) => Ok(CheckedPart::Literal(s)),
            TemplatePart::Reference { path, span } => {
                let ((name, field), _) = resolved(&path, span, symbols)?;
                Ok(CheckedPart::Reference(name, field))
            }
        })
        .collect()
}
/// Index only allowed attributes, rejecting unsupported names and duplicates.
fn attributes<'a>(block: &'a Block, allowed: &[&str]) -> Check<BTreeMap<&'a str, &'a Attribute>> {
    let mut result = BTreeMap::new();
    for a in &block.attributes {
        if !allowed.contains(&a.name.as_str()) {
            return Err(err(
                format!("Unsupported :{} on !{}", a.name, block.kind),
                a.span.clone(),
            ));
        }
        if result.insert(a.name.as_str(), a).is_some() {
            return Err(err(format!("Duplicate :{}", a.name), a.span.clone()));
        }
    }
    Ok(result)
}
/// Parse an optional strictly positive integer bound; absent attributes remain unbounded.
fn bound(attr: Option<&&Attribute>) -> Check<Option<usize>> {
    attr.map(|a| {
        let w = &arity(a, 1)?[0];
        if w.quoted || !w.text.chars().all(|c| c.is_ascii_digit()) {
            return Err(err("Expected a positive integer limit", w.span.clone()));
        }
        w.text
            .parse::<usize>()
            .ok()
            .filter(|n| *n > 0)
            .ok_or_else(|| err("Expected a positive integer limit", w.span.clone()))
    })
    .transpose()
}
/// Extract the required immutable binding name from an action header.
fn required_binding(block: &Block) -> Check<String> {
    block
        .binding
        .as_ref()
        .map(name)
        .transpose()?
        .ok_or_else(|| {
            err(
                format!("!{} requires a binding", block.kind),
                block.span.clone(),
            )
        })
}

/// Validate an action's attributes, template, and result contract, then declare its binding.
/// Only supported executable actions are accepted; dependency calls use pinned interfaces.
fn check_block(
    b: Block,
    symbols: &mut Scope,
    dependencies: &BTreeMap<String, Dependency>,
) -> Check<CheckedStep> {
    if matches!(
        b.kind.as_str(),
        "bound_realize" | "classify" | "semantic_select" | "semantic_filter" | "semantic_rank"
    ) {
        return semantic::check(b, symbols);
    }
    if b.kind == "use" {
        return check_use(b, symbols, dependencies);
    }
    let prompt = check_template(&b, symbols)?;
    let step = match b.kind.as_str() {
        "ask" => {
            attributes(&b, &[])?;
            let binding = required_binding(&b)?;
            declare(
                symbols,
                binding.clone(),
                Type::Text,
                b.binding.as_ref().unwrap().span.clone(),
            )?;
            CheckedStep::Ask { binding, prompt }
        }
        "rate" => {
            let attrs = attributes(&b, &["prefer", "low", "high"])?;
            let (range, span) = b
                .argument
                .as_ref()
                .ok_or_else(|| err("Rating requires low..high", b.span.clone()))?;
            let (lo, hi) = range
                .split_once("..")
                .ok_or_else(|| err("Expected low..high", span.clone()))?;
            let finite = |s: &str| {
                s.parse::<f64>()
                    .ok()
                    .filter(|n| n.is_finite())
                    .ok_or_else(|| err("Rating bounds must be finite numbers", span.clone()))
            };
            let min = finite(lo)?;
            let max = finite(hi)?;
            if min > max {
                return Err(err("Rating minimum exceeds maximum", span.clone()));
            }
            let prefer = attrs
                .get("prefer")
                .map(|a| name(&arity(a, 1)?[0]))
                .transpose()?;
            let label = |key| attrs.get(key).map(|a| quoted(&arity(a, 1)?[0])).transpose();
            let rating = Rating {
                min,
                max,
                prefer,
                low: label("low")?,
                high: label("high")?,
            };
            let binding = required_binding(&b)?;
            declare(
                symbols,
                binding.clone(),
                Type::Number,
                b.binding.as_ref().unwrap().span.clone(),
            )?;
            CheckedStep::Rate {
                binding,
                rating,
                prompt,
            }
        }
        "agent" => {
            let attrs = attributes(&b, &["returns", "min", "max"])?;
            let binding = b.binding.as_ref().map(name).transpose()?;
            if let Some(returns) = attrs.get("returns") {
                let binding = required_binding(&b)?;
                let ty = value_type(&arity(returns, 1)?[0])?;
                if matches!(ty, Type::List(_)) {
                    return Err(err(
                        "Agent return contracts do not yet support lists",
                        returns.span.clone(),
                    ));
                }
                let min = bound(attrs.get("min"))?;
                let max = bound(attrs.get("max"))?;
                if (min.is_some() || max.is_some()) && ty != Type::Choices {
                    return Err(err(":min/:max are supported only for choices", b.span));
                }
                if matches!((min,max),(Some(a),Some(z)) if a>z) {
                    return Err(err(":min must not exceed :max", b.span));
                }
                declare(
                    symbols,
                    binding.clone(),
                    ty.clone(),
                    b.binding.as_ref().unwrap().span.clone(),
                )?;
                CheckedStep::Generate {
                    binding,
                    contract: Contract {
                        returns: ty,
                        min,
                        max,
                    },
                    prompt,
                }
            } else {
                if attrs.contains_key("min") || attrs.contains_key("max") {
                    return Err(err(":min/:max require ':returns choices'", b.span));
                }
                if let Some(key) = &binding {
                    declare(
                        symbols,
                        key.clone(),
                        Type::Text,
                        b.binding.as_ref().unwrap().span.clone(),
                    )?;
                }
                CheckedStep::Turn { binding, prompt }
            }
        }
        "choose" | "rank"
            if b.kind == "rank"
                || b.argument
                    .as_ref()
                    .is_some_and(|(kind, _)| kind == "selection_header")
                || b.attributes
                    .iter()
                    .any(|a| !matches!(a.name.as_str(), "option" | "from")) =>
        {
            selection::check(&b, symbols, prompt)?
        }
        "choose" => {
            let binding = required_binding(&b)?;
            let mut options = vec![];
            let mut from = None;
            for a in &b.attributes {
                match a.name.as_str() {
                    "option" => {
                        let args = arity(a, 2)?;
                        options.push(Choice {
                            value: name(&args[0])?,
                            label: quoted(&args[1])?,
                        });
                    }
                    "from" => {
                        if from.is_some() {
                            return Err(err("Duplicate :from", a.span.clone()));
                        }
                        let (source, ty) = check_expression(&a.raw, a.raw_offset, symbols)?;
                        if ty != Type::Choices && ty != Type::List(Box::new(Type::Choice)) {
                            return Err(err(
                                ":from requires choices or list<choice>",
                                a.span.clone(),
                            ));
                        }
                        from = Some(source);
                    }
                    _ => {
                        return Err(err(
                            format!("Unsupported :{} on !choose", a.name),
                            a.span.clone(),
                        ))
                    }
                }
            }
            let options=match (from,options.is_empty()) {
                    (Some(key),true)=>CheckedOptions::Dynamic(key),
                    (None,false) if valid_choices(&options)=>CheckedOptions::Static(options),
                    _=>return Err(err("Choose exactly one source: :from, or nonempty :option entries with unique values",b.span)),
                };
            declare(
                symbols,
                binding.clone(),
                Type::Choice,
                b.binding.as_ref().unwrap().span.clone(),
            )?;
            CheckedStep::Choose {
                binding,
                options,
                prompt,
            }
        }
        "show" | "realize" => {
            attributes(&b, &[])?;
            if b.binding.is_some() {
                return Err(err("!show does not create a binding", b.span));
            }
            CheckedStep::Show { body: prompt }
        }
        _ => {
            return Err(err(
                format!("!{} is not executable in the M4 subset yet", b.kind),
                b.span,
            ))
        }
    };

    Ok(step)
}

/// Resolve a nonempty parsed reference path and infer its selected field type.
/// The parser guarantees at least one path component.
fn resolved(
    path: &[String],
    span: Span,
    symbols: &Scope,
) -> Check<((String, Option<Field>), Type)> {
    let mut ty = lookup(symbols, &path[0], span.clone())?.value_type.clone();
    for field in &path[1..] {
        ty = match ty {
            Type::Choice if matches!(field.as_str(), "value" | "label") => Type::Text,
            Type::Record(fields) => fields
                .get(field)
                .cloned()
                .ok_or_else(|| err(format!("Unknown field '{field}'"), span.clone()))?,
            _ => return Err(err(format!("Unknown field '{field}'"), span)),
        };
    }
    let field = if path.len() > 1 {
        Some(Field(path[1..].to_vec()))
    } else {
        None
    };
    Ok(((path[0].clone(), field), ty))
}
/// Parse and type-check an expression against currently available symbols.
fn check_expression(source: &str, offset: usize, symbols: &Scope) -> Check<(CheckedExpr, Type)> {
    let expression = semantic::literals(
        expression::parse_version(source, offset, symbols.language)?,
        symbols,
    )?;
    let resolve = |path: &[String], span| resolved(path, span, symbols);
    if symbols.functions.is_empty() {
        expression::check(expression, &resolve)
    } else {
        expression::check_with_functions(expression, &symbols.functions, &resolve)
    }
}

/// Parse a nonnegative collection bound that fits an unsigned 32-bit integer.
fn collection_limit(attribute: &&Attribute) -> Check<usize> {
    let word = &arity(attribute, 1)?[0];
    if word.quoted || !word.text.chars().all(|c| c.is_ascii_digit()) {
        return Err(err(
            "Collection limits must be nonnegative integer literals",
            word.span.clone(),
        ));
    }
    word.text.parse::<u32>().map(|n| n as usize).map_err(|_| {
        err(
            "Collection limit must fit in an unsigned 32-bit integer",
            word.span.clone(),
        )
    })
}
/// Validate straight-line record bodies and collection bounds in a fresh scope.
/// Rejects shadowing and exposes only the completed record list to the enclosing scope.
fn check_collection(
    b: Block,
    outer: &mut Scope,
    possible: &BTreeSet<String>,
    dependencies: &BTreeMap<String, Dependency>,
) -> Check<CheckedStep> {
    let binding = required_binding(&b)?;
    if outer.contains_key(&binding) {
        return Err(err("Collection binding already exists", b.span));
    }
    let attrs = attributes(&b, &["min", "max", "from", "as"])?;
    let mut local = outer.clone();
    let mut reserved = possible.clone();
    reserved.insert(binding.clone());
    let mode = if let Some(from) = attrs.get("from") {
        if attrs.contains_key("min") || attrs.contains_key("max") {
            return Err(err("Mapped collections cannot use :min or :max", b.span));
        }
        let (source, ty) = check_expression(&from.raw, from.raw_offset, outer)?;
        let element = match ty {
            Type::Choices => Type::Choice,
            Type::List(ty) => *ty,
            _ => {
                return Err(err(
                    "Mapped collection source must be a list or choices",
                    from.span.clone(),
                ))
            }
        };
        let alias_attr = attrs
            .get("as")
            .ok_or_else(|| err("Mapped collections require :as", b.span.clone()))?;
        let alias_word = &arity(alias_attr, 1)?[0];
        let alias = name(alias_word)?;
        if reserved.contains(&alias) {
            return Err(err(
                "Source alias cannot shadow an enclosing binding",
                alias_word.span.clone(),
            ));
        }
        declare(&mut local, alias.clone(), element, alias_word.span.clone())?;
        reserved.insert(alias.clone());
        CheckedCollectionMode::Mapped { source, alias }
    } else {
        if attrs.contains_key("as") {
            return Err(err(":as requires a mapped :from source", b.span));
        }
        let max = attrs
            .get("max")
            .ok_or_else(|| err("Open collections require a finite :max", b.span.clone()))?;
        let max = collection_limit(max)?;
        let min = attrs
            .get("min")
            .map(collection_limit)
            .transpose()?
            .unwrap_or(1);
        if min > max {
            return Err(err("Collection :min must not exceed :max", b.span));
        }
        CheckedCollectionMode::Open { min, max }
    };
    if b.statements.is_empty() {
        return Err(err("A collection requires a record body", b.span));
    }
    let mut steps = vec![];
    let mut fields = BTreeMap::new();
    let mut yielded_type = None;
    let statement_count = b.statements.len();
    for (index, statement) in b.statements.into_iter().enumerate() {
        let span = statement.span();
        let previous: BTreeSet<_> = local.keys().cloned().collect();
        let step = match statement {
            Statement::Block(child)
                if !child.kind.starts_with('?') && !matches!(child.kind.as_str(), "collect" | "each") =>
            {
                check_block(child, &mut local, dependencies)?
            }
            Statement::Derive { binding, expression, expression_offset, .. } => {
                let key = name(&binding)?;
                let (expression, ty) = check_expression(&expression, expression_offset, &local)?;
                declare(&mut local, key.clone(), ty, binding.span)?;
                CheckedStep::Derive { binding: key, expression }
            }
            Statement::Yield { expression, expression_offset, .. }
                if index + 1 == statement_count => {
                let (expression, ty) = check_expression(&expression, expression_offset, &local)?;
                yielded_type = Some(ty);
                CheckedStep::Yield(expression)
            }
            _ => return Err(err(
                "Collection bodies must be straight-line: no labels, jumps, branches, or nested collections",
                span,
            )),
        };
        for (key, symbol) in &local {
            if previous.contains(key) {
                continue;
            }
            if reserved.contains(key) {
                return Err(err(
                    "Record fields cannot shadow enclosing bindings or the source alias",
                    symbol.span.clone(),
                ));
            }
            fields.insert(key.clone(), symbol.value_type.clone());
        }
        steps.push((step, span));
    }
    if (outer.language == 2 || b.kind == "each") && yielded_type.is_none() {
        return Err(err(
            "Each bodies require a final '-> yield expression'",
            b.span,
        ));
    }
    let element_type = yielded_type.unwrap_or_else(|| Type::Record(fields.clone()));
    let locals = local
        .into_iter()
        .filter(|(key, _)| !outer.contains_key(key))
        .collect();
    declare(
        outer,
        binding.clone(),
        Type::List(Box::new(element_type.clone())),
        b.binding.unwrap().span,
    )?;
    Ok(CheckedStep::Collect(Box::new(CheckedCollection {
        element_type,
        binding,
        mode,
        steps,
        locals,
        fields,
    })))
}
#[derive(Clone)]
struct Flow {
    definite: BTreeSet<String>,
    possible: BTreeSet<String>,
}
/// Intersect definitely assigned bindings and union possibly assigned bindings at a join.
fn merge(slot: &mut Option<Flow>, flow: &Flow) {
    if let Some(old) = slot {
        old.definite = old.definite.intersection(&flow.definite).cloned().collect();
        old.possible.extend(flow.possible.iter().cloned());
    } else {
        *slot = Some(flow.clone());
    }
}
/// Resolve a label or synthetic end target, rejecting backward and self jumps.
fn target(
    word: &str,
    span: Span,
    current: usize,
    labels: &BTreeMap<String, (usize, Span)>,
    end: usize,
) -> Check<NodeId> {
    let target = if word == "end" {
        end
    } else {
        labels
            .get(word)
            .map(|(i, _)| *i)
            .ok_or_else(|| err(format!("Unknown target '{word}'"), span.clone()))?
    };
    if target <= current {
        return Err(err("Backward and self jumps are prohibited", span));
    }
    Ok(NodeId(target))
}
/// Split a control arm into expression text and a validated forward destination.
fn arm(
    attr: &Attribute,
    current: usize,
    labels: &BTreeMap<String, (usize, Span)>,
    end: usize,
) -> Check<(String, NodeId)> {
    if attr.name == "else" {
        let word = attr
            .raw
            .trim()
            .strip_prefix("->")
            .map(str::trim)
            .ok_or_else(|| err("Expected ':else -> target'", attr.span.clone()))?;
        return Ok((
            String::new(),
            target(word, attr.span.clone(), current, labels, end)?,
        ));
    }
    let (expr, to) = attr
        .raw
        .rsplit_once("->")
        .ok_or_else(|| err("Expected 'expression -> target'", attr.span.clone()))?;
    Ok((
        expr.trim().into(),
        target(to.trim(), attr.span.clone(), current, labels, end)?,
    ))
}
/// Parse a typed scalar literal or semantic choice identity for a match arm.
fn case(source: &str, offset: usize, ty: &Type) -> Check<Case> {
    let span = offset..offset + source.len();
    if let Type::Enum(schema) = ty {
        let variant = source
            .strip_prefix(&format!("{}.", schema.name))
            .unwrap_or(source);
        return if schema.variants.iter().any(|v| v == variant) {
            Ok(Case::Enum(variant.into()))
        } else {
            Err(err("Case is not a variant of this enum", span))
        };
    }
    if *ty == Type::Choice {
        if syntax::is_identifier(source) {
            return Ok(Case::Choice(source.into()));
        }
        if let Ok(Value::Text(s)) = serde_json::from_str::<String>(source).map(Value::Text) {
            return Ok(Case::Choice(s));
        }
        return Err(err("Choice cases require a semantic choice ID", span));
    }
    let parsed = expression::parse(source, offset)?;
    let value = match parsed.kind {
        Kind::Literal(v) => v,
        Kind::Unary(Unary::Negate, e) => match e.kind {
            Kind::Literal(Value::Number(n)) => Value::Number(-n),
            _ => return Err(err("Match cases must be literals", span)),
        },
        _ => return Err(err("Match cases must be literals", span)),
    };
    match (ty, value) {
        (Type::Text, Value::Text(v)) => Ok(Case::Text(v)),
        (Type::Number, Value::Number(v)) => Ok(Case::Number(v)),
        (Type::Boolean, Value::Boolean(v)) => Ok(Case::Boolean(v)),
        _ => Err(err("Case type does not match the subject", span)),
    }
}
/// Validate branch/match arms, scalar types, unique cases, and a final fallback.
fn control(
    b: &Block,
    symbols: &Scope,
    current: usize,
    labels: &BTreeMap<String, (usize, Span)>,
    end: usize,
) -> Check<CheckedStep> {
    if b.body.iter().any(|l| !l.text.trim().is_empty()) {
        return Err(err(
            "Control blocks contain only arms, not Markdown",
            b.span.clone(),
        ));
    }
    let is_match = b.kind == "?match";
    let subject = if is_match {
        let (s, span) = b.argument.as_ref().unwrap();
        let (e, ty) = check_expression(s, span.start, symbols)?;
        if matches!(ty, Type::Choices | Type::List(_) | Type::Record(_)) {
            return Err(err("Match requires a scalar subject", span.clone()));
        }
        Some((e, ty))
    } else {
        None
    };
    let mut conditions = vec![];
    let mut cases = vec![];
    let mut otherwise = None;
    for a in &b.attributes {
        if otherwise.is_some() {
            return Err(err(":else must be the final arm", a.span.clone()));
        }
        if a.name != "else" && a.name != if is_match { "case" } else { "when" } {
            return Err(err("Unexpected control attribute", a.span.clone()));
        }
        let (source, dest) = arm(a, current, labels, end)?;
        if a.name == "else" {
            otherwise = Some(dest);
        } else if let Some((_, ty)) = &subject {
            let value = case(&source, a.raw_offset, ty)?;
            if cases.iter().any(|(old, _)| old == &value) {
                return Err(err("Duplicate match case", a.span.clone()));
            }
            cases.push((value, dest));
        } else {
            let (expr, ty) = check_expression(&source, a.raw_offset, symbols)?;
            if ty != Type::Boolean {
                return Err(err("Branch conditions must be boolean", a.span.clone()));
            }
            conditions.push((expr, dest));
        }
    }
    let has_fallback = otherwise.is_some();
    if otherwise.is_none() {
        if let Some((_, Type::Enum(schema))) = &subject {
            if schema
                .variants
                .iter()
                .any(|v| !cases.iter().any(|(case, _)| case == &Case::Enum(v.clone())))
            {
                return Err(err(
                    "Enum match must cover every variant or include a final :else",
                    b.span.clone(),
                ));
            }
            otherwise = cases.first().map(|(_, target)| *target);
        }
    }
    let otherwise =
        otherwise.ok_or_else(|| err("Control blocks require a final :else", b.span.clone()))?;
    if let Some((subject, _)) = subject {
        Ok(CheckedStep::Match {
            subject,
            cases,
            otherwise,
            has_fallback,
        })
    } else {
        Ok(CheckedStep::Branch {
            arms: conditions,
            otherwise,
        })
    }
}
/// Enumerate successor instruction indices for forward definite-assignment analysis.
fn successors(step: &CheckedStep, index: usize) -> Vec<usize> {
    match step {
        CheckedStep::End => vec![],
        CheckedStep::Jump(id) => vec![id.0],
        CheckedStep::Branch { arms, otherwise } => arms
            .iter()
            .map(|(_, id)| id.0)
            .chain([otherwise.0])
            .collect(),
        CheckedStep::Match {
            cases, otherwise, ..
        } => cases
            .iter()
            .map(|(_, id)| id.0)
            .chain([otherwise.0])
            .collect(),
        _ => vec![index + 1],
    }
}

/// Lower a validated step to numeric bindings and nodes, allocating fresh collection locals.
/// Validation guarantees all referenced symbols and control targets are present.
fn lower_step(
    step: CheckedStep,
    symbols: &Scope,
    next_binding: &mut usize,
    next_node: &mut usize,
) -> Instruction {
    let id = |name: &str| symbols[name].id;
    let template = |parts: Vec<CheckedPart>| {
        parts
            .into_iter()
            .map(|p| match p {
                CheckedPart::Literal(s) => Part::Literal(s),
                CheckedPart::Realize {
                    specification,
                    inputs,
                } => Part::Realize {
                    specification,
                    inputs: inputs
                        .into_iter()
                        .map(|(key, n, f)| (key, id(&n), f))
                        .collect(),
                },
                CheckedPart::Reference(n, f) => Part::Reference(id(&n), f),
            })
            .collect()
    };
    match step {
        CheckedStep::Realize { binding, prompt } => Instruction::Realize {
            binding: id(&binding),
            prompt: template(prompt),
        },
        CheckedStep::Classify {
            binding,
            input,
            definition,
            context,
        } => Instruction::Classify {
            binding: id(&binding),
            input: expression::lower(input, &|(n, f): (String, Option<Field>)| (id(&n), f)),
            definition,
            context: context
                .into_iter()
                .map(|(key, e)| {
                    (
                        key,
                        expression::lower(e, &|(n, f): (String, Option<Field>)| (id(&n), f)),
                    )
                })
                .collect(),
        },
        CheckedStep::Suggest {
            binding,
            input,
            mode,
            element,
            criteria,
        } => Instruction::Suggest {
            binding: id(&binding),
            input: expression::lower(input, &|(n, f): (String, Option<Field>)| (id(&n), f)),
            mode,
            element,
            criteria: template(criteria),
        },
        CheckedStep::Yield(expression) => Instruction::Yield(expression::lower(
            expression,
            &|(n, f): (String, Option<Field>)| (id(&n), f),
        )),
        CheckedStep::Refine(body) => refinement::lower(*body, symbols, next_binding, next_node),
        CheckedStep::Propose(expression) => Instruction::Propose(expression::lower(
            expression,
            &|(n, f): (String, Option<Field>)| (id(&n), f),
        )),
        CheckedStep::Loop(body) => looping::lower(*body, symbols, next_binding, next_node),
        CheckedStep::Repeat(expression) => Instruction::Repeat(expression::lower(
            expression,
            &|(n, f): (String, Option<Field>)| (id(&n), f),
        )),
        CheckedStep::Break => Instruction::Break,
        CheckedStep::Use {
            binding,
            dependency,
            inputs,
            outputs,
            ..
        } => Instruction::Use {
            binding: id(&binding),
            dependency,
            outputs,
            inputs: inputs
                .into_iter()
                .map(|(name, expr)| {
                    (
                        name,
                        expression::lower(expr, &|(n, f): (String, Option<Field>)| (id(&n), f)),
                    )
                })
                .collect(),
        },
        CheckedStep::Collect(collection) => {
            let CheckedCollection {
                element_type,
                binding,
                mode,
                steps,
                locals,
                fields,
            } = *collection;
            let mut scope = symbols.clone();
            let mut local_ids = vec![];
            for (name, mut symbol) in locals {
                symbol.id = BindingId(*next_binding);
                *next_binding += 1;
                local_ids.push(symbol.id);
                scope.insert(name, symbol);
            }
            let mode = match mode {
                CheckedCollectionMode::Open { min, max } => CollectionMode::Open { min, max },
                CheckedCollectionMode::Mapped { source, alias } => CollectionMode::Mapped {
                    source: expression::lower(source, &|(n, f): (String, Option<Field>)| {
                        (id(&n), f)
                    }),
                    alias: scope[&alias].id,
                },
            };
            let nodes = steps
                .into_iter()
                .map(|(step, span)| {
                    let node = NodeId(*next_node);
                    *next_node += 1;
                    Node {
                        id: node,
                        span,
                        instruction: lower_step(step, &scope, next_binding, next_node),
                    }
                })
                .collect();
            Instruction::Collect(Box::new(Collection {
                binding: id(&binding),
                mode,
                nodes,
                locals: local_ids,
                fields: fields
                    .keys()
                    .map(|key| (key.clone(), scope[key].id))
                    .collect(),
                record_type: element_type,
            }))
        }
        CheckedStep::Ask { binding, prompt } => Instruction::Ask {
            binding: id(&binding),
            prompt: template(prompt),
        },
        CheckedStep::Rate {
            binding,
            rating,
            prompt,
        } => Instruction::Rate {
            binding: id(&binding),
            rating,
            prompt: template(prompt),
        },
        CheckedStep::Derive {
            binding,
            expression,
        } => Instruction::Derive {
            binding: id(&binding),
            expression: expression::lower(expression, &|(n, f): (String, Option<Field>)| {
                (id(&n), f)
            }),
        },
        CheckedStep::Branch { arms, otherwise } => Instruction::Branch {
            arms: arms
                .into_iter()
                .map(|(e, to)| {
                    (
                        expression::lower(e, &|(n, f): (String, Option<Field>)| (id(&n), f)),
                        to,
                    )
                })
                .collect(),
            otherwise,
        },
        CheckedStep::Match {
            subject,
            cases,
            otherwise,
            ..
        } => Instruction::Match {
            subject: expression::lower(subject, &|(n, f): (String, Option<Field>)| (id(&n), f)),
            cases,
            otherwise,
        },
        CheckedStep::Jump(to) => Instruction::Jump(to),
        CheckedStep::End => Instruction::End,
        CheckedStep::Generate {
            binding,
            contract,
            prompt,
        } => Instruction::Generate {
            binding: id(&binding),
            contract,
            prompt: template(prompt),
        },
        CheckedStep::Turn { binding, prompt } => Instruction::Turn {
            binding: binding.map(|n| id(&n)),
            prompt: template(prompt),
        },
        CheckedStep::Choose {
            binding,
            options,
            prompt,
        } => Instruction::Choose {
            binding: id(&binding),
            options: match options {
                CheckedOptions::Static(c) => Options::Static(c),
                CheckedOptions::Dynamic(source) => Options::Dynamic(expression::lower(
                    source,
                    &|(n, f): (String, Option<Field>)| (id(&n), f),
                )),
            },
            prompt: template(prompt),
        },
        CheckedStep::Show { body } => Instruction::Show {
            body: template(body),
        },
        CheckedStep::Select {
            binding,
            options,
            selection,
            prompt,
        } => Instruction::Select {
            binding: id(&binding),
            selection,
            options: match options {
                CheckedOptions::Static(c) => Options::Static(c),
                CheckedOptions::Dynamic(source) => Options::Dynamic(expression::lower(
                    source,
                    &|(n, f): (String, Option<Field>)| (id(&n), f),
                )),
            },
            prompt: template(prompt),
        },
    }
}

/// Require exact explicit child inputs and expose only declared outputs under the alias.
/// Rejects unknown dependencies, extra/missing inputs, type mismatches, and body content.
fn check_use(
    b: Block,
    symbols: &mut Scope,
    dependencies: &BTreeMap<String, Dependency>,
) -> Check<CheckedStep> {
    let binding = required_binding(&b)?;
    let (name, span) = b
        .argument
        .as_ref()
        .ok_or_else(|| err("Child pattern name is required", b.span.clone()))?;
    let dependency = dependencies.get(name).ok_or_else(|| err(format!("Unresolved local Pattern '{name}'; compile an executable snapshot with its dependency sources"), span.clone()))?;
    if b.body.iter().any(|line| !line.text.trim().is_empty()) || !b.statements.is_empty() {
        return Err(err(
            "!use accepts only explicit :with inputs, not Markdown or body statements",
            b.span,
        ));
    }
    let mut inputs = BTreeMap::new();
    for attr in &b.attributes {
        if attr.name != "with" {
            return Err(err("Only :with is supported on !use", attr.span.clone()));
        }
        let (key, expression, offset) = if let Some((key, tail)) = attr.raw.split_once('=') {
            let offset = attr.raw_offset + key.len() + 1 + tail.len() - tail.trim_start().len();
            (key.trim(), tail.trim(), offset)
        } else {
            (attr.raw.trim(), attr.raw.trim(), attr.raw_offset)
        };
        let key = self::name(&Word {
            text: key.into(),
            quoted: false,
            span: attr.span.clone(),
        })?;
        let expected = dependency
            .inputs
            .get(&key)
            .ok_or_else(|| err(format!("Unknown child input '{key}'"), attr.span.clone()))?;
        let (expr, ty) = check_expression(expression, offset, symbols)?;
        if &ty != expected {
            return Err(err(
                format!("Type mismatch for child input '{key}'"),
                attr.span.clone(),
            ));
        }
        if inputs.insert(key, expr).is_some() {
            return Err(err("Duplicate child input", attr.span.clone()));
        }
    }
    if inputs.len() != dependency.inputs.len() {
        return Err(err("Supply every declared child input explicitly", b.span));
    }
    declare(
        symbols,
        binding.clone(),
        Type::Record(dependency.outputs.clone()),
        b.binding.unwrap().span,
    )?;
    Ok(CheckedStep::Use {
        name: name.clone(),
        binding,
        dependency: dependency.id.clone(),
        inputs: inputs.into_iter().collect(),
        outputs: dependency.outputs.clone(),
    })
}
