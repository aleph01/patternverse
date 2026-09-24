use ariadne::{Config, IndexType, Label, Report, ReportKind, Source};
use pattern_core::{
    compiler,
    host::{self, Fixture},
    runtime::{self, Event, Fulfillment, Receipt, Request},
    snapshot::{ExecutableSnapshot, SourceBundle},
    syntax::{Diagnostic, Severity},
    value::Value,
};
use std::{
    collections::BTreeMap,
    env, fs,
    io::{self, Write},
    process::ExitCode,
};

/// Render byte-indexed source diagnostics to standard error, propagating output failures.
fn diagnostics(path: &str, source: &str, errors: Vec<Diagnostic>) -> Result<(), String> {
    for e in errors {
        let kind = match e.severity {
            Severity::Error => ReportKind::Error,
            Severity::Warning => ReportKind::Warning,
        };
        let mut report = Report::build(kind, path, e.primary.start)
            .with_config(Config::default().with_index_type(IndexType::Byte))
            .with_code(e.code)
            .with_message(&e.message)
            .with_label(Label::new((path, e.primary)).with_message(e.message));
        for (span, message) in e.secondary {
            report = report.with_label(Label::new((path, span)).with_message(message));
        }
        if let Some(help) = e.help {
            report = report.with_help(help);
        }
        report
            .finish()
            .eprint((path, Source::from(source)))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
/// Read a UTF-8 source or fixture file, attaching its path to any I/O error.
fn read(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| format!("{path}: {e}"))
}
/// Dispatch CLI validation or fixture execution; interactive mode reads manual replies.
/// Performs local file and terminal I/O only, returning usage, parse, runtime, or I/O errors.
fn run() -> Result<(), String> {
    let args: Vec<String> = env::args().skip(1).collect();
    if args == ["--help"] {
        println!("pattern check SOURCE\npattern simulate SOURCE FIXTURE.json\npattern run SOURCE INPUTS.json\npattern check-bundle BUNDLE.json\npattern simulate-bundle BUNDLE.json FIXTURE.json\npattern scenario-bundle BUNDLE.json SCENARIO.json\n\nrun uses manual fixture responses; it never calls an AI service.");
        return Ok(());
    }
    let command = args.first().map(String::as_str).unwrap_or("");
    if matches!(
        (command, args.len()),
        ("check-bundle", 2) | ("simulate-bundle", 3) | ("scenario-bundle", 3)
    ) {
        let bundle: SourceBundle = serde_json::from_str(&read(&args[1])?)
            .map_err(|e| format!("Invalid source bundle: {e}"))?;
        let snapshot = ExecutableSnapshot::build(bundle.clone()).map_err(|e| {
            let source = bundle.patterns.get(&e.pattern).map_or("", String::as_str);
            let message = e.to_string();
            diagnostics(&e.pattern, source, e.diagnostics)
                .err()
                .unwrap_or(message)
        })?;
        for pattern in snapshot.patterns() {
            diagnostics(
                pattern.snapshot_id(),
                pattern.source(),
                pattern.diagnostics().to_vec(),
            )?;
        }
        if command == "check-bundle" {
            println!(
                "Valid executable: {} ({} sources)",
                snapshot.id(),
                snapshot.sources().len()
            );
        } else if command == "scenario-bundle" {
            let scenario = serde_json::from_str(&read(&args[2])?)
                .map_err(|e| format!("Invalid scenario: {e}"))?;
            let report = pattern_core::scenario::run(snapshot, "cli-scenario".into(), scenario)?;
            println!(
                "{}",
                serde_json::to_string_pretty(&report).map_err(|e| e.to_string())?
            );
        } else {
            let fixture: Fixture = serde_json::from_str(&read(&args[2])?)
                .map_err(|e| format!("Invalid fixture: {e}"))?;
            let result = host::simulate_snapshot(snapshot, "cli-simulation".into(), fixture)?;
            println!(
                "{}",
                serde_json::to_string_pretty(&result).map_err(|e| e.to_string())?
            );
        }
        return Ok(());
    }
    if !matches!(
        (command, args.len()),
        ("check", 2) | ("simulate", 3) | ("run", 3)
    ) {
        return Err("Usage: pattern check SOURCE | pattern simulate SOURCE FIXTURE.json | pattern run SOURCE INPUTS.json | pattern check-bundle BUNDLE.json | pattern simulate-bundle BUNDLE.json FIXTURE.json | pattern scenario-bundle BUNDLE.json SCENARIO.json".into());
    }
    let source = read(&args[1])?;
    let pattern = compiler::compile(&source).map_err(|errors| {
        diagnostics(&args[1], &source, errors)
            .err()
            .unwrap_or_else(|| "Pattern did not pass validation".into())
    })?;
    diagnostics(&args[1], &source, pattern.diagnostics().to_vec())?;
    if command == "check" {
        println!(
            "Valid: {} ({} nodes)\n{}",
            pattern.title().unwrap_or("Untitled Pattern"),
            pattern.node_count(),
            pattern.snapshot_id()
        );
        return Ok(());
    }
    if command == "simulate" {
        let fixture: Fixture =
            serde_json::from_str(&read(&args[2])?).map_err(|e| format!("Invalid fixture: {e}"))?;
        let simulation = host::simulate(pattern, "cli-simulation".into(), fixture)?;
        println!(
            "{}",
            serde_json::to_string_pretty(&simulation).map_err(|e| e.to_string())?
        );
        return Ok(());
    }
    let inputs: BTreeMap<String, Value> =
        serde_json::from_str(&read(&args[2])?).map_err(|e| format!("Invalid inputs: {e}"))?;
    let mut turn =
        runtime::start(pattern, "cli-interactive".into(), inputs).map_err(|e| e.to_string())?;
    loop {
        for effect in &turn.effects {
            if let Request::Show { markdown } = &effect.request {
                println!("{markdown}");
            }
        }
        let Some(pending) = turn.state.pending() else {
            break;
        };
        match &pending.request {
            Request::Refine { review } => println!("{}\nReview choices: {:?}. Enter a decision name, or edit:your wording", review.candidate, review.choices),
            Request::Classify{definition,input,context}=>println!("CLASSIFY {}\nInput: {input:?}\nContext: {context:?}\nEnter a declared variant: {:?}",definition.name,definition.output.variants),
            Request::Suggest{mode,specification,candidates,..}=>println!("AI SUGGESTION {mode:?}\n{specification}\nCandidates: {candidates:?}\nEnter {{\"outcome\":\"decided\",\"ids\":[\"item-0\"]}} or explicit uncertainty:"),
            Request::Ask{prompt}=>println!("{prompt}\nEnter your response:"),
            Request::Realize { specification, inputs } => println!("REALIZE\nSpecification: {specification}\nInputs: {inputs:?}\nEnter fixture wording:"),
            Request::Rate{prompt,rating}=>println!("{prompt}\nEnter a number from {} through {}:",rating.min,rating.max),
            Request::Generate{prompt,contract}=>println!("AI fixture request: {prompt}\nContract: {contract:?}\nEnter a tagged Value JSON object:"),
            Request::Turn{prompt}=>println!("AI turn fixture request: {prompt}\nEnter response text:"),
            Request::Choose{prompt,options,..}=>{
                println!("{prompt}");for choice in options {println!("  {} — {}",choice.value,choice.label);}println!("Enter a choice value:");
            },
            Request::Select { prompt, options, mode, min, max, .. } => {
                println!("{prompt}\n{mode:?}: confirm {min}–{max} values (comma-separated; rank in your chosen order):");
                for choice in options { println!("  {} — {}", choice.value, choice.label); }
            },
            Request::Show{..}=>return Err("Unexpected blocking content effect".into()),
        }
        io::stdout().flush().map_err(|e| e.to_string())?;
        let mut input = String::new();
        if io::stdin()
            .read_line(&mut input)
            .map_err(|e| e.to_string())?
            == 0
        {
            return Err("Input ended while a response was still needed".into());
        }
        let input = input.trim_end_matches(['\r', '\n']);
        let fulfillment = match &pending.request {
            Request::Refine { .. } => {
                if let Some(text) = input.strip_prefix("edit:") {
                    Fulfillment::Edited(text.into())
                } else {
                    let decision = match input {
                        "Accept" => pattern_core::refine::Decision::Accept,
                        "Revise" => pattern_core::refine::Decision::Revise,
                        "Continue" => pattern_core::refine::Decision::Continue,
                        "Finish" => pattern_core::refine::Decision::Finish,
                        _ => {
                            eprintln!("Unknown review choice");
                            turn.effects.clear();
                            continue;
                        }
                    };
                    Fulfillment::Reviewed(decision)
                }
            }
            Request::Classify { .. } => Fulfillment::Classified(input.into()),
            Request::Suggest { .. } => match serde_json::from_str(input) {
                Ok(value) => Fulfillment::Suggested(value),
                Err(_) => {
                    eprintln!("Enter suggestion JSON with outcome and ids.");
                    continue;
                }
            },
            Request::Ask { .. } => Fulfillment::Text(input.into()),
            Request::Realize { .. } => Fulfillment::Realized(input.into()),
            Request::Rate { .. } => match input.parse::<f64>() {
                Ok(n) => Fulfillment::Rating(n),
                Err(e) => {
                    eprintln!("Invalid rating: {e}");
                    turn.effects.clear();
                    continue;
                }
            },
            Request::Generate { .. } => match serde_json::from_str(input) {
                Ok(value) => Fulfillment::Generated(value),
                Err(e) => {
                    eprintln!("Invalid fixture JSON: {e}");
                    turn.effects.clear();
                    continue;
                }
            },
            Request::Turn { .. } => Fulfillment::Turn(input.into()),
            Request::Choose { .. } => Fulfillment::Selected(input.into()),
            Request::Select { mode, .. } => {
                use pattern_core::compiler::SelectionMode;
                let keys = if input.trim().is_empty() {
                    vec![]
                } else {
                    input.split(',').map(|key| key.trim().to_owned()).collect()
                };
                match mode {
                    SelectionMode::Single => Fulfillment::Selected(input.into()),
                    SelectionMode::Multi => Fulfillment::SelectedMany(keys),
                    SelectionMode::Rank => Fulfillment::Ranked(keys),
                }
            }
            Request::Show { .. } => unreachable!(),
        };
        match runtime::transition(
            &turn.state,
            Event::Fulfill(Receipt {
                effect_id: pending.effect_id.clone(),
                result: fulfillment,
            }),
        ) {
            Ok(next) => turn = next,
            Err(e) => {
                eprintln!("Response rejected; progress unchanged: {e}");
                turn.effects.clear();
            }
        }
    }
    println!(
        "Completed:\n{}",
        serde_json::to_string_pretty(turn.state.outputs()).map_err(|e| e.to_string())?
    );
    Ok(())
}
/// Report CLI failures on standard error and return the corresponding process exit status.
fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("{e}");
            ExitCode::FAILURE
        }
    }
}
