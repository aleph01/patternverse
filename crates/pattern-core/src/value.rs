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
    Catalog(crate::data::CatalogType),
    Reference(crate::data::ReferenceType),
    Text,
    Number,
    Boolean,
    Choice,
    Choices,
    List(Box<Type>),
    Optional(Box<Type>),
    Record(BTreeMap<String, Type>),
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", content = "value", rename_all = "snake_case")]
pub enum Value {
    Catalog {
        schema: crate::data::CatalogType,
        records: Vec<Value>,
    },
    Reference {
        schema: crate::data::ReferenceType,
        id: String,
    },
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
    Optional {
        element_type: Type,
        value: Option<Box<Value>>,
    },
}

impl Type {
    /// Validate optional element schemas before accepting absent external values.
    pub(crate) fn well_formed(&self, depth: usize) -> bool {
        if depth > 16 {
            return false;
        }
        match self {
            Self::Optional(inner) => {
                !matches!(inner.as_ref(), Self::Optional(_)) && inner.well_formed(depth + 1)
            }
            Self::List(inner) => inner.well_formed(depth + 1),
            Self::Record(fields) => {
                fields.len() <= 256 && fields.values().all(|ty| ty.well_formed(depth + 1))
            }
            Self::Enum(schema) => schema.is_valid(),
            Self::Catalog(schema) => {
                schema.reference.valid() && schema.record_type.well_formed(depth + 1)
            }
            Self::Reference(schema) => schema.valid(),
            _ => true,
        }
    }

    /// Optional injection preserves the contained type; no scalar coercions are allowed.
    pub(crate) fn accepts_type(&self, actual: &Self) -> bool {
        self == actual
            || match (self, actual) {
                (Self::Optional(inner), actual) => inner.accepts_type(actual),
                (Self::List(a), Self::List(b)) => a.accepts_type(b),
                (Self::Record(a), Self::Record(b)) => {
                    a.len() == b.len()
                        && a.iter()
                            .all(|(key, ty)| b.get(key).is_some_and(|other| ty.accepts_type(other)))
                }
                _ => false,
            }
    }

    /// Identify nullable values requiring explicit presence checks before interpolation.
    pub(crate) fn contains_optional(&self) -> bool {
        match self {
            Self::Optional(_) => true,
            Self::List(inner) => inner.contains_optional(),
            Self::Record(fields) => fields.values().any(Self::contains_optional),
            _ => false,
        }
    }
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
            Self::Catalog { schema, .. } => Type::Catalog(schema.clone()),
            Self::Reference { schema, .. } => Type::Reference(schema.clone()),
            Self::Text(_) => Type::Text,
            Self::Number(_) => Type::Number,
            Self::Boolean(_) => Type::Boolean,
            Self::Choice(_) => Type::Choice,
            Self::Choices(_) => Type::Choices,
            Self::List { element_type, .. } => Type::List(Box::new(element_type.clone())),
            Self::Optional { element_type, .. } => Type::Optional(Box::new(element_type.clone())),
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
            Self::Reference { schema, id } => schema.valid() && schema.ids.contains(id),
            Self::Catalog { schema, records } => {
                schema.reference.valid()
                    && records.len() == schema.reference.ids.len()
                    && records.iter().zip(&schema.reference.ids).all(|(v, id)| {
                        v.is_valid()
                            && v.value_type() == *schema.record_type
                            && v.field_path(&["id".into()]) == Some(Value::Text(id.clone()))
                    })
            }
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
            Self::Optional {
                element_type,
                value,
            } => {
                !matches!(element_type, Type::Optional(_))
                    && element_type.well_formed(0)
                    && value
                        .as_ref()
                        .is_none_or(|value| value.is_valid() && value.value_type() == *element_type)
            }
            _ => true,
        }
    }
    /// Render interpolation text; choices use their labels, not their stable identities.
    pub(crate) fn display(&self) -> String {
        match self {
            Self::Enum { variant, .. } => variant.clone(),
            Self::Catalog { records, .. } => records
                .iter()
                .map(Value::display)
                .collect::<Vec<_>>()
                .join("\n"),
            Self::Reference { id, .. } => id.clone(),
            Self::Text(v) => v.clone(),
            Self::Number(v) => v.to_string(),
            Self::Boolean(v) => v.to_string(),
            Self::Optional { value, .. } => {
                value.as_ref().map_or_else(String::new, |v| v.display())
            }
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
                Self::Optional {
                    value: Some(value), ..
                } if field == "$present" => *value,
                Self::Record(mut fields) => fields.remove(field)?,
                Self::Choice(c) if field == "value" => Self::Text(c.value),
                Self::Choice(c) if field == "label" => Self::Text(c.label),
                _ => return None,
            };
        }
        Some(value)
    }

    /// Materialize checked optional injections, including contextual lists and records.
    pub(crate) fn into_expected(self, expected: &Type) -> Option<Self> {
        if !self.is_valid() {
            return None;
        }
        if self.value_type() == *expected {
            return Some(self);
        }
        match (expected, self) {
            (Type::Optional(inner), value) => Some(Self::Optional {
                element_type: *inner.clone(),
                value: Some(Box::new(value.into_expected(inner)?)),
            }),
            (Type::List(inner), Self::List { items, .. }) => Some(Self::List {
                element_type: *inner.clone(),
                items: items
                    .into_iter()
                    .map(|v| v.into_expected(inner))
                    .collect::<Option<_>>()?,
            }),
            (Type::Record(types), Self::Record(mut fields)) if fields.len() == types.len() => {
                Some(Self::Record(
                    types
                        .iter()
                        .map(|(key, ty)| {
                            Some((key.clone(), fields.remove(key)?.into_expected(ty)?))
                        })
                        .collect::<Option<_>>()?,
                ))
            }
            _ => None,
        }
    }
}

impl std::fmt::Display for Type {
    /// Render the canonical type spelling used by authoring diagnostics.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Text => f.write_str("text"),
            Self::Number => f.write_str("number"),
            Self::Boolean => f.write_str("boolean"),
            Self::Choice => f.write_str("choice"),
            Self::Choices => f.write_str("choices"),
            Self::Enum(schema) => f.write_str(&schema.name),
            Self::Catalog(schema) => write!(f, "catalog[{}]", schema.reference.library),
            Self::Reference(schema) => write!(f, "ref[{}]", schema.library),
            Self::List(inner) => write!(f, "list[{inner}]"),
            Self::Optional(inner) => write!(f, "Optional[{inner}]"),
            Self::Record(fields) => {
                f.write_str("{")?;
                for (index, (name, ty)) in fields.iter().enumerate() {
                    if index > 0 {
                        f.write_str(", ")?;
                    }
                    write!(f, "{name}: {ty}")?;
                }
                f.write_str("}")
            }
        }
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
                Value::List { items, .. } => {
                    self.min.is_none_or(|n| items.len() >= n)
                        && self.max.is_none_or(|n| items.len() <= n)
                }
                Value::Choices(c) => {
                    self.min.is_none_or(|n| c.len() >= n) && self.max.is_none_or(|n| c.len() <= n)
                }
                _ => self.min.is_none() && self.max.is_none(),
            }
    }
}
