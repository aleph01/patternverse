//! Blank workbook projection of validated Pattern Language. Never starts a run.
use super::*;
use super::{worksheet_flow::WorkbookFlow, worksheet_words::WorkbookContext};
use crate::snapshot::ExecutableSnapshot;

#[derive(Clone, Debug, Serialize)]
pub struct Worksheet {
    pub title: String,
    pub markdown: String,
    pub fidelity: &'static str,
    pub notices: Vec<String>,
}

impl ExecutableSnapshot {
    /// One admission/projection boundary for availability and export. AI in any
    /// pinned child, flow or branch makes the entire workbook unavailable.
    ///
    /// # Errors
    /// Rejects invalid definitions, AI-dependent interactions, ambiguous manual
    /// projections, unsupported expressions, or bounded export limits. No run starts.
    pub fn worksheet(&self) -> Result<Worksheet, Vec<Diagnostic>> {
        for pattern in self.patterns() {
            let definition = checked(pattern)?;
            if definition.message_handler.is_some() {
                return unavailable("conversational message handlers");
            }
            reject_ai(&definition.steps)?;
        }
        let mut writer = Writer {
            snapshot: self,
            notices: vec![],
            partial: false,
            sections: 0,
            visited: 0,
        };
        let title = self.root().title().unwrap_or("Pattern workbook").to_owned();
        let body = writer.pattern(self.root(), &mut WorkbookContext::default(), 0)?;
        let fidelity = if writer.partial {
            "partial"
        } else if writer.notices.is_empty() {
            "complete"
        } else {
            "adapted"
        };
        let mut markdown = format!("# {}\n\n", inline(&title));
        if !writer.notices.is_empty() {
            markdown.push_str("> Workbook with manual instructions:\n");
            for notice in &writer.notices {
                markdown.push_str(&format!("> - {notice}\n"));
            }
            markdown.push('\n');
        }
        markdown.push_str(&body);
        markdown.push_str(
            "\n---\n\nBlank workbook exported from Patternverse. No saved answers are included.\n",
        );
        if markdown.len() > 1024 * 1024 {
            return unavailable("output exceeding 1 MiB");
        }
        Ok(Worksheet {
            title,
            markdown,
            fidelity,
            notices: writer.notices,
        })
    }
}

/// Return a safe definition-level diagnostic without exposing any execution state.
fn unavailable<T>(reason: &str) -> Result<T, Vec<Diagnostic>> {
    Err(vec![err(format!("Workbook unavailable: {reason}."), 0..0)])
}
/// Recover checked authored steps using the existing parser and pinned dependencies.
fn checked(pattern: &CompiledPattern) -> Result<ValidatedPattern, Vec<Diagnostic>> {
    syntax::parse(&pattern.source)
        .and_then(|p| check(p, pattern.dependencies.clone()).map_err(|e| vec![e]))
}
/// Identify realized wording in a checked template without executing its effects.
fn ai_parts(parts: &[CheckedPart]) -> bool {
    parts
        .iter()
        .any(|part| matches!(part, CheckedPart::Realize { .. }))
}
/// Inspect every nested authored step, including optional and unreachable AI paths.
fn reject_ai(steps: &[(CheckedStep, Span)]) -> Result<(), Vec<Diagnostic>> {
    for (step, _) in steps {
        let ai = match step {
            CheckedStep::Generate { .. }
            | CheckedStep::Realize { .. }
            | CheckedStep::Suggest { .. }
            | CheckedStep::Classify { .. }
            | CheckedStep::Turn { .. } => true,
            CheckedStep::Form { form, .. } => form.blocks.iter().any(|block| match block {
                FormBlock::Show { content } => ai_parts(content),
                FormBlock::Ask { prompt, .. } | FormBlock::Timer { prompt, .. } => ai_parts(prompt),
            }),
            CheckedStep::Ask { prompt, .. }
            | CheckedStep::Rate { prompt, .. }
            | CheckedStep::Timer { prompt, .. }
            | CheckedStep::Choose { prompt, .. }
            | CheckedStep::Select { prompt, .. } => ai_parts(prompt),
            CheckedStep::Image { body, .. }
            | CheckedStep::Video { body, .. }
            | CheckedStep::Show { body } => ai_parts(body),
            CheckedStep::Collect(body) => {
                reject_ai(&body.steps)?;
                false
            }
            CheckedStep::Loop(body) => {
                reject_ai(&body.steps)?;
                false
            }
            CheckedStep::Refine(body) => {
                reject_ai(&body.steps)?;
                false
            }
            _ => false,
        };
        if ai {
            return unavailable("AI-dependent steps");
        }
    }
    Ok(())
}

struct Writer<'a> {
    snapshot: &'a ExecutableSnapshot,
    notices: Vec<String>,
    partial: bool,
    sections: usize,
    visited: usize,
}
/// Escape user-authored values for a single Markdown inline context.
fn inline(text: &str) -> String {
    text.replace('\\', "\\\\")
        .replace(['\r', '\n'], " ")
        .replace('[', "\\[")
        .replace(']', "\\]")
        .replace('*', "\\*")
        .replace('_', "\\_")
        .replace('`', "\\`")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}
/// Turn an internal binding name into a readable, escaped label.
fn label(name: &str) -> String {
    inline(&name.replace(['_', '-', '.'], " "))
}

impl Writer<'_> {
    /// Deduplicate manual instructions and retain the strongest fidelity warning.
    fn notice(&mut self, text: &str, partial: bool) {
        self.partial |= partial;
        if !self.notices.iter().any(|n| n == text) {
            self.notices.push(text.into());
        }
    }
    /// Display an already-evaluated constant without interpreting it as Markdown.
    fn value(&self, value: &Value) -> String {
        inline(&value.display())
    }
    /// Evaluate only fully known constants through the existing expression evaluator.
    fn evaluate(expr: &CheckedExpr, context: &WorkbookContext) -> Option<Value> {
        expression::eval(expr, &|(name, field)| {
            let value = context.values.get(name).ok_or("Unanswered binding")?;
            field
                .as_ref()
                .map_or_else(
                    || Ok(value.clone()),
                    |field| value.field_path(&field.0).ok_or("Unanswered field"),
                )
                .map_err(str::to_owned)
        })
        .ok()
    }
    /// Require a readable manual expression; never fall back to raw source syntax.
    fn words(
        &self,
        expr: &CheckedExpr,
        context: &WorkbookContext,
    ) -> Result<String, Vec<Diagnostic>> {
        context.words(expr).map(|s| inline(&s)).ok_or_else(|| {
            vec![err(
                "Workbook unavailable: expression needs an author-reviewed manual description.",
                expr.span.clone(),
            )]
        })
    }
    /// Preserve authored Markdown while replacing unanswered references with labels.
    fn text(&self, parts: &[CheckedPart], context: &WorkbookContext) -> String {
        parts
            .iter()
            .map(|part| match part {
                CheckedPart::Literal(text) => text.clone(),
                CheckedPart::Reference(name, field) => {
                    let value = context.values.get(name).and_then(|v| {
                        field
                            .as_ref()
                            .map_or_else(|| Some(v.clone()), |f| v.field_path(&f.0))
                    });
                    value.map(|v| self.value(&v)).unwrap_or_else(|| {
                        format!(
                            "[Your earlier answer: {}]",
                            inline(&context.name(name, field))
                        )
                    })
                }
                CheckedPart::Realize { .. } => unreachable!("AI admission runs before projection"),
            })
            .collect()
    }
    /// Project one pinned pattern's inputs, interactions and declared results.
    fn pattern(
        &mut self,
        pattern: &CompiledPattern,
        context: &mut WorkbookContext,
        depth: usize,
    ) -> Result<String, Vec<Diagnostic>> {
        if depth > 16 {
            return unavailable("dependency depth exceeding 16");
        }
        let definition = checked(pattern)?;
        let mut out = String::new();
        for input in pattern.input_types().keys() {
            if !context.values.contains_key(input) && !context.names.contains_key(input) {
                out.push_str(&format!(
                    "**Starting value: {}**\n\n[Write here.]\n\n",
                    label(input)
                ));
            }
        }
        out.push_str(&self.steps(&definition.steps, context, depth)?);
        if !definition.outputs.is_empty() {
            out.push_str("### Your results\n\nKeep the results from the section you completed; do not fill in other alternatives.\n\n");
            for name in &definition.outputs {
                let answer = context
                    .values
                    .get(name)
                    .map(|v| self.value(v))
                    .unwrap_or_else(|| format!("[Use your {} from above.]", label(name)));
                out.push_str(&format!("- **{}:** {answer}\n", label(name)));
            }
            out.push('\n');
        }
        Ok(out)
    }
    /// Describe an external countdown while preserving authored bounds and blocking.
    fn timer(&mut self, timer: &Timer) -> String {
        self.notice(
            "Use your own timer; this workbook does not run a countdown.",
            false,
        );
        format!(
            "Use a timer for **{} seconds**. {}{}\n\n",
            timer.duration_seconds,
            if timer.blocking {
                "Wait until it finishes before continuing."
            } else {
                "Start it before continuing; you may continue while it runs."
            },
            if timer.adjustable {
                format!(
                    " You may adjust it from {} to {} seconds before starting.",
                    timer.min_seconds, timer.max_seconds
                )
            } else {
                String::new()
            }
        )
    }
    /// Register readable option identities, rejecting duplicate visible labels.
    fn options(
        &mut self,
        options: &CheckedOptions,
        binding: &str,
        context: &mut WorkbookContext,
    ) -> Result<String, Vec<Diagnostic>> {
        let choices = match options {
            CheckedOptions::Static(choices) => choices.clone(),
            CheckedOptions::Dynamic(expr) => match Self::evaluate(expr, context) {
                Some(Value::Choices(choices)) => choices,
                Some(Value::List { items, .. }) => items
                    .iter()
                    .enumerate()
                    .map(|(i, item)| Choice {
                        value: i.to_string(),
                        label: item.display(),
                    })
                    .collect(),
                _ => {
                    self.notice("Some choices come from your earlier entries. Use that list in its original order.", false);
                    return Ok(format!(
                        "Use the items in {}.\n\n- [ ] [An item from your list.]\n",
                        self.words(expr, context)?
                    ));
                }
            },
        };
        let mut labels = BTreeSet::new();
        if choices
            .iter()
            .any(|c| !labels.insert(c.label.trim().to_lowercase()))
        {
            return unavailable("ambiguous choice labels");
        }
        context.choices.insert(binding.into(), choices.clone());
        let mut out = String::new();
        for choice in &choices {
            out.push_str(&format!("- [ ] {}\n", inline(&choice.label)));
        }
        Ok(out)
    }
    /// Group checked forward control flow before projecting its full manual range.
    fn steps(
        &mut self,
        steps: &[(CheckedStep, Span)],
        context: &mut WorkbookContext,
        depth: usize,
    ) -> Result<String, Vec<Diagnostic>> {
        let flow = WorkbookFlow::new(steps)?;
        self.range(steps, &flow, context, depth, 0..steps.len(), 0)
    }
    /// Render independent alternatives up to their common continuation exactly once.
    fn range(
        &mut self,
        steps: &[(CheckedStep, Span)],
        flow: &WorkbookFlow,
        context: &mut WorkbookContext,
        depth: usize,
        region: std::ops::Range<usize>,
        nesting: usize,
    ) -> Result<String, Vec<Diagnostic>> {
        if nesting > 8 {
            return unavailable("conditional nesting exceeding eight levels");
        }
        let mut out = String::new();
        let end = region.end;
        let mut index = region.start;
        while index < end {
            self.visited += 1;
            if self.visited > 2048 || out.len() > 1024 * 1024 {
                return unavailable("export size limit");
            }
            let (step, _) = &steps[index];
            let paths = match step {
                CheckedStep::Branch { arms, otherwise } => {
                    let mut paths = vec![];
                    for (i, (expr, target)) in arms.iter().enumerate() {
                        paths.push((
                            format!(
                                "{} {}",
                                if i == 0 { "If" } else { "Otherwise, if" },
                                self.words(expr, context)?
                            ),
                            target.0,
                        ));
                    }
                    paths.push(("Otherwise".into(), otherwise.0));
                    Some(paths)
                }
                CheckedStep::Match {
                    subject,
                    cases,
                    otherwise,
                    has_fallback,
                } => {
                    let name = self.words(subject, context)?;
                    let mut paths = vec![];
                    for (case, target) in cases {
                        let value = match case {
                            Case::Choice(id) => {
                                let Kind::Reference((binding, field)) = &subject.kind else {
                                    return unavailable(
                                        "a choice comparison without readable labels",
                                    );
                                };
                                let key = field.as_ref().map_or_else(
                                    || binding.clone(),
                                    |f| format!("{binding}.{}", f.0.join(".")),
                                );
                                context.choices.get(&key).and_then(|choices| choices.iter().find(|c| &c.value == id)).map(|c| c.label.clone()).ok_or_else(|| vec![err("Workbook unavailable: choice labels depend on earlier answers.", subject.span.clone())])?
                            }
                            Case::Enum(s) => s.clone(),
                            Case::Text(s) => context
                                .choice_label(subject, &Value::Text(s.clone()))
                                .unwrap_or_else(|| s.clone()),
                            Case::Number(n) => n.to_string(),
                            Case::Boolean(b) => b.to_string(),
                        };
                        paths.push((format!("If {name} is “{}”", inline(&value)), target.0));
                    }
                    if *has_fallback {
                        paths.push(("Otherwise".into(), otherwise.0));
                    }
                    Some(paths)
                }
                _ => None,
            };
            if let Some(paths) = paths {
                self.notice("At each choice of sections, complete only the first matching alternative. Skip the others; continue below unless your section says to finish.", false);
                let join = flow.continuation(index);
                if join > end
                    || !flow.independent(
                        &paths.iter().map(|(_, target)| *target).collect::<Vec<_>>(),
                        join,
                    )
                {
                    return unavailable("crossing conditional sections");
                }
                let mut branches = vec![];
                let mut bodies = vec![];
                for (condition, target) in &paths {
                    let mut branch = context.clone();
                    let body =
                        self.range(steps, flow, &mut branch, depth, *target..join, nesting + 1)?;
                    bodies.push((condition, body));
                    branches.push(branch);
                }
                let keys: BTreeSet<_> = branches
                    .iter()
                    .flat_map(|b| {
                        b.values
                            .iter()
                            .filter(|(key, value)| context.values.get(*key) != Some(*value))
                            .map(|(k, _)| k.clone())
                    })
                    .collect();
                if !keys.is_empty()
                    && paths
                        .iter()
                        .zip(&branches)
                        .all(|((_, target), branch)| constant_path(steps, *target, join, branch))
                    && branches
                        .iter()
                        .all(|b| keys.iter().all(|key| b.values.contains_key(key)))
                {
                    out.push_str("**Use the first matching row:**\n\n| When | ");
                    out.push_str(
                        &keys
                            .iter()
                            .map(|key| label(key).replace('|', "\\|"))
                            .collect::<Vec<_>>()
                            .join(" | "),
                    );
                    out.push_str(" |\n| --- | ");
                    out.push_str(&vec!["---"; keys.len()].join(" | "));
                    out.push_str(" |\n");
                    for ((condition, _), branch) in paths.iter().zip(&branches) {
                        out.push_str(&format!(
                            "| {} | {} |\n",
                            condition.replace('|', "\\|"),
                            keys.iter()
                                .map(|key| self.value(&branch.values[key]).replace('|', "\\|"))
                                .collect::<Vec<_>>()
                                .join(" | ")
                        ));
                    }
                    out.push('\n');
                    if join == steps.len() {
                        out.push_str(if depth == 0 {
                            "**Finish this workbook here.**\n\n"
                        } else {
                            "**This section is complete. Continue below.**\n\n"
                        });
                    }
                } else {
                    out.push_str("**Complete the matching section below:**\n\n");
                    for (condition, body) in bodies {
                        out.push_str(&format!(
                            "#### {condition}\n\n{}\n",
                            if body.is_empty() {
                                "No additional questions. Continue below."
                            } else {
                                &body
                            }
                        ));
                    }
                }
                context.merge(&branches);
                if join < end {
                    out.push_str("**Continue here after your selected section, unless it told you to finish:**\n\n");
                }
                index = join;
                continue;
            }
            match step {
                CheckedStep::Form { binding, form } => {
                    self.sections += 1;
                    out.push_str(&format!("## {}. {}\n\n", self.sections, inline(form.title.as_deref().unwrap_or("Questions"))));
                    for block in &form.blocks { match block {
                        FormBlock::Show { content } => out.push_str(&format!("{}\n\n", self.text(content, context))),
                        FormBlock::Ask { id, prompt, required, placeholder, .. } => {
                            context.names.insert(format!("{binding}.{id}"), format!("“{} — {}”", form.title.as_deref().unwrap_or("Questions"), id.replace(['_', '-'], " ")));
                            out.push_str(&format!("{}\n\n**Your answer — {}:**\n\n[Write here.]\n\n", self.text(prompt, context), if *required { "required" } else { "optional" }));
                            if let Some(hint) = placeholder { out.push_str(&format!("Hint: {}\n\n", inline(hint))); }
                        }
                        FormBlock::Timer { prompt, timer, .. } => { out.push_str(&format!("{}\n\n", self.text(prompt, context))); out.push_str(&self.timer(timer)); }
                    }}
                }
                CheckedStep::Ask { prompt, .. } => out.push_str(&format!("{}\n\n**Your answer:**\n\n[Write here.]\n\n", self.text(prompt, context))),
                CheckedStep::Image { image, body } => {
                    if let Some(title) = &image.title { out.push_str(&format!("### {}\n\n", inline(title))); }
                    out.push_str(&format!("![{}](<{}>)\n\n{}\n\n", inline(&image.alt), image.url, self.text(body, context)));
                }
                CheckedStep::Video { video, body } => {
                    self.notice("Videos open externally; observe the indicated excerpt times yourself.", false);
                    out.push_str(&format!("**Video:** {}\n\n<{}>\n\nStart: {} seconds. {}\n\n{}\n\n", inline(video.title.as_deref().unwrap_or("Watch video")), video.url, video.start_seconds, video.end_seconds.map_or("Play to the end.".into(), |end| format!("Stop at {end} seconds.")), self.text(body, context)));
                }
                CheckedStep::Show { body } => out.push_str(&format!("{}\n\n", self.text(body, context))),
                CheckedStep::Rate { rating, prompt, .. } => {
                    out.push_str(&format!("{}\n\n**Rating:** [Enter a number from {} to {}.]\n\n", self.text(prompt, context), rating.min, rating.max));
                    if let Some(low) = &rating.low { out.push_str(&format!("{}: {}\n\n", rating.min, inline(low))); }
                    if let Some(high) = &rating.high { out.push_str(&format!("{}: {}\n\n", rating.max, inline(high))); }
                }
                CheckedStep::Timer { prompt, timer, .. } => { out.push_str(&format!("{}\n\n", self.text(prompt, context))); out.push_str(&self.timer(timer)); }
                CheckedStep::Choose { binding, prompt, options } => { out.push_str(&format!("{}\n\nChoose exactly one.\n\n{}\n", self.text(prompt, context), self.options(options, binding, context)?)); }
                CheckedStep::Select { binding, prompt, options, selection, .. } => {
                    let instruction = match selection.mode {
                        SelectionMode::Single => "Choose exactly one.".into(),
                        SelectionMode::Multi => format!("Choose at least {} and {}.{}", selection.min, selection.max.map_or("at most all available options".into(), |n| format!("at most {n} options")), if selection.min == 0 { " Choosing none is allowed." } else { "" }),
                        SelectionMode::Rank => "Rank every offered item exactly once, without ties. Write them in your preferred order.".into(),
                    };
                    out.push_str(&format!("{}\n\n{}\n\n{}\n", self.text(prompt, context), instruction, self.options(options, binding, context)?));
                    if selection.mode == SelectionMode::Rank { out.push_str("**Your order:**\n\n1. [First item.]\n2. [Next item — extend as needed.]\n\n"); }
                }
                CheckedStep::Derive { binding, expression } => {
                    if let Some(value) = Self::evaluate(expression, context) { out.push_str(&format!("**{}:** {}\n\n", label(binding), self.value(&value))); context.values.insert(binding.clone(), value); }
                    else {
                        self.notice("Complete answer-dependent calculations yourself; values are not calculated automatically.", true);
                        out.push_str(&format!("**{}:** {}.\n\nResult: [Write here.]\n\n", label(binding), self.words(expression, context)?));
                    }
                }
                CheckedStep::Jump(target) => { if target.0 > end { return unavailable("a jump outside its conditional section"); } index = target.0; continue; }
                CheckedStep::End => { out.push_str(if depth == 0 { "**Finish this workbook here. Do not continue into another alternative.**\n\n" } else { "**This section is complete. Continue below.**\n\n" }); break; }
                CheckedStep::Collect(body) => {
                    self.notice("Duplicate repeatable entries only as needed, keeping their stated limits and order.", false);
                    out.push_str(&format!("### Repeatable entry: {}\n\n", label(&body.binding)));
                    let mut local = context.clone();
                    match &body.mode {
                        CheckedCollectionMode::Open { min, max } => {
                            out.push_str(&format!("Complete between {min} and {max} whole entries. After {min}, you may finish. Keep each entry's answers together.\n\n"));
                            if *max == 0 { index += 1; continue; }
                        }
                        CheckedCollectionMode::Mapped { source, alias } => {
                            out.push_str(&format!("Complete once for each item in {}, in its original order. An empty list needs no entries.\n\n", self.words(source, context)?));
                            local.names.insert(alias.clone(), format!("the current item in {}", self.words(source, context)?));
                        }
                    }
                    out.push_str(&self.steps(&body.steps, &mut local, depth)?); out.push_str("**End of this entry.**\n\n");
                }
                CheckedStep::Loop(body) => {
                    self.notice("Repeatable rounds carry your latest answer forward. You may stop at any point.", false);
                    out.push_str(&format!("### Repeatable round: {}\n\nStart with {}. {} You may stop at any point and continue below.\n\n", label(&body.binding), self.words(&body.initial, context)?, body.max.map_or("There is no authored maximum.".into(), |n| format!("Complete at most {n} rounds."))));
                    if body.max != Some(0) {
                        let mut local = context.clone(); local.names.insert(body.binding.clone(), "your latest answer (use the starting answer in the first round)".into());
                        out.push_str(&self.steps(&body.steps, &mut local, depth)?);
                    }
                    out.push_str("**End of this round. Continue below when you stop.**\n\n");
                }
                CheckedStep::Repeat(expr) => out.push_str(&format!("For another round, use {} as your next starting answer. Otherwise, stop and continue below.\n\n", self.words(expr, context)?)),
                CheckedStep::Break => out.push_str("Stop repeating and continue below this block.\n\n"),
                CheckedStep::Yield(expr) => out.push_str(&format!("Record the entry's result using {}.\n\n", self.words(expr, context)?)),
                CheckedStep::Use { name, binding, dependency, inputs, .. } => {
                    let child = self.snapshot.get(dependency).ok_or_else(|| vec![err("Workbook unavailable: missing pinned dependency.", 0..0)])?;
                    let title = child.title().unwrap_or(name);
                    out.push_str(&format!("### {}\n\n", inline(title)));
                    let mut provided = WorkbookContext::default();
                    for (input, expr) in inputs {
                        if let Some(value) = Self::evaluate(expr, context) { provided.values.insert(input.clone(), value); }
                        else { let wording = self.words(expr, context)?; provided.names.insert(input.clone(), wording.clone()); out.push_str(&format!("Use {wording} for {}.\n\n", label(input))); }
                    }
                    out.push_str(&self.pattern(child, &mut provided, depth + 1)?);
                    for output in child.output_types.keys() {
                        let key = format!("{binding}.{output}");
                        context.names.insert(key.clone(), format!("“{title} — {}”", output.replace(['_', '-'], " ")));
                        if let Some(choices) = provided.choices.get(output) { context.choices.insert(key, choices.clone()); }
                    }
                }
                CheckedStep::ShowCollection { spec, source } => {
                    self.notice("Structured displays become written data/layout instructions, not interactive charts.", false);
                    out.push_str(&format!("### Review {}\n\n", label(&spec.source)));
                    if let Some(value) = Self::evaluate(source, context) { out.push_str(&crate::show::resolve(spec, &value, source.span.clone()).text().lines().map(inline).collect::<Vec<_>>().join("\n\n")); out.push_str("\n\n"); }
                    else {
                        out.push_str("Use the fields and relationships from your earlier entries.\n\n");
                        if !spec.map.is_empty() { out.push_str(&format!("Dimensions: {}.\n\n", spec.map.iter().map(|p| label(p)).collect::<Vec<_>>().join(", "))); }
                        for (kind, field) in [("Group by", &spec.group), ("Relationships", &spec.link), ("Separate contexts by", &spec.split)] { if let Some(field) = field { out.push_str(&format!("{kind}: {}.\n\n", label(field))); } }
                        if let Some(order) = &spec.order { out.push_str(&format!("Order by {}, {}.\n\n", label(&order.attribute), if order.descending { "descending" } else { "ascending" })); }
                    }
                }
                CheckedStep::Refine(body) => {
                    self.notice("Review the initial wording before revising. Keeping it or renewing a revision batch is always your explicit choice.", false);
                    out.push_str(&format!("### Review wording: {}\n\nInitial wording: {}.\n\nChoose: keep this version, revise it, or finish without accepting. Up to {} revisions{}; direct edits do not count as rounds.\n\n**Only if you choose to revise:**\n\n", label(&body.binding), self.words(&body.initial, context)?, body.config.rounds, if body.config.renewable { " per batch; another batch requires explicit agreement" } else { "; do not extend this limit" }));
                    let mut local = context.clone(); local.names.insert(body.alias.clone(), "your current wording".into());
                    out.push_str(&self.steps(&body.steps, &mut local, depth)?);
                    out.push_str("**Final wording:** [Write here.]\n\n**Decision:** [Kept this version / finished without accepting / reached the revision limit.]\n\n");
                }
                CheckedStep::Propose(expr) => out.push_str(&format!("Review {} as the proposed wording before deciding whether to keep it.\n\n", self.words(expr, context)?)),
                CheckedStep::Branch { .. } | CheckedStep::Match { .. } => unreachable!(),
                CheckedStep::Generate { .. } | CheckedStep::Realize { .. } | CheckedStep::Suggest { .. } | CheckedStep::Classify { .. } | CheckedStep::Turn { .. } => unreachable!("AI admission runs before projection"),
            }
            index += 1;
        }
        Ok(out)
    }
}

/// Recognize assignment-only alternatives suitable for a compact decision table.
fn constant_path(
    steps: &[(CheckedStep, Span)],
    mut index: usize,
    end: usize,
    context: &WorkbookContext,
) -> bool {
    while index < end {
        match &steps[index].0 {
            CheckedStep::Derive { binding, .. } if context.values.contains_key(binding) => {
                index += 1
            }
            CheckedStep::Jump(target) if target.0 <= end => index = target.0,
            CheckedStep::End => return end == steps.len(),
            _ => return false,
        }
    }
    true
}
