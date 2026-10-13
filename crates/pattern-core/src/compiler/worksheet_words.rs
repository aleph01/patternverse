//! Readable labels for a deliberately small subset of checked expressions.
//! This is formatting, never expression evaluation or condition selection.
use super::*;

#[derive(Clone, Default)]
pub(super) struct WorkbookContext {
    pub values: BTreeMap<String, Value>,
    pub names: BTreeMap<String, String>,
    pub choices: BTreeMap<String, Vec<Choice>>,
}

impl WorkbookContext {
    /// Resolve a readable reference, hiding choice value implementation fields.
    pub fn name(&self, name: &str, field: &Option<Field>) -> String {
        let mut parts = field.as_ref().map(|f| f.0.clone()).unwrap_or_default();
        if parts.last().is_some_and(|p| p == "value") {
            let prefix = parts[..parts.len() - 1].join(".");
            let key = if prefix.is_empty() {
                name.to_owned()
            } else {
                format!("{name}.{prefix}")
            };
            if self.choices.contains_key(&key) {
                parts.pop();
            }
        }
        let path = parts.join(".");
        let full = if path.is_empty() {
            name.to_owned()
        } else {
            format!("{name}.{path}")
        };
        self.names.get(&full).cloned().unwrap_or_else(|| {
            let plain = full.replace(['_', '-', '.'], " ");
            format!("“{plain}”")
        })
    }

    /// Translate a static choice identity into its visible label when known.
    pub(super) fn choice_label(&self, reference: &CheckedExpr, value: &Value) -> Option<String> {
        let Kind::Reference((name, field)) = &reference.kind else {
            return None;
        };
        let mut path = field.as_ref().map(|f| f.0.clone()).unwrap_or_default();
        if path.last().is_some_and(|p| p == "value") {
            path.pop();
        }
        let key = if path.is_empty() {
            name.clone()
        } else {
            format!("{name}.{}", path.join("."))
        };
        let Value::Text(id) = value else {
            return None;
        };
        self.choices
            .get(&key)?
            .iter()
            .find(|choice| &choice.value == id)
            .map(|c| c.label.clone())
    }

    /// Format a small checked expression subset without choosing or evaluating it.
    pub fn words(&self, expression: &CheckedExpr) -> Option<String> {
        use expression::Binary;
        Some(match &expression.kind {
            Kind::Literal(value) => match value {
                Value::Text(text) => format!("“{text}”"),
                _ => value.display(),
            },
            Kind::Reference((name, field)) => self.name(name, field),
            Kind::Unary(Unary::Not, inner) => format!("not ({})", self.words(inner)?),
            Kind::Unary(Unary::Negate, inner) => format!("negative ({})", self.words(inner)?),
            Kind::Unary(Unary::Count, inner) => {
                format!("the number of entries in {}", self.words(inner)?)
            }
            Kind::Binary(op, left, right) => {
                let a = if let Kind::Literal(value) = &left.kind {
                    self.choice_label(right, value)
                        .map(|label| format!("“{label}”"))
                        .unwrap_or(self.words(left)?)
                } else {
                    self.words(left)?
                };
                let b = if let Kind::Literal(value) = &right.kind {
                    self.choice_label(left, value)
                        .map(|label| format!("“{label}”"))
                        .unwrap_or(self.words(right)?)
                } else {
                    self.words(right)?
                };
                let word = match op {
                    Binary::Add => "plus",
                    Binary::Subtract => "minus",
                    Binary::Multiply => "multiplied by",
                    Binary::Less => "is below",
                    Binary::LessEqual => "is at most",
                    Binary::Greater => "is above",
                    Binary::GreaterEqual => "is at least",
                    Binary::Equal => "is",
                    Binary::NotEqual => "is not",
                    Binary::And => "AND",
                    Binary::Or => "OR",
                };
                if matches!(op, Binary::And | Binary::Or) {
                    format!("({a}) {word} ({b})")
                } else {
                    let grouped = |expr: &CheckedExpr, text: String| {
                        if matches!(expr.kind, Kind::Binary(..)) {
                            format!("({text})")
                        } else {
                            text
                        }
                    };
                    format!("{} {word} {}", grouped(left, a), grouped(right, b))
                }
            }
            _ => return None,
        })
    }

    /// Retain only constants and catalogues shared by every alternative at a join.
    pub fn merge(&mut self, branches: &[Self]) {
        if let Some(first) = branches.first() {
            self.values = first
                .values
                .iter()
                .filter(|(key, value)| branches.iter().all(|b| b.values.get(*key) == Some(*value)))
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect();
            // Do not guess at labels when alternatives assign different catalogues.
            self.names = first
                .names
                .iter()
                .filter(|(key, value)| branches.iter().all(|b| b.names.get(*key) == Some(*value)))
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect();
            self.choices = first
                .choices
                .iter()
                .filter(|(key, value)| branches.iter().all(|b| b.choices.get(*key) == Some(*value)))
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect();
        }
    }
}
