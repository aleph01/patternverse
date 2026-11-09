//! Run-scoped shuffle is an explicit binding step; seeded shuffle remains a pure expression.
use super::*;

/// Validate one immutable derivation, recognizing only a whole-binding unseeded shuffle.
pub(super) fn derivation(
    binding: Word,
    source: &str,
    offset: usize,
    symbols: &mut Scope,
) -> Check<CheckedStep> {
    let key = binding_name(&binding)?;
    let expected = binding_expectation(&key, &binding.span, symbols)?;
    let parsed = expression::parse_with_enums(source, offset, symbols.language, &symbols.enums)?;
    let (parsed, run_scoped) = match parsed {
        Expr {
            kind: Kind::Call(name, mut args),
            ..
        } if name == "shuffle" && args.len() == 1 && !symbols.functions.contains_key(&name) => {
            (args.remove(0), true)
        }
        expression => (expression, false),
    };
    let parsed = semantic::literals(parsed, symbols)?;
    let input_expected = match (run_scoped, expected.as_ref()) {
        (true, Some(Type::Optional(inner))) => Some(inner.as_ref()),
        _ => expected.as_ref(),
    };
    let (expression, ty) = expression::check_with_expected(
        parsed,
        &symbols.functions,
        &|path, span| resolved(path, span, symbols),
        input_expected,
    )?;
    if run_scoped && !matches!(ty, Type::List(_) | Type::Choices) {
        return Err(err(
            "shuffle expects a list or choices catalogue",
            expression.span.clone(),
        ));
    }
    declare(symbols, key.clone(), ty, binding.span)?;
    Ok(if run_scoped {
        CheckedStep::Shuffle {
            binding: key,
            expression,
        }
    } else {
        CheckedStep::Derive {
            binding: key,
            expression,
        }
    })
}
