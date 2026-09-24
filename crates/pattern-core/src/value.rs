use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Choice {
    pub value: String,
    pub label: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct EnumType {
    pub name: String,
    pub variants: Vec<String>,
}
impl EnumType {
    /// Require a named, nonempty closed set with unique authored variants.
    pub fn is_valid(&self) -> bool {
        crate::syntax::is_identifier(&self.name)
            && !self.variants.is_empty()
            && self.variants.len() <= 64
            && self
                .variants
                .iter()
                .all(|v| crate::syntax::is_identifier(v))
            && self.variants.iter().collect::<BTreeSet<_>>().len() == self.variants.len()
    }
    /// Construct a candidate enum value; normal contract validation checks membership.
    pub fn value(&self, variant: impl Into<String>) -> Value {
        Value::Enum {
            schema: self.clone(),
            variant: variant.into(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Type {
    Enum(EnumType),
    Text,
    Number,
    Boolean,
    Choice,
    Choices,
    List(Box<Type>),
    Record(BTreeMap<String, Type>),
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", content = "value", rename_all = "snake_case")]
pub enum Value {
    Enum {
        schema: EnumType,
        variant: String,
    },
    Text(String),
    Number(f64),
    Boolean(bool),
    Choice(Choice),
    Choices(Vec<Choice>),
    List {
        element_type: Type,
        items: Vec<Value>,
    },
    Record(BTreeMap<String, Value>),
}

/// Require nonempty, uniquely identified choices with nonblank values and labels.
pub(crate) fn valid_choices(choices: &[Choice]) -> bool {
    let mut values = BTreeSet::new();
    !choices.is_empty()
        && choices.iter().all(|c| {
            !c.value.trim().is_empty() && !c.label.trim().is_empty() && values.insert(&c.value)
        })
}

impl Value {
    /// Return the structural type, retaining declared list element types for empty lists.
    pub fn value_type(&self) -> Type {
        match self {
            Self::Enum { schema, .. } => Type::Enum(schema.clone()),
            Self::Text(_) => Type::Text,
            Self::Number(_) => Type::Number,
            Self::Boolean(_) => Type::Boolean,
            Self::Choice(_) => Type::Choice,
            Self::Choices(_) => Type::Choices,
            Self::List { element_type, .. } => Type::List(Box::new(element_type.clone())),
            Self::Record(fields) => Type::Record(
                fields
                    .iter()
                    .map(|(k, v)| (k.clone(), v.value_type()))
                    .collect(),
            ),
        }
    }
    /// Check finite numbers, choice identities, and recursively well-typed collection values.
    pub fn is_valid(&self) -> bool {
        match self {
            Self::Enum { schema, variant } => {
                schema.is_valid() && schema.variants.contains(variant)
            }
            Self::Number(n) => n.is_finite(),
            Self::Choice(c) => valid_choices(std::slice::from_ref(c)),
            Self::Choices(c) => valid_choices(c),
            Self::List {
                element_type,
                items,
            } => items
                .iter()
                .all(|v| v.is_valid() && v.value_type() == *element_type),
            Self::Record(fields) => fields.values().all(Value::is_valid),
            _ => true,
        }
    }
    /// Render interpolation text; choices use their labels, not their stable identities.
    pub(crate) fn display(&self) -> String {
        match self {
            Self::Enum { variant, .. } => variant.clone(),
            Self::Text(v) => v.clone(),
            Self::Number(v) => v.to_string(),
            Self::Boolean(v) => v.to_string(),
            Self::Choice(v) => v.label.clone(),
            Self::Choices(v) => v
                .iter()
                .map(|c| c.label.as_str())
                .collect::<Vec<_>>()
                .join(", "),
            Self::List { items, .. } => items
                .iter()
                .map(Value::display)
                .collect::<Vec<_>>()
                .join(", "),
            Self::Record(fields) => fields
                .iter()
                .map(|(k, v)| format!("{k}: {}", v.display()))
                .collect::<Vec<_>>()
                .join(", "),
        }
    }
    /// Clone the selected record or choice field; return `None` for an invalid path.
    /// An empty path selects the entire value.
    pub(crate) fn field_path(&self, path: &[String]) -> Option<Value> {
        let mut value = self.clone();
        for field in path {
            value = match value {
                Self::Record(mut fields) => fields.remove(field)?,
                Self::Choice(c) if field == "value" => Self::Text(c.value),
                Self::Choice(c) if field == "label" => Self::Text(c.label),
                _ => return None,
            };
        }
        Some(value)
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Contract {
    pub returns: Type,
    pub min: Option<usize>,
    pub max: Option<usize>,
}
impl Contract {
    /// Check both the structural type and any choice-count bounds, without coercion.
    pub fn accepts(&self, value: &Value) -> bool {
        value.is_valid()
            && value.value_type() == self.returns
            && match value {
                Value::Choices(c) => {
                    self.min.is_none_or(|n| c.len() >= n) && self.max.is_none_or(|n| c.len() <= n)
                }
                _ => self.min.is_none() && self.max.is_none(),
            }
    }
}
